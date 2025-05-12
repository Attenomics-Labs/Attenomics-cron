
import { neo4jDriver } from "../DB/neo4j.DB.js"
import { client } from "../DB/Postgress.DB.js";
import { createvaluesquery, insertValuequery, normsvalues } from "../models/Values.model.js";

const addValuestopostgress = async () => {
    const session = neo4jDriver.session();
    try {
        await client.query(createvaluesquery);
        // console.log(result);

        const values = await session.run(
            `MATCH (v:Values) RETURN v`
        ).then(val => val.records.map(el => el.get('v').properties));
        console.log("storing process started");
        values.map(async (Tweet, idx) => {
            const value = normsvalues(Tweet);
            await client.query(insertValuequery, value);
        });
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.log("Error in Attention migration", error);
    }
}

export { addValuestopostgress };