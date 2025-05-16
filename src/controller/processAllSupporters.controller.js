import { getAllUser } from "../component/users.component.js";
import { insertsuppoterStatusquery } from "../models/ScrapeStatus.model.js";


const processAllSupporters = async () => {
    try {
        // Get all users
        const usernames = getAllUser();
        const date = today();
        console.log(`Found ${usernames.length} users to process for supporter scores`);
        let isexistuser = {};
        await client.query(
            `SELECT * FROM suppoterstatus WHERE date='${date}'`
        ).then(val => {
            val.rows.map(user => {
                isexistuser[user['username']] = true;
            });
        });
        for (let i = index; i < usernames.length; i++) {
            const username = usernames[i];
            try {
                if (isexistuser[username] != undefined) {
                    console.log(`${username} is alredy suppoter is created`);
                    continue;
                }
                const isexist = await client.query(
                    `SELECT * FROM suppoterstatus WHERE date='${date}' AND username='${username}'`
                )
                if (isexist.rows.length == 0) {
                    // await addtweets(username);
                    const value = statusvalues({
                        'username': username,
                        'date': date,
                    });
                    await client.query(insertsuppoterStatusquery, value);
                    await client.query("COMMIT");
                }
            } catch (err) {
                console.error(`❌ Error at @${username}: `, err.message);
                // stop here so next run picks up at the same index
                return;
            }
        }
        console.log('✅ Finished processing all users supporter scores');
    } catch (error) {
        console.error('❌ Error in processAllSupporters:', error);
    }
}

export { processAllSupporters };