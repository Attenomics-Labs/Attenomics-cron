
import { neo4jDriver } from "../DB/neo4j.DB.js"
import { client } from "../DB/Postgress.DB.js";
import { createsuppoterquery, insertSuppoterquery, supportervalues } from "../models/supporter.model.js";
import { createvaluesquery, insertValuequery, normsvalues } from "../models/Values.model.js";

const addsuppoterstopostgress = async () => {
    const session = neo4jDriver.session();
    try {
        await client.query(createsuppoterquery);
        // console.log(result);
        // skip = 0;
        const supporter = await session.run(
            `MATCH p=(c)-[R:SUPPORTS]->(s) SKIP 0 RETURN R,c,s Limit 10000;`
        ).then(val => val.records.map(el => {
            return {
                "creator": el.get('c').properties['username'],
                "suppoter": el.get('s').properties['username'],
                "tweet_id": el.get('R').properties['tweetID'],
                "type": el.get('R').properties['type'],
                "text": el.get('R').properties['text'],
            };
        }));
        console.log("storing process started");
        // console.log(supporter);
        supporter.map(async (Tweet, idx) => {
            console.log(Tweet);
            if (Tweet.creator != null && Tweet.suppoter != null && Tweet.tweet_id != null) {
                const value = supportervalues(Tweet);
                console.log(value);
                await client.query(insertSuppoterquery, value);
            }
        });
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.log("Error in support migration", error);
    }
}

export { addsuppoterstopostgress };