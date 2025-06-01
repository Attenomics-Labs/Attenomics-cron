import { GoogleGenAI } from "@google/genai";
import { getAllUser } from "../component/users.component.js";
import { client } from "../DB/Postgress.DB.js";
import dotenv from "dotenv";
import { QdrantVectorDB } from "../DB/qdrant.DB.js";

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

import fs from "fs";
import path from "path";

dotenv.config({ path: ".env" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const vectorDB = new QdrantVectorDB();

const gettweets = async () => {
  await vectorDB.initialize();
  const payload = await vectorDB.getPoints();
  let PROGRESS_FILE = path.resolve(
    process.cwd(),
    "./public/embeddedtweets.json"
  );
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(payload, null, 2), "utf8");
};

// const embeddings = new OpenAIEmbeddings({
//   openAIApiKey: process.env.ORA_API_KEY,
//   modelName: "text-embedding-3-small", // or text-embedding-3-large
//   // batchSize: 512,
// });

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  modelName: "embedding-001",
});

const embedDocument = async (text) => {
  try {
    const result = await embeddings.embedQuery(text);
    return result;
  } catch (error) {
    console.error("Embedding error:", error);
    throw error;
  }
};

const tweetembedding = async (content, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: "gemini-embedding-exp-03-07",
        contents: content,
      });
      return response.embeddings;
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      console.error("Error in tweet embedding", error);
      throw error;
    }
  }
};

const tweetqdrant = async () => {
  try {
    // await vectorDB.deletecollection();
    // return;
    await vectorDB.initialize();
    const usernames = await getAllUser();
    console.log(usernames.length);
    for (const username of usernames) {
      const tweets = await client
        .query(`SELECT * FROM tweets WHERE username ='${username}'`)
        .then((val) => val.rows);
      let payload = [];
      const batch = [];
      for (const tweet of tweets) {
        const isexist = await vectorDB.pointexist(parseInt(tweet.tweet_id));
        // console.log(isexist);
        if (isexist) {
          console.log(`skiping the tweet ${tweet.tweet_id} alredy done`);
          // continue;
          break;
        }
        // return;
        const text = tweet["text"]
          .replace(/https?:\/\/t\.co\/\w+/g, "") // Remove t.co links
          .replace(/@\w+/g, "") // Remove mentions for cleaner embedding
          .replace(/\n+/g, " ") // Replace newlines with spaces
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim();

        const embedding = await embedDocument(text);

        const username = tweet["username"] || "";
        const timestamp = tweet["timestamp"] || "";

        const pagecontent = `
        Tweet by @${username} at ${timestamp}:
        ${text}
        Tweet Type: ${tweet["is_reply"] == true ? "Reply" : "Original Tweet"}
        views: ${tweet["views_total"] || 0}, likes: ${
          tweet["likes_total"] || 0
        }, replies: ${tweet["replies_total"] || 0}, retweets: ${
          tweet["retweets_total"] || 0
        },
        bookmark_count: ${tweet["bookmark_count_total"] || 0} `;

        const metadata = {
          source: "twitter",
          tweet_id: tweet["tweet_id"],
          username: tweet["username"],
          timestamp: tweet["timestamp"],
          is_reply: tweet["is_reply"] || false,
          engagement_score: calculate_engagement_score(tweet),
          views_total: tweet["views_total"] || 0,
          likes_total: tweet["likes_total"] || 0,
          replies_total: tweet["replies_total"] || 0,
          retweets_total: tweet["retweets_total"] || 0,
          bookmark_count_total: tweet["bookmark_count_total"] || 0,
          conversation_id: tweet["conversation_id"],
          content_type: "tweet_with_metrics",
        };
        const correctStructure = {
          id: parseInt(tweet.tweet_id),
          embedding: embedding,
          payload: {
            metadata: metadata,
            pagecontent: pagecontent,
          },
        };
        console.log(tweet.tweet_id);
        payload.push(correctStructure);
        if (payload.length == 500) {
          batch.push(payload);
          payload = [];
        }
        // break;
      }
      if (payload.length > 0) {
        batch.push(payload);
      }
      console.log(
        (batch.length == 0 ? 0 : batch.length - 1) * 500 + payload.length
      );
      if (batch.length > 0) {
        console.log(
          `storing ${
            (batch.length == 0 ? 0 : batch.length - 1) * 500 + payload.length
          } embedded tweets for ${username}`
        );
        for (const bt of batch) {
          await vectorDB.insertVectors(bt);
        }
      } else {
        console.log(`skip for user ${username} is alredy embedded`);
      }
    }
  } catch (error) {
    console.log("Error ", error);
  }
};

const calculate_engagement_score = (tweet) => {
  const views = tweet["views_total"] || 0;
  const likes = tweet["likes_total"] || 0;
  const replies = tweet["replies_total"] || 0;
  const retweets = tweet["retweets_total"] || 0;
  const bookmarks = tweet["bookmark_count_total"] || 0;

  if (views == 0) {
    return 0.0;
  }
  const engagement =
    likes * 1.0 + replies * 2.0 + retweets * 1.5 + bookmarks * 2.5;
  return Math.round((engagement / Math.max(views, 1)) * 100, 2);
};

export { tweetqdrant, gettweets };
