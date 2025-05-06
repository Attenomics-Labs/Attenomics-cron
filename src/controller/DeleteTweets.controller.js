// src/controller/UpdateAI.controller.js

import { neo4jDriver } from "../DB/neo4j.DB.js";
import { FOUR_DAYS_MS, today } from "../component/datetime.component.js";

/** split an array into N-sized chunks */
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}


const deleteOldTweet = async () => {
  const session = neo4jDriver.session();
  try {
    const time = new Date(today()).getTime();
    const date = (time - FOUR_DAYS_MS) / 1000;
    console.log(` current ${time / 1000} ans after 4 days ${date}`);
    // 1) Load all tweets + timestamps
    const allRes = await session.run(`
      MATCH (t:Tweet) Where t.timestamp<$date
      DETACH DELETE t;
    `, { date }
    );
    // const allTweets = allRes.records.map(r => {
    //   const raw = r.get("ts");
    //   const timestamp = (raw && typeof raw.toNumber === "function")
    //     ? raw.toNumber()
    //     : Number(raw);
    //   return { tweetID: r.get("id"), timestamp };
    // });

    // console.log(`📥 Loaded ${allTweets.length} tweets from Neo4j`);
    // // for (const { tweetID, timestamp } of allTweets) {
    // //   if (date > timestamp) {
    // //     deleteList.push(tweetID);
    // //   }
    // // }
    // console.log(`🗑 Queued ${deleteList.length} tweets older than 4 days for deletion`);
    // // 6) Bulk-delete queued IDs
    // if (deleteList.length) {
    //   console.log(`🗑 Deleting ${deleteList.length} tweets in one go`);
    //   for (const chunk of chunkArray(deleteList, 100)) {
    //     await session.run(
    //       `
    //       UNWIND $ids AS id
    //       MATCH (t:Tweet {tweetID:id})
    //       DETACH DELETE t
    //       `,
    //       { ids: chunk }
    //     );
    //   }
    // }
  } catch (error) {
    console.log("Deleting Error ", error);
  }
  session.close();
}



export {
  deleteOldTweet
};