import { client } from "../DB/Postgress.DB.js";
import { updateTweetQuery, updateTweetvalues } from "../models/Tweet.models.js";
import { getDayIndex } from "./datetime.component.js";
import { getTweetsByIds } from "./scrape.component.js";

const updatetweet = async (username) => {
    try {
        //fetch all tweets for user
        let tweetByid = {};
        const tweet_ids = await client.query(
            `SELECT *
            FROM tweets
            WHERE timestamp < NOW() - INTERVAL '24 hours'
            AND timestamp > NOW() - INTERVAL '4 days'
            AND username = '${username}'
            ORDER BY timestamp DESC;`
        ).then(val => val.rows);
        console.log(`📥 Loaded ${tweet_ids.length} tweets from Neo4j`);
        let tweet_id = [];
        tweet_ids.map((el) => {
            const day = getDayIndex(el['timestamp']);
            if (day != null) {
                tweet_id.push(el['tweet_id']);
                tweetByid[el['tweet_id']] = el;
            }
            return;
        });
        let updates = [];
        const tweets = await getTweetsByIds(tweet_id);
        tweets.map(t => {
            const tweet = tweetByid[t.tweetID];
            const day = getDayIndex(t.timestamp * 1000);
            ["likes", "views", "retweets", "bookmark_count", "replies"].forEach(f => {
                tweet[`${f}_total`] = t[f == "bookmark_count" ? "bookmarkCount" : f] ?? 0;
                tweet[`${f}_day${day}`] = Math.max(t[f == "bookmark_count" ? "bookmarkCount" : f] ?? 0, 0);
            });
            updates.push(tweet);
        });
        for (const el of updates) {
            const values = updateTweetvalues(el);
            // console.log(values);
            console.log(`updating values of tweet_id ${el.tweet_id}`);
            await client.query(updateTweetQuery, values);
        }
        await client.query("COMMIT");
        console.log(`Created tweets are updated`);
    } catch (err) {
        console.error("❌ updatetweets aborted:", err);
    }
};

export { updatetweet };