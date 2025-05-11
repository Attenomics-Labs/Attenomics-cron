// src/controller/UpdateAI.controller.js

import { neo4jDriver } from "../DB/neo4j.DB.js";
import { FOUR_DAYS_MS, today } from "../component/datetime.component.js";
import fs from "fs";
import path from "path";

/** split an array into N-sized chunks */
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
let Tweet_FILE = path.resolve(process.cwd(), "./public/DeletedTweet1.json");

const deleteOldTweet = async () => {
  const session = neo4jDriver.session();
  try {
    const time = new Date(today()).getTime();
    const date = (time - FOUR_DAYS_MS) / 1000;
    console.log(` current ${time / 1000} ans after 4 days ${date}`);
    // 1) Load all tweets + timestamps
    const allRes = await session.run(`
      MATCH (t:Tweet) Where t.timestamp<$date 
      Limit 20000
      return t;
    `, { date }
    ).then((val) => {
      let tweet = [];
      val.records.map(el => tweet.push(el.get('t').properties));
      return tweet;
    });
    // const jsonData = JSON.stringify(allRes, null, 2);

    // fs.writeFileSync(Tweet_FILE, jsonData);
    
    const deleteres = await session.run(`
      MATCH (t:Tweet) Where t.timestamp<$date 
      Limit 10000
      DETACH DELETE t;
    `, { date }
    ).then((val) => {
      return val.summary.counters.updates().nodesDeleted;
    });
    console.log(`${deleteres} old tweets deleted`);
  } catch (error) {
    console.log("Deleting Error ", error);
  }
  session.close();
}



export {
  deleteOldTweet
};