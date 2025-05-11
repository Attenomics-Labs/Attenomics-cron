// src/controller/Points.controller.js
import fetch from "node-fetch";
import { getWriteSession } from "../DB/neo4j.DB.js";
import { normalizeTweet } from "../models/Tweet.models.js";
import { today } from "../component/datetime.component.js";



/**
 * Take a raw Neo4j Tweet node's `.properties` and
 * massage it into the exact shape your FastAPI endpoint wants.
 */

const modelendpoint = "http://localhost:8000";
// const modelendpoint = "https://1de3-103-120-255-1.ngrok-free.app";

export async function computeAttentionPoints() {
  console.log("🔔 Starting computeAttentionPoints…");
  const session = getWriteSession();
  const date = new Date(today()).getTime();
  try {
    // 1) load all usernames
    const usersRes = await session.run(
      `MATCH (u:User) RETURN u.username AS username`
    );
    if (usersRes.records.length == 0) {
      console.log("User Not Found");
      return;
    }
    const usernames = usersRes.records.map(r => r.get("username"));
    console.log(`👥 Found ${usernames.length} users`);

    // 2) for each user
    for (const username of usernames) {
      console.log(`  ▶️  Processing @${username}`);
      const isexist = await session.run(
        `
        MATCH (a:Attentions {username:$username, date: $date})
        RETURN a
        `,
        { username, date }
      );
      if (isexist.records.length != 0) {
        console.log(`skiping Attention alredy exist`);
        continue;
      }
      // load that user's tweets
      const tweetsRes = await session.run(
        `
        MATCH (u:User {username:$username})-[:Post]->(t:Tweet)
        RETURN t
        `,
        { username }
      );

      const tweets = tweetsRes.records.map(r =>
        normalizeTweet(r.get("t").properties)
      );

      // Debug: log payload size
      console.log(`    • sending ${tweets.length} tweets to FastAPI`);

      if (tweets.length === 0) {
        console.log(`    ⚠️ No tweets found for @${username}, skipping...`);
        continue;
      }

      // Prepare payload for new endpoint format
      const payload = {
        tweets: tweets.map(tweet => ({
          tweet: tweet.text,
          likes: tweet.likes_total || 0,
          likes_day0: tweet.likes_day0 || 0,
          likes_day1: tweet.likes_day1 || 0,
          likes_day2: tweet.likes_day2 || 0,
          likes_day3: tweet.likes_day3 || 0,
          likes_total: tweet.likes_total || 0,
          retweets: tweet.retweets_total || 0,
          retweets_day0: tweet.retweets_day0 || 0,
          retweets_day1: tweet.retweets_day1 || 0,
          retweets_day2: tweet.retweets_day2 || 0,
          retweets_day3: tweet.retweets_day3 || 0,
          retweets_total: tweet.retweets_total || 0,
          bookmarkCount: tweet.bookmarkCount_total || 0,
          bookmarkCount_day0: tweet.bookmarkCount_day0 || 0,
          bookmarkCount_day1: tweet.bookmarkCount_day1 || 0,
          bookmarkCount_day2: tweet.bookmarkCount_day2 || 0,
          bookmarkCount_day3: tweet.bookmarkCount_day3 || 0,
          bookmarkCount_total: tweet.bookmarkCount_total || 0,
          views: tweet.views_total || 0,
          views_day0: tweet.views_day0 || 0,
          views_day1: tweet.views_day1 || 0,
          views_day2: tweet.views_day2 || 0,
          views_day3: tweet.views_day3 || 0,
          views_total: tweet.views_total || 0,
          replies: tweet.replies || 0,
          isQuoted: tweet.isQuoted || false,
          isReply: tweet.isReply || false,
          isEdited: tweet.isEdited || false,
          tweetID: tweet.tweetID,
          username: tweet.username,
          name: tweet.name,
          userId: tweet.userId,
          timestamp: tweet.timestamp,
          permanentUrl: tweet.permanentUrl,
          conversationId: tweet.conversationId
        }))
      };

      // call your FastAPI batch endpoint
      const apiRes = await fetch(`${modelendpoint}/creator_tweet_score/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (apiRes.status === 422) {
        // validation error: log body
        const errBody = await apiRes.text();
        console.error(`    ❌ FastAPI validation error @${username}:`, errBody);
        continue;
      }

      if (!apiRes.ok) {
        console.error(`    ❌ FastAPI @${username} returned ${apiRes.status}`);
        continue;
      }

      const response = await apiRes.json();
      const attentionScore = response.score || 0;
      console.log(`    🧮 attentionScore=${attentionScore.toFixed(2)}`);

      // Create the Attentions node and connect it to User
      const props = {
        username: username,
        date: date,
        Attention: attentionScore
      };

      await session.run(
        `
        MATCH (u:User {username: $username})
        CREATE (a:Attentions $props)
        CREATE (u)-[:HAS_POINTS]->(a)
        RETURN a
        `,
        { props, username }
      );
    }

    console.log("🔔 computeAttentionPoints done");
  } catch (err) {
    console.error("❌ computeAttentionPoints error:", err);
  } finally {
    await session.close();
  }
}

export async function normalizeAllUserPoints() {
  console.log("🔔 Starting normalizeAllUserPoints…");
  const session = getWriteSession();
  const date = new Date(today()).getTime();
  try {
    // 1) load all Points for today
    const res = await session.run(
      `
      MATCH (p:Attentions {date:$date})
      RETURN p.username AS username, p.Attention AS raw
      `,
      { date }
    );

    if (res.records.length == 0) {
      return;
    }

    const recs = res.records.map(r => ({
      username: r.get("username"),
      raw: Number(r.get("raw")?.toNumber?.() ?? r.get("raw") ?? 0)
    }));

    const totalRaw = recs.reduce((sum, x) => sum + x.raw, 0);
    console.log(`  📊 Total rawPoints = ${totalRaw.toFixed(2)}`);

    // 2) normalize & rank
    recs.sort((a, b) => b.raw - a.raw);

    for (let i = 0; i < recs.length; i++) {
      const { username, raw } = recs[i];
      const isexist = await session.run(
        ` MATCH (v:Values {date:$date , username:$username})
          RETURN v
        `,
        { date, username }
      );
      if (isexist.records.length != 0) {
        console.log(`skiping user ${username}`);
        continue;
      }
      const norm = totalRaw > 0 ? (raw / totalRaw) * 2400 : 0;
      const rank = i + 1;

      const props = {
        username: username,
        date: date,
        norm: norm,
        rank: rank
      }
      await session.run(
        `
        CREATE (v:Values $props) 
        WITH v
        MATCH (a:Attentions {username:$username,date:$date})
        WITH a
        MATCH (u:User {username:$username}) SET u.ranks = $rank 
        CREATE (a)-[:HAS_Values]->(v)
        RETURN v
        `,
        { props, username, date, rank }
      );
      console.log(`    ✨ @${username}: normalized=${norm.toFixed(2)}, rank=${rank}`);
    }

    console.log("🔔 normalizeAllUserPoints done");
  } catch (err) {
    console.error("❌ normalizeAllUserPoints error:", err);
  } finally {
    await session.close();
  }
}
