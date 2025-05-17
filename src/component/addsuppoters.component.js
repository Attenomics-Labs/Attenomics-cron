import { client } from "../DB/Postgress.DB.js";
import { insertsuppotervaluequery, supportvalues } from "../models/supporter.model.js";
import { supporterwithtweets } from "./suppoterwithtweets.component.js";


const processUserSupporters = async (username) => {
    try {
        if (username == undefined) {
            console.log("Error: Undefined username provided to processUserSupporters");
            return;
        }
        
        // Get tweet data for this user's supporters
        const payload = await supporterwithtweets(username);
        
        // Verify payload has expected structure
        if (!payload[username] || !payload[username].SUPPORTS || !Array.isArray(payload[username].SUPPORTS)) {
            console.log(`Error: Invalid payload structure for ${username}`);
            return null;
        }
        
        // Check if we have any supporters
        if (payload[username].SUPPORTS.length === 0) {
            console.log(`No supporters found for ${username}, skipping model API call`);
            return null;
        }
        
        // Prepare payload for model API
        const modelPayload = {
            status: 200,
            payload: payload,
            message: "Success",
            success: true
        };

        // Log sample of the payload
        console.log(`Sending payload for ${username} with ${payload[username].SUPPORTS.length} supporters`);
        
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
                // Validation error: log detailed error body
                const errBody = await modelResponse.text();
                console.error(`❌ FastAPI validation error for ${username}:`, errBody);
                
                // Log the first supporter data for debugging
                if (payload[username].SUPPORTS.length > 0) {
                    const firstSupporter = payload[username].SUPPORTS[0];
                    console.error(`First supporter data sample:`, JSON.stringify(firstSupporter, null, 2));
                }
                return null;
            }

            if (!modelResponse.ok) {
                const errorText = await modelResponse.text();
                console.error(`❌ Model API error for user ${username}: ${modelResponse.status}`, errorText);
                return null;
            }

            const supportScores = await modelResponse.json();
            console.log(`✅ Support scores received for ${username} with ${Object.keys(supportScores[username] || {}).length} supporters`);

            // Normalize scores to sum up to 100
            const creatorScores = supportScores[username];
            if (creatorScores && Object.keys(creatorScores).length > 0) {
                const totalScore = Object.values(creatorScores).reduce((sum, score) => sum + score, 0);
                const normalizedScores = {};

                for (const [supporter, score] of Object.entries(creatorScores)) {
                    // Handle case where score might be NaN or null
                    const safeScore = typeof score === 'number' && !isNaN(score) ? score : 0;
                    const normalizedScore = totalScore > 0 ? (safeScore / totalScore) * 100 : 0;
                    
                    normalizedScores[supporter] = {
                        rawScore: safeScore,
                        normalizedScore: normalizedScore
                    };
                }

                // Store the normalized scores in Neo4j and create relationships
                console.log(`Storing ${Object.keys(normalizedScores).length} supporter scores for ${username}`);
                for (const [supporter, scores] of Object.entries(normalizedScores)) {
                    const value = supportvalues({
                        creator: username,
                        supporter: supporter,
                        rawScore: scores.rawScore,
                        normalizedScore: scores.normalizedScore
                    });
                    await client.query(insertsuppotervaluequery, value);
                }

                console.log(`✅ Successfully processed and stored scores for ${username}`);
            } else {
                console.log(`⚠️ No scores returned for ${username}`);
            }
        } catch (modelError) {
            console.error(`❌ Error processing user ${username}:`, modelError);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error processing user ${username}:`, error);
        return null;
    }
}

export { processUserSupporters };