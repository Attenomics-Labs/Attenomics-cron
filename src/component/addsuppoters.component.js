import { client } from "../DB/Postgress.DB";
import { insertsuppotervaluequery, supportvalues } from "../models/supporter.model";
import { supporterwithtweets } from "./suppoterwithtweets.component";


const processUserSupporters = async (username) => {
    const session = neo4jDriver.session();
    try {
        if (username == undefined) {
            return;
        }
        const payload = supporterwithtweets(username);
        // Prepare payload for model API
        const modelPayload = {
            status: 200,
            payload: payload,
            message: "Success",
            success: true
        };

        // Call the model API
        try {
            const modelResponse = await fetch('http://localhost:8000/aggregate_user_scores/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(modelPayload)
            });

            if (modelResponse.status === 422) {
                // Validation error: log body
                const errBody = await modelResponse.text();
                console.error(`    ❌ FastAPI validation error @${username}:`, errBody);
                return null;
            }

            if (!modelResponse.ok) {
                console.error(`Model API error for user ${username}:, await modelResponse.text()`);
                return null;
            }

            const supportScores = await modelResponse.json();
            console.log(`Support scores for ${username}:, supportScores`);

            // Normalize scores to sum up to 100
            const creatorScores = supportScores[username];
            if (creatorScores) {
                const totalScore = Object.values(creatorScores).reduce((sum, score) => sum + score, 0);
                const normalizedScores = {};

                for (const [supporter, score] of Object.entries(creatorScores)) {
                    const normalizedScore = (score / totalScore) * 100;
                    normalizedScores[supporter] = {
                        rawScore: score,
                        normalizedScore: normalizedScore
                    };
                }

                // Store the normalized scores in Neo4j and create relationships
                for (const [supporter, scores] of Object.entries(normalizedScores)) {
                    const value = supportvalues({
                        creator: username,
                        supporter: supporter,
                        rawScore: scores.rawScore,
                        normalizedScore: scores.normalizedScore
                    })
                    await client.query(insertsuppotervaluequery, value);
                }

                // Store the complete scores in the creator's node
                // await session.run(
                //     `MATCH (u:User {username: $username})
                //      SET u.supportScores = $scores`,
                //     {
                //         username,
                //         scores: JSON.stringify(normalizedScores)
                //     }
                // );
            }

            // return supportScores;
        } catch (modelError) {
            console.error(`Error processing user ${username}:`, modelError);
            return null;
        }
    } catch (error) {
        console.error(`Error processing user ${username}:`, error);
        return null;
    } finally {
        await session.close();
    }
}

export { processUserSupporters };