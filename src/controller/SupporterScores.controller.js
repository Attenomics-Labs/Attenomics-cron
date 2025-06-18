import { processUserSupporters } from "../component/addsuppoters.component.js";
import { today } from "../component/datetime.component.js";
import { getAllUser } from "../component/users.component.js";
import { client } from "../DB/Postgress.DB.js";
import {
  insertsuppoterStatusquery,
  statusvalues,
} from "../models/ScrapeStatus.model.js";

const processAllSupporters = async () => {
  try {
    // Get all users
    const usernames = await getAllUser();
    const date = "2025-06-11"; //today();
    // console.log(date);
    // return;
    console.log(
      `Found ${usernames.length} users to process for supporter scores`
    );
    let isexistuser = {};
    await client
      .query(`SELECT * FROM suppoterstatus WHERE date='${date}'`)
      .then((val) => {
        val.rows.map((user) => {
          isexistuser[user["username"]] = true;
        });
      });
    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      try {
        if (isexistuser[username] != undefined) {
          console.log(`${username} is alredy suppoter is created`);
          continue;
        }
        const isexist = await client.query(
          `SELECT * FROM suppoterstatus WHERE date='${date}' AND username='${username}'`
        );
        console.log(isexist.rows);
        if (isexist.rows.length == 0) {
          const isdone = await processUserSupporters(username);
          if (isdone) {
            const value = statusvalues({
              username: username,
              date: date,
            });
            await client.query(insertsuppoterStatusquery, value);
            await client.query("COMMIT");
          }
        }
      } catch (err) {
        console.error(`❌ Error at @${username}: `, err);
        // stop here so next run picks up at the same index
        return;
      }
    }
    console.log("✅ Finished processing all users supporter scores");
  } catch (error) {
    console.error("❌ Error in processAllSupporters:", error);
  }
};

export { processAllSupporters };
