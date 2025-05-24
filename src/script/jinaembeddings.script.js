import { getAllUser } from "../component/users.component.js";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { client } from "../DB/Postgress.DB.js";
import {
  createTweetvectorTableQuery,
  insertTweetvectorQuery,
  Tweetvectorvalues,
} from "../models/tweetvector.model.js";
import { Console } from "console";
dotenv.config({ path: ".env" });

const jinaembeddings = async () => {
  try {
    client.query(createTweetvectorTableQuery);
    const usernames = await getAllUser();
    console.log(usernames.length);
    for (const username of usernames) {
      console.log(`making embedding for ${username}`);
      const tweets = await client
        .query(`SELECT * FROM tweets WHERE username ='${username}'`)
        .then((val) => val.rows);

      let input = [];
      //   let tweetid = "";
      const batch = [];
      for (const tweet of tweets) {
        const isexist = await client
          .query(
            `select * from tweetvectors where tweet_id ='${tweet.tweet_id}'`
          )
          .then((val) => val.rows);
        console.log(tweet.tweet_id);
        if (isexist.length > 0) {
          console.log(`skiping ${tweet.tweet_id} is alrady embedded`);
          continue;
        }
        input.push(tweet.text);
        if (input.length == 10) {
          batch.push(input);
          input = [];
        }
      }
      if (input.length != 0) {
        batch.push(input);
      }
      let embeddings = [];
      for (const bt of batch) {
        let body = {
          model: "jina-embeddings-v3",
          task: "retrieval.query",
          input: bt,
        };
        const result = await fetch("https://api.jina.ai/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.JINA_API_KEY}`,
          },
          body: JSON.stringify(body),
        });
        const { data } = await result.json();
        // console.log(data);
        data.map((el) => {
          embeddings.push(el);
        });
      }
      console.log(`${embeddings.length} and tweet len ${tweets.length}`);
      //   return;
      tweets.map(async (tweet, idx) => {
        const text = tweet["text"]
          .replace(/https?:\/\/t\.co\/\w+/g, "") // Remove t.co links
          .replace(/@\w+/g, "") // Remove mentions for cleaner embedding
          .replace(/\n+/g, " ") // Replace newlines with spaces
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim();
        const zeros = new Array(1024).fill(0);
        const embedding =
          embeddings[idx] == undefined
            ? zeros
            : embeddings[idx]["embedding"] || zeros;

        const username = tweet["username"] || "";
        const timestamp = tweet["timestamp"] || "";

        const pagecontent = `Tweet by @${username} at ${timestamp}:
            ${text}

            Engagement Metrics:
            Tweet Type: ${tweet.is_reply ? "Reply" : "Original Tweet"}
            Views: ${tweet.views_total || 0}
            Likes: ${tweet.likes_total || 0}
            Replies: ${tweet.replies_total || 0}
            Retweets: ${tweet.retweets_total || 0}
            Bookmarks: ${tweet.bookmark_count_total || 0}`;

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
        const vectorStr = `[${embedding.join(",")}]`;
        const correctStructure = {
          id: parseInt(tweet["tweet_id"]),
          embedding: vectorStr,
          metadata: metadata,
          pagecontent: pagecontent,
        };
        const value = Tweetvectorvalues(correctStructure);
        console.log(value);
        await client.query(insertTweetvectorQuery, value);
      });
      await client.query("COMMIT");
      console.log("storing embeddings");
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

export { jinaembeddings };
