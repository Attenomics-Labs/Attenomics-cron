// src/controller/Points.controller.js
import fetch from "node-fetch";
import { getWriteSession } from "../DB/neo4j.DB.js";
import { normalizeTweet } from "../models/Tweet.models.js";
import { today } from "../component/datetime.component.js";
import { client } from "../DB/Postgress.DB.js";
import { Attentionvalues, insertAttentionquery } from "../models/Attention.model.js";
import { insertValuequery, normsvalues } from "../models/Values.model.js";



/**
 * Take a raw Neo4j Tweet node’s `.properties` and
 * massage it into the exact shape your FastAPI endpoint wants.
 */

export async function computeAttentionPoints() {
  console.log("🔔 Starting computeAttentionPoints…");
  const session = getWriteSession();
  const date = new Date(today()).getTime();
  try {
    // 1) load all usernames
    // const usersRes = await session.run(
    //   `MATCH (u:User) RETURN u.username AS username`
    // );
    const usersRes = await client.query(
      `SELECT username, name, user_id FROM users WHERE is_blocked = false;`
    );
    if (usersRes.rows.length == 0) {
      console.log("User Not Found");
      return;
    }
    let usernames = [];
    let usernametoname = {};
    let usernametoid = {};
    usersRes.rows.map(r => {
      usernames.push(r['username']);
      usernametoname[r['username']] = r['name'];
      usernametoid[r['username']] = r['user_id'];
    });
    console.log(`👥 Found ${usernames.length} users`);
    // 2) for each user
    let cnt = 0;
    for (const username of usernames) {
      console.log(`  ▶️  Processing @${username}`);
      if (cnt <= 0) {
        cnt++;
        continue;
      }
      const isexist = await client.query(
        `SELECT * FROM attentions WHERE username='${username}' AND date=${date}`
      );
      if (isexist.rows.length != 0) {
        console.log(`skiping Attention alredy exist`);
        continue;
      }
      // load that user's tweets
      const tweetsRes = await client.query(
        `SELECT * FROM tweets 
        WHERE username = '${username}' 
        AND timestamp > NOW() - INTERVAL '4 days';`
      );

      let tweets = tweetsRes.rows;
      tweets.map(el => {
        const milliseconds = new Date(el['timestamp']).getTime();
        el['timestamp'] = milliseconds;
      });
      // Debug: log payload size
      console.log(`    • sending ${tweets.length} tweets to FastAPI`);
      // call your FastAPI batch endpoint
      // console.log(tweets[0].userId || usernametoid[username]);
      if (tweets.length == 0) {

      }
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
          bookmarkCount: tweet.bookmark_count_total || 0,
          bookmarkCount_day0: tweet.bookmark_count_day0 || 0,
          bookmarkCount_day1: tweet.bookmark_count_day1 || 0,
          bookmarkCount_day2: tweet.bookmark_count_day2 || 0,
          bookmarkCount_day3: tweet.bookmark_count_day3 || 0,
          bookmarkCount_total: tweet.bookmark_count_total || 0,
          views: tweet.views_total || 0,
          views_day0: tweet.views_day0 || 0,
          views_day1: tweet.views_day1 || 0,
          views_day2: tweet.views_day2 || 0,
          views_day3: tweet.views_day3 || 0,
          views_total: tweet.views_total || 0,
          replies: tweet.replies || 0,
          isQuoted: tweet.isQuoted || false,
          isReply: tweet.is_reply || false,
          isEdited: tweet.isEdited || false,
          tweetID: tweet.tweet_id,
          username: tweet.username,
          name: tweet.name || usernametoname[username],
          userId: tweet.userId || usernametoid[username],
          timestamp: tweet.timestamp,
          permanentUrl: tweet.permanentUrl || "",
          conversationId: tweet.conversation_id
        }))
      };
      // call your FastAPI batch endpoint
      const apiRes = await fetch(`${process.env.MODEL_END_POINT}/creator_tweet_score/`, {
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

      const values = Attentionvalues(props);
      await client.query(insertAttentionquery, values);
      await client.query("COMMIT");
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
    const res = await client.query(
      `SELECT username, attention_score FROM attentions WHERE date=${date}`
    );
    if (res.rows.length == 0) {
      return;
    }
    const recs = res.rows.map(r => ({
      username: r["username"],
      raw: Number(r["attention_score"] ?? 0)
    }));
    const totalRaw = recs.reduce((sum, x) => sum + x.raw, 0);
    console.log(`  📊 Total rawPoints = ${totalRaw.toFixed(2)}`);

    // 2) normalize & rank
    recs.sort((a, b) => b.raw - a.raw);

    for (let i = 0; i < recs.length; i++) {
      const { username, raw } = recs[i];

      const norm = totalRaw > 0 ? (raw / totalRaw) * 2400 : 0;
      const rank = i + 1;
      const isexist = await client.query(
        ` SELECT * FROM values WHERE date = ${date} AND username='${username}'`
      );
      if (isexist.rows.length != 0) {
        console.log(`updating values for ${username}`);
        await client.query(
          `UPDATE values set norm = ${norm}, rank = ${rank} WHERE date = ${date} AND username='${username}`
        );
        await client.query('COMMIT');
        continue;
      }
      const props = {
        username: username,
        date: date,
        norm: norm,
        rank: rank
      }
      console.log(props);
      const value = normsvalues(props);
      await client.query(insertValuequery, value);
      await client.query('COMMIT');
      console.log(`    ✨ @${username}: normalized = ${norm.toFixed(2)}, rank = ${rank}`);
    }
    console.log("🔔 normalizeAllUserPoints done");
  } catch (err) {
    console.error("❌ normalizeAllUserPoints error:", err);
  }
}
