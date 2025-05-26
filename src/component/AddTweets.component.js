import { neo4jDriver } from "../DB/neo4j.DB.js";
import {
  getTweetById,
  getTweetsByIds,
  scrapeTweets,
} from "../component/scrape.component.js";
import { FOUR_DAYS_MS, getDayIndex } from "../component/datetime.component.js";
import { scrapeTweetById } from "../component/scrape.component.js";
import { client } from "../DB/Postgress.DB.js";
import {
  insertTweetQuery,
  Tweetvalues,
  updateTweetQuery,
  updateTweetvalues,
} from "../models/Tweet.models.js";
import { insertPostQuery, postvalues } from "../models/posts.model.js";
import { insertreplyQuery, replyvalues } from "../models/Reply.model.js";

/**
 * Scrape & store all tweets for a single user
 */
export const addtweets = async (username) => {
  try {
    // NEW: past 4 day scraper
    const tweets = await scrapeTweets(username);
    console.log(`🔍 @${username}: ${tweets.length} fetched`);

    const recent = tweets.filter((t) => {
      const ms = t.timestamp * 1000;
      if (!t.timestamp || ms < FOUR_DAYS_MS) {
        console.log(`  skipping old ${t.tweetID}`);
        return false;
      }
      return true;
    });

    // which ones already in PG?
    let seen = {};
    await Promise.all(
      recent.map((t) =>
        client
          .query(`SELECT * from tweets WHERE tweet_id = ${t.tweetID}::TEXT`)
          .then((r) => {
            if (r.rows.length > 0) {
              seen[t.tweetID] = r.rows[0];
            }
          })
      )
    );
    let tweetarr = [];
    let reply = [];
    let updates = [];
    let parentDetail = [];
    for (const t of recent) {
      if (seen[t.tweetID] == undefined) {
        console.log(`  storing ${t.tweetID}`);

        // sanitize props
        const clean = {};
        for (const [k, v] of Object.entries(t)) {
          if (
            ["string", "number", "boolean"].includes(typeof v) ||
            (Array.isArray(v) &&
              v.every((x) => ["string", "number"].includes(typeof x)))
          )
            clean[k] = v;
        }
        // init day buckets + totals
        ["likes", "views", "retweets", "bookmarkCount", "replies"].forEach(
          (f) => {
            for (let d = 0; d < 4; d++) {
              if (d == 0) {
                clean[`${f}_day${d}`] = t[f] ?? 0;
                continue;
              }
              clean[`${f}_day${d}`] = 0;
            }
            clean[`${f}_total`] = t[f] ?? 0;
          }
        );
        tweetarr.push(clean);
        if (t.isReply) {
          if (t.inReplyToStatusId !== t.conversationId) {
            parentDetail.push({
              conversationId: t.conversationId,
              tweetID: t.tweetID,
              username: t.username,
            });
          }
          reply.push({
            reply_id: t.tweetID,
            tweet_id: t.inReplyToStatusId,
          });
        }
      } else {
        console.log(`  updating ${t.tweetID}`);
        const tweet = seen[t.tweetID];
        const day = getDayIndex(t.timestamp);
        console.log(`updating values of ${t.tweetID}`);
        ["likes", "views", "retweets", "bookmarkCount", "replies"].forEach(
          (f) => {
            tweet[`${f}_total`] = t[f] ?? 0;
            tweet[`${f}_day${day}`] = Math.max(t[f] ?? 0, 0);
          }
        );
        updates.push(tweet);
      }
    }
    addparentnode(parentDetail);

    tweetarr.map(async (el) => {
      if (el.username == undefined) {
        el.username = username;
      }
      const values = Tweetvalues(el);
      const postvalue = postvalues({
        username: el.username,
        tweetID: el.tweetID,
      });
      await client.query(insertTweetQuery, values);
      await client.query(insertPostQuery, postvalue);
    });

    await client.query("COMMIT");

    console.log(`Created tweets with user relationships`);

    reply.map(async (el) => {
      const values = replyvalues(el);
      await client.query(insertreplyQuery, values);
    });

    await client.query("COMMIT");

    console.log(`Created  tweets with rely relationships`);

    updates.map(async el => {
        const values = updateTweetvalues(el);
        await client.query(updateTweetQuery, values);
    });

    await client.query("COMMIT");
    console.log(`Created tweets are updated`);
  } catch (err) {
    console.error("addtweets:", err);
    throw err;
  }
};

/**
 * Ensure parent tweet exists & link a reply edge
 */
// pass as a batch not individual
export const addparentnode = async (parentDetail) => {
  // const session = neo4jDriver.session();
  try {
    let tweetids = [];
    let repeat = {};
    for (const detail of parentDetail) {
      const exists = await client.query(
        `SELECT * FROM tweets WHERE tweet_id = ${detail.conversationId}::TEXT`
      );
      if (
        exists.rows.length == 0 &&
        repeat[detail.conversationId] == undefined
      ) {
        tweetids.push(detail.conversationId);
        repeat[detail.conversationId] = true;
      }
    }
    // NEW: use direct getTweetById for missing parent
    let tweet_to_ID = {};
    if (tweetids.length > 0) {
      const parenttweet = await getTweetsByIds(tweetids);
      for (const tweet of parenttweet) {
        tweet_to_ID[tweet["tweetID"]] = tweet;
      }
    }
    for (const parent of parentDetail) {
      if (tweet_to_ID[parent.conversationId] == undefined) {
        continue;
      }
      const tweet = tweet_to_ID[parent.conversationId];
      if (parent.username !== tweet.username) {
        const values = Tweetvalues(tweet);
        const postvalue = postvalues({
          username: tweet.username,
          tweetID: tweet.tweetID,
        });
        await client.query(insertTweetQuery, values);
        await client.query(insertPostQuery, postvalue);
        await client.query("COMMIT");
        const replyvalue = replyvalues({
          reply_id: parent.tweetID,
          tweet_id: parent.conversationId,
        });
        await client.query(insertreplyQuery, replyvalue);
      }
    }
  } catch (err) {
    console.error("addparentnode:", err);
  }
};
