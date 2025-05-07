
// simple in-memory lock to prevent concurrent runs
function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

let isRunning = false;

export const updateTweetMetricsDailyForAttentionCampaign = async () => {
    if (isRunning) {
        console.log("🔒 Job already running – skipping this invocation");
        return;
    }
    isRunning = true;

    console.log("🔔 updateTweetMetricsDaily started");
    const session = getWriteSession();

    try {
        // 1) Load all tweets + timestamps
        const allRes = await session.run(`
      MATCH (t:Tweet)
      RETURN t.tweetID AS id, t.timestamp AS ts
    `);

        const allTweets = allRes.records.map(r => {
            const raw = r.get("ts");
            const timestamp = (raw && typeof raw.toNumber === "function")
                ? raw.toNumber()
                : Number(raw);
            return { tweetID: r.get("id"), timestamp };
        });

        console.log(`📥 Loaded ${allTweets.length} tweets from Neo4j`);

        // 2) Load seenIds
        const stateRes = await session.run(
            `MATCH (s:ScrapeState {op:$op}) RETURN s.seenIds AS seenIds`,
            { op: "updateMetrics" }
        );
        const seenList = stateRes.records.length
            ? stateRes.records[0].get("seenIds") || []
            : [];
        const seen = new Set(seenList);
        console.log(`✅ Already seen: ${seen.size}/${allTweets.length}`);


        // 4) Filter unseen & ≤3 days old for update
        const toProcess = allTweets.filter(t => {
            if (seen.has(t.tweetID)) return false;
            const day = getDayIndex(t.timestamp);
            if (day === null) {
                seen.add(t.tweetID);
                return false;
            }
            t.dayIndex = day;
            return true;
        });
        console.log(`🔍 To process (≤3 days & unseen): ${toProcess.length}`);

        // 5) Fetch live data in parallel batches
        const updateRows = [];
        const fields = ["likes", "views", "retweets", "bookmarkCount"];
        const batches = chunkArray(toProcess, 20);
        console.log(`⏱ Fetching in ${batches.length} API batches (20/concurrent)`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`   ▶️  Batch ${i + 1}/${batches.length}: ${batch.length} tweets`);

            // use fetchWithTimeout to avoid hanging
            const results = await Promise.all(batch.map(async t => {
                try {
                    const data = await fetchWithTimeout(t.tweetID);
                    return { id: t.tweetID, day: t.dayIndex, data };
                } catch (err) {
                    return { id: t.tweetID, error: err.message };
                }
            }));

            for (const r of results) {
                seen.add(r.id);
                if (r.error) {
                    if (r.error.includes("not found")) {
                        deleteList.push(r.id);
                        console.log(`      🗑 Will delete missing ${r.id}`);
                    } else {
                        console.warn(`      ⚠️ Fetch error ${r.id}: ${r.error}`);
                    }
                } else {
                    const upd = {};
                    for (const f of fields) {
                        upd[`${f}_total`] = r.data[f] ?? 0;
                        upd[`${f}_day${r.day}`] = Math.max(r.data[f] ?? 0, 0);
                    }
                    updateRows.push({ id: r.id, updates: upd });
                }
            }
        }



        // 7) Bulk-update metrics
        if (updateRows.length) {
            console.log(`✅ Updating metrics for ${updateRows.length} tweets`);
            for (const chunk of chunkArray(updateRows, 100)) {
                await session.run(
                    `
          UNWIND $rows AS row
          MATCH (t:Tweet {tweetID:row.id})
          SET t += row.updates
          `,
                    { rows: chunk }
                );
            }
        }

        // 8) Persist or clear checkpoint
        if (seen.size >= allTweets.length) {
            console.log("🎉 All tweets processed; clearing state");
            await session.run(
                `MATCH (s:ScrapeState {op:$op}) DETACH DELETE s`,
                { op: "updateMetrics" }
            );
        } else {
            console.log(`🔄 Saving progress: ${seen.size}/${allTweets.length}`);
            await session.run(
                `
        MERGE (s:ScrapeState {op:$op})
        SET s.seenIds   = $seen,
            s.updatedAt = datetime()
        `,
                { op: "updateMetrics", seen: Array.from(seen) }
            );
        }

    } catch (err) {
        console.error("❌ updateMetrics aborted:", err.message);
    } finally {
        await session.close();
        console.log("🔔 updateTweetMetricsDaily finished");
        isRunning = false;
    }
};