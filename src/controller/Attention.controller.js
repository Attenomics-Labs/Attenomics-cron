// src/controller/Points.controller.js
import fetch from "node-fetch";
import { getWriteSession } from "../DB/neo4j.DB.js";
import { normalizeTweet } from "../models/Tweet.models.js";
import { today } from "../component/datetime.component.js";
import { client } from "../DB/Postgress.DB.js";



/**
 * Take a raw Neo4j Tweet node’s `.properties` and
 * massage it into the exact shape your FastAPI endpoint wants.
 */

// const modelendpoint = "http://localhost:8000";
const modelendpoint = "https://1de3-103-120-255-1.ngrok-free.app";

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
      `SELECT username FROM users;`
    );
    if (usersRes.rows.length == 0) {
      console.log("User Not Found");
      return;
    }
    const usernames = usersRes.rows.map(r => r['username']);
    console.log(`👥 Found ${usernames.length} users`);
    // 2) for each user
    for (const username of usernames) {
      console.log(`  ▶️  Processing @${username}`);
      return;
      const isexist = await client.query(
        `SELECT * FROM attentions WHERE username=${username}::TEXT AND date=${date}`
      );

      await session.run(
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

      // call your FastAPI batch endpoint
      const apiRes = await fetch(`${modelendpoint}/compute_scores_batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweets })
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

      const { scores } = await apiRes.json();

      // sum attention_score
      const rawPoints = scores.reduce(
        (sum, s) => sum + (s.attention_score ?? 0),
        0
      );
      console.log(`    🧮 rawPoints=${rawPoints.toFixed(2)}`);

      // Fixed Cypher query - create the Attentions node and connect it to User in one query
      const props = {
        username: username,
        date: date,
        Attention: rawPoints
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
