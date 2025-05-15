import { updatetweet } from "../component/updateTweet.component.js";
import { client } from "../DB/Postgress.DB.js";

const updateTweetMetricsDaily = async () => {
    try {
        // fetch all username from users
        const users = await client.query(
            `SELECT username FROM users`
        ).then(val => val.rows.map(el => el['username']));
        for (const username of users) {
            updatetweet(username);
            break;
        }
        // console.log(getDayIndex(2025-05-11 00:56:24));
    } catch (err) {
        console.error("❌ updateMetrics aborted:", err);
    }
};

export { updateTweetMetricsDaily };