import { neo4jDriver } from "../DB/neo4j.DB.js";
import { loadProgress, saveProgress } from "../utils/ProgressStore.js";
import { getAllUser } from "../component/users.component.js";
import { addtweets } from "../component/AddTweets.component.js";
import { today } from "../component/datetime.component.js";
import { client } from "../DB/Postgress.DB.js";
import { insertStatusquery, statusvalues } from "../models/ScrapeStatus.model.js";

/*
// scraping all userse 
*/
export const scrapeAllUsers = async () => {
  try {
    const date = today();
    const users = await getAllUser();              // full list
    const { index, startedAt } = loadProgress();    // { index: number, startedAt: ms }
    console.log(`▶ Resuming scrape at user #${index} / ${users.length}`);
    console.log(`   run started at: ${new Date(startedAt).toLocaleString()}`);
    let isexistuser = {};
    await client.query(
      `SELECT * FROM status WHERE date='${date}'`
    ).then(val => {
      val.rows.map(user => {
        isexistuser[user['username']] = true;
      });
    });
    for (let i = index; i < users.length; i++) {
      const username = users[i];
      try {
        if (isexistuser[username] != undefined) {
          saveProgress({ index: i + 1, startedAt });
          console.log(`${username} is alredy scraped`);
          continue;
        }
        const isexist = await client.query(
          `SELECT * FROM status WHERE date='${date}' AND username='${username}'`
        )
        if (isexist.rows.length == 0) {
          await addtweets(username);
          const value = statusvalues({
            'username': username,
            'date': date,
          });
          await client.query(insertStatusquery, value);
          await client.query("COMMIT");
        }
        // advance and persist progress
        saveProgress({ index: i + 1, startedAt });
      } catch (err) {
        console.error(`❌ Error at @${username}: `, err.message);
        // stop here so next run picks up at the same index
        return;
      }
    }
    // all done → reset for next full run
    console.log("✅ Finished scraping all users, resetting progress.");
    saveProgress({ index: 0, startedAt: Date.now() });
  } catch (error) {
    console.log("Scraping users Error", error);
  }
};
