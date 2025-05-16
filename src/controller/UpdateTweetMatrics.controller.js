import { today } from "../component/datetime.component.js";
import { updatetweet } from "../component/updateTweet.component.js";
import { getAllUser } from "../component/users.component.js";
import { client } from "../DB/Postgress.DB.js";
import { insertupdateStatusquery, statusvalues } from "../models/ScrapeStatus.model.js";

const updateTweetMetricsDaily = async () => {
    try {
        // fetch all username from users
        const date = today();
        const users = await getAllUser();
        let isexistuser = {};
        await client.query(
            `SELECT * FROM updatestatus WHERE date='${date}'`
        ).then(val => {
            val.rows.map(user => {
                isexistuser[user['username']] = true;
            });
        });
        for (const username of users) {
            if (isexistuser[username] != undefined) {
                console.log(`${username} is alredy updated`);
                continue;
            }
            const isexist = await client.query(
                `SELECT * FROM updatestatus WHERE date='${date}' AND username='${username}'`
            )
            if (isexist.rows.length == 0) {
                await updatetweet(username);
                const value = statusvalues({
                    'username': username,
                    'date': date,
                });
                await client.query(insertupdateStatusquery, value);
                await client.query("COMMIT");
            }
        }
    } catch (err) {
        console.error("❌ updateMetrics aborted:", err);
    }
};

export { updateTweetMetricsDaily };