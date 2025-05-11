import { neo4jDriver } from "../DB/neo4j.DB.js"
import { client } from "../DB/Postgress.DB.js";
import { createTweetTableQuery, insertTweetQuery, Tweetvalues } from "../models/Tweet.models.js";

const addTweettopostgress = async () => {
    const session = neo4jDriver.session();
    try {
        const result = await client.query(createTweetTableQuery);
        // console.log(result);

        const Tweet = await session.run(
            `Match (t:Tweet) SKIP 133205 return t`
        ).then(val => val.records.map(el => el.get('t').properties));
        // let len = Tweet.length / 100;
        console.log("storing process started");
        Tweet.map(async (Tweet, idx) => {
            const values = Tweetvalues(Tweet);
            console.log(`${values[0]} added ${idx}`);
            await client.query(insertTweetQuery, values);
        });
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.log("Error in migration", error);
    }
}



export { addTweettopostgress };