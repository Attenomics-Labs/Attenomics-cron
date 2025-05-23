import fetch from "node-fetch";
import { client } from "../DB/Postgress.DB.js";
import {
  insertTweetvectorQuery,
  Tweetvectorvalues,
} from "../models/tweetvector.model.js";

const tweetembedding = async () => {
  try {
    // const tweets = await client.query(`select * from tweets LIMIT 1 OFFSET 0;`).then(val => val.rows);
    const users = await client
      .query(`select username from users where username = 'DevSwayam' `)
      .then((val) => val.rows.map((el) => el["username"]));
    console.log(users);
    users.map(async (user) => {
      const tweets = await client
        .query(`select * from tweets where username ='${user}' `)
        .then((val) => val.rows);
      let body = {
        model: "jina-embeddings-v3",
        task: "retrieval.query",
        input: [],
      };
      tweets.map((tweet) => {
        body["input"].push(tweet.text);
      });
      console.log(body);
      const result = await fetch("https://api.jina.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.JINA_API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      const { data } = await result.json();
      tweets.map(async (tweet, idx) => {
        const embedding = data[idx]["embedding"].map((val) => parseFloat(val)); // Ensure numeric values
        const vectorStr = `[${embedding.join(",")}]`;
        const value = Tweetvectorvalues(tweet, vectorStr);
        console.log(value[0]);
        await client.query(insertTweetvectorQuery, value);
      });
      await client.query("COMMIT");
    });
  } catch (error) {
    console.error("Error in tweet embedding", error);
  }
};

export { tweetembedding };
