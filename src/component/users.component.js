import { neo4jDriver } from "../DB/neo4j.DB.js";
import { client } from "../DB/Postgress.DB.js";

/** Get all usernames from the graph */
const getAllUser = async () => {
    try {
        const result = await client.query(
            `SELECT username FROM users where is_blocked = false`
        ).then((val) => {
            return val.rows.map(el => el['username']);
        });
        return result;
        // return result.records.map(r => r.get("username"));
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
};

// const getAllUser = async () => {
//     const session = neo4jDriver.session();
//     try {
//         const result = await session.run(
//             `MATCH (u:User {isBlocked:false}) RETURN u.username AS username`
//         );
//         return result.records.map(r => r.get("username"));
//     } catch (error) {
//         console.error("Error fetching users:", error);
//         return [];
//     } finally {
//         await session.close();
//     }
// };

export { getAllUser };