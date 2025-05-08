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
    // let index = 0, startedAt = 0;
    // await session.run(
    //   `MATCH(p: Progress) RETURN p`
    // ).then((result) => {
    //   if (result.records.length > 0) {
    //     index = result.records[0].get('p').properties['index'].toNumber();
    //     startedAt = result.records[0].get('p').properties['startedAt'] == 0 ? Date.now() : result.records[0].get('p').properties['startedAt'];
    //     console.log(`index from db ${index}`);
    //   }
    // });
    console.log(`▶ Resuming scrape at user #${index} / ${users.length}`);
    console.log(`   run started at: ${new Date(startedAt).toLocaleString()}`);
    let usernames = {};
    await session.run(
      `MATCH (s:scraped {date:$date}) return s`,
      {
        date
      }
    ).then((val) => {
      val.records.map(el => {
        const user = el.get('s').properties;
        usernames[user['username']] = true;
      })
    });
    for (let i = index; i < users.length; i++) {
      const username = users[i];
      if (usernames[username] != undefined) {
        saveProgress({ index: i + 1, startedAt });
        console.log(`   • Skip Scraping Done for @${username}`);
        continue;
      }
      const isexist = await session.run(
        `MATCH (s:scraped {date:$date , username:$username}) return s`,
        {
          date,
          username
        }
      );
      try {
        await addtweets(username);
        // advance and persist progress
        saveProgress({ index: i + 1, startedAt });
        await session.run(
          `create (s:scraped $props)`,
          {
            props: {
              'username': username,
              'date': date,
            }
          }
        );
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
