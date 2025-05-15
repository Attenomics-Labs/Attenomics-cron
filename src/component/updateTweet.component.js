import { client } from "../DB/Postgress.DB.js";
import { getDayIndex } from "./datetime.component.js";
import { getTweetsByIds } from "./scrape.component.js";

const updateTweetMetricsDaily = async () => {
    try {
        // fetch all username from users
        const users = await client.query(
            `SELECT username FROM users`
        ).then(val => val.rows.map(el => el['username']));
        for (const username of users) {
            //fetch all tweets for user
            const tweet_ids = await client.query(
                `SELECT timestamp, tweet_id
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
                }
                return;
            });
            const tweets = getTweetsByIds(tweet_id);
        }
        // console.log(getDayIndex(2025-05-11 00:56:24));
    } catch (err) {
        console.error("❌ updateMetrics aborted:", err);
    }
};

export { updateTweetMetricsDaily };