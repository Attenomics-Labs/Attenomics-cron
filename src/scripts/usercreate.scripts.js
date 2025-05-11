import { neo4jDriver } from "../DB/neo4j.DB.js"
import { client } from "../DB/Postgress.DB.js";
import { createusersquery, insertQuery } from "../models/User.Models.js";

const addusertopostgress = async () => {
    const session = neo4jDriver.session();
    try {
        const result = await client.query(createusersquery);
        // console.log(result);
        const users = await session.run(
            `Match (u:User) return u`
        ).then(val => val.records.map(el => el.get('u').properties));
        users.map(async (user, idx) => {
            if (user.UserId != undefined || user.id != undefined) {
                let profileurl = null;
                if (user.profilePicture != null) {
                    profileurl = user.profilePicture.replace("normal", "400x400");
                }
                const values = [
                    user.UserId ?? user.id,
                    user.username,
                    user.Name ?? user.name,
                    user.Bio ?? user.description,
                    profileurl ?? "",
                    user.createdAt,
                    user.attentionPoint ?? 0,
                    user.ranks ?? 0,
                    user.isVerified,
                    user.isBlocked,
                    user.isBlueVerified,
                    user.isCreator,
                    user.isNewUser ?? null,
                    user.protected,
                    user.location || ''
                ];
                console.log(`${values[0]} added ${idx}`);
                await client.query(insertQuery, values);
            }
        });
        await client.query('COMMIT');
    } catch (error) {
        // await client.query('ROLLBACK');
        console.log("Error in migration", error);
    }
}



export { addusertopostgress };