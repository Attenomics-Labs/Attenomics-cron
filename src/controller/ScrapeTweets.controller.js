import { neo4jDriver } from "../DB/neo4j.DB.js";
import { loadProgress, saveProgress } from "../utils/ProgressStore.js";
import { getAllUser } from "../component/users.component.js";
import { addtweets } from "../component/AddTweets.component.js";
import { today } from "../component/datetime.component.js";

/*
// scraping all userse 
*/
export const scrapeAllUsers = async () => {
  const session = neo4jDriver.session();
  try {
    const date = today();
    const users = await getAllUser();              // full list
    const { index, startedAt } = loadProgress();    // { index: number, startedAt: ms }
    console.log(`▶ Resuming scrape at user #${index} / ${users.length}`);
    console.log(`   run started at: ${new Date(startedAt).toLocaleString()}`);
    for (let i = index+1; i < users.length; i++) {
      const username = users[i];
      try {
        await addtweets(username);
        return;
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
