import { neo4jDriver } from "../DB/neo4j.DB.js"
import { client } from "../DB/Postgress.DB.js";
import { Attentionvalues, createattentionquery, insertAttentionquery } from "../models/Attention.model.js";
import { createTweetTableQuery, insertTweetQuery, Tweetvalues } from "../models/Tweet.models.js";

const addAttentionstopostgress = async () => {
    const session = neo4jDriver.session();
    try {
        await client.query(createattentionquery);
        // console.log(result);

        const Attention = await session.run(
            `Match (A:Attentions) return A`
        ).then(val => val.records.map(el => el.get('A').properties));
        console.log("storing process started");
        Attention.map(async (Tweet, idx) => {
            const isexist = await client.query(
                `SELECT * FROM attentions WHERE username='${Tweet.username}' AND date=${Tweet.date}`
            );
            if (isexist.rows.length == 0) {
                const values = Attentionvalues(Tweet);
                console.log(`${values[0]} added ${idx}`);
                await client.query(insertAttentionquery, values);
            }
        });
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.log("Error in Attention migration", error);
    }
}

export { addAttentionstopostgress };