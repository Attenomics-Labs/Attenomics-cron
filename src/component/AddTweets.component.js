import { neo4jDriver } from "../DB/neo4j.DB.js";
import { scrapeTweets } from "../component/scrape.component.js";
import { FOUR_DAYS_MS, getDayIndex } from "../component/datetime.component.js";
import { scrapeTweetById } from "../component/scrape.component.js";

/**
 * Scrape & store all tweets for a single user
 */
export const addtweets = async (username) => {
    const session = neo4jDriver.session();
    try {
        // NEW: past 4 day scraper
        const tweets = await scrapeTweets(username);
        console.log(`🔍 @${username}: ${tweets.length} fetched`);

        const recent = tweets.filter(t => {
            const ms = t.timestamp * 1000;
            if (!t.timestamp || ms < FOUR_DAYS_MS) {
                console.log(`  skipping old ${t.tweetID}`);
                return false;
            }
            return true;
        });

        // which ones already in Neo4j?
        let seen = {};
        await session.executeWrite(tx =>
            Promise.all(recent.map(t =>
                tx.run(
                    `MATCH (x:Tweet {tweetID:$tid}) 
            RETURN x`,
                    { tid: t.tweetID }
                ).then(r => {
                    if (r.records.length > 0) {
                        // r.records
                        seen[t.tweetID] = r.records[0].get('x').properties;
                    }
                })
            ))
        );
        let tweetarr = [];
        let reply = [];
        let updates = [];
        for (const t of recent) {
            if (seen[t.tweetID] == undefined) {
                console.log(`  storing ${t.tweetID}`);

                // sanitize props
                const clean = {};
                for (const [k, v] of Object.entries(t)) {
                    if (
                        ["string", "number", "boolean"].includes(typeof v) ||
                        (Array.isArray(v) && v.every(x => ["string", "number"].includes(typeof x)))
                    ) clean[k] = v;
                }
                // init day buckets + totals
                ["likes", "views", "retweets", "bookmarkCount", "replies"].forEach(f => {
                    for (let d = 0; d < 4; d++) {
                        if (d == 0) {
                            clean[`${f}_day${d}`] = t[f] ?? 0;
                            continue;
                        }
                        clean[`${f}_day${d}`] = 0;
                    }
                    clean[`${f}_total`] = t[f] ?? 0;
                });
                tweetarr.push(clean);
                if (t.isReply) {
                    if (t.inReplyToStatusId !== t.conversationId) {
                        addparentnode(t.conversationId, t.tweetID, t.username);
                    }
                    reply.push(
                        {
                            tid: t.tweetID, pid: t.inReplyToStatusId
                        }
                    )
                }
            }
            else {
                const tweet = seen[t.tweetID];
                const day = getDayIndex(t.timestamp);
                console.log(`updating values of ${t.tweetID}`);
                ["likes", "views", "retweets", "bookmarkCount", "replies"].forEach(f => {
                    tweet[`${f}_total`] = t[f] ?? 0;
                    tweet[`${f}_day${day}`] = Math.max(t[f] ?? 0, 0);
                });
                updates.push(tweet);
            }
        }
        const result = await session.run(
            `UNWIND $tweetarr AS tweetData
         MERGE (u:User {username: tweetData.username})
         CREATE (t:Tweet) SET t = tweetData
         CREATE (u)-[:Post]->(t)
         RETURN count(t)`,
            { tweetarr }
        );

        console.log(`Created ${result.records[0].get('count(t)')} tweets with user relationships`);

        const replyres = await session.run(
            `UNWIND $reply As reply 
        MATCH(a: Tweet { tweetID: reply.tid }), (b: Tweet { tweetID: reply.pid })
              CREATE (a) - [R: Reply] -> (b)
              RETURN count(R)            
              `,
            { reply }
        );

        console.log(`Created ${replyres.records[0].get('count(R)')} tweets with rely relationships`);

        const updateres = await session.run(
            `UNWIND $updates As update 
        MATCH(t: Tweet { tweetID: update.tweetID })
        SET t = update
              RETURN count(t)            
              `,
            { updates }
        );
        console.log(`Created ${updateres.records[0].get('count(t)')} tweet updates`);

    } catch (err) {
        console.error("addtweets:", err);
        throw err;
    } finally {
        await session.close();
    }
};


/**
 * Ensure parent tweet exists & link a reply edge
 */
export const addparentnode = async (conversationId, tweetID, username) => {
    const session = neo4jDriver.session();
    try {
        const exists = await session.run(
            `MATCH (t:Tweet {tweetID:$cid}) RETURN t`, { cid: conversationId }
        );
        if (!exists.records.length) {
            // NEW: use direct scrapeTweetById for missing parent
            const parent = await scrapeTweetById(conversationId);
            if (parent.username !== username) {
                await session.run(
                    `CREATE (t:Tweet $props)`,
                    { props: parent }
                );
            }
        }
        await session.run(
            `
        MATCH (a:Tweet {tweetID:$tid}), (b:Tweet {tweetID:$cid})
        CREATE (a)-[:Reply]->(b)
        `,
            { tid: tweetID, cid: conversationId }
        );
    } catch (err) {
        console.error("addparentnode:", err);
    } finally {
        await session.close();
    }
};