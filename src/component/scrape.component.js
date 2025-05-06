import "dotenv/config";
import fetch from "node-fetch";
import { TweetModel } from "../models/Tweet.models.js";
import { neo4jDriver } from "../DB/neo4j.DB.js";
import { UserModel } from "../models/User.Models.js";

const API_KEY = process.env.TWITTER_API_KEY;
const BASE_URL = "https://api.twitterapi.io/twitter";

/**
 * low-level GET helper
 */
async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-API-Key": API_KEY }
  });
  if (!res.ok) {
    throw new Error(`Twitter API ${res.status} fetching ${path}`);
  }
  return res.json();
}


/** Split an array into chunks of given size */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}





/**
 * Fetch user info from Twitter API
 */
export async function getUserInfo(userName) {
  const { data } = await request(
    `/user/info?userName=${encodeURIComponent(userName)}`
  );
  return data;
}

/**
 * Fetch latest tweets by username
 */
export async function getTweetsByUsername(userName) {
  const { tweets } = await request(
    `/tweets?username=${encodeURIComponent(userName)}`
  );
  return tweets.map(TweetModel);
}

/**
 * Fetch multiple tweets (up to 50 per request) by their IDs
 */
export async function getTweetsByIds(tweetIds) {
  const batches = chunkArray(tweetIds, 50);
  const results = [];
  for (const batch of batches) {
    const idsParam = batch.map(encodeURIComponent).join(",");
    const { tweets } = await request(
      `/tweets?tweet_ids=${idsParam}`
    );
    if (tweets?.length) {
      results.push(...tweets.map(TweetModel));
    }
  }
  return results;
}

/**
 * Fetch a single tweet by its ID (fallback parent-fetch)
 */
export async function getTweetById(tweetId) {
  const tweets = await getTweetsByIds([tweetId]);
  if (!tweets.length) throw new Error(`Tweet ${tweetId} not found`);
  return tweets[0];
}

//generating sinceDate
const getsinceDate = async () => {
  const noofdate = 2;
  const sinceDate = new Date(Date.now() - (24 * noofdate) * 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, "0");
  return [
    sinceDate.getUTCFullYear(),
    pad(sinceDate.getUTCMonth() + 1),
    pad(sinceDate.getUTCDate())
  ].join("-") + "_" +
    [pad(sinceDate.getUTCHours()), pad(sinceDate.getUTCMinutes()), pad(sinceDate.getUTCSeconds())]
      .join(":") + "_UTC";
}

/**
 * ————— NEW: Fetch all tweets & replies from the last 48 hours,
 * paging through every page via next_cursor —————
 */
export async function scrapeTweets(username) {
  const since = await getsinceDate();
  const allRaw = [];
  let cursor = "";  // start with empty string for first page
  console.log(`since ${since}`);
  do {
    // build path, including cursor if set
    const q = encodeURIComponent(`from:${username} since:${since}`);
    let path = `/tweet/advanced_search?queryType=Latest&query=${q}`;
    if (cursor) path += `&cursor=${encodeURIComponent(cursor)}`;

    // fetch page
    const { tweets: raw, has_next_page, next_cursor } = await request(path);
    console.log("📝 page cursor for", username, ":", next_cursor, "has_next_page:", has_next_page);

    allRaw.push(...raw);
    cursor = has_next_page ? next_cursor : null;
  } while (cursor);

  return allRaw.map(t => ({
    tweetID: t.id,
    username: t.author.userName,
    text: t.text,
    timestamp: Math.floor(new Date(t.createdAt).getTime() / 1000),
    conversationId: t.conversationId,
    inReplyToStatusId: t.inReplyToId,
    isReply: t.isReply,
    likes: t.likeCount,
    retweets: t.retweetCount,
    replies: t.replyCount,
    views: t.viewCount,
    bookmarkCount: t.bookmarkCount
  }));
}

/**
 * ————— NEW: fetch a single tweet by ID via direct endpoint —————
 */
export async function scrapeTweetById(tweetID) {
  const t = await request(`/tweet/${encodeURIComponent(tweetID)}`);
  return {
    tweetID: t.id,
    username: t.author.userName,
    text: t.text,
    timestamp: Math.floor(new Date(t.createdAt).getTime() / 1000),
    conversationId: t.conversationId,
    inReplyToStatusId: t.inReplyToId,
    isReply: t.isReply,
    likes: t.likeCount,
    retweets: t.retweetCount,
    replies: t.replyCount,
    views: t.viewCount,
    bookmarkCount: t.bookmarkCount
  };
}

const adduserByusername = async (username) => {
  const session = neo4jDriver.session();
  try {
    const exists = await session.run(
      `MATCH (u:User {username:$username}) RETURN u`,
      { username }
    );
    console.log(exists.records.length);
    if (exists.records.length == 0) {
      const user = await getUserInfo(username);
      if (user != null) {
        const props = UserModel(user);
        const result = await session.run(
          `CREATE (u:User $props) RETURN u`, { props }
        );
      }
    }
    await session.close();
  } catch (err) {
    await session.close();
    console.error("addusers from functions", err);
  }
};

export { adduserByusername };