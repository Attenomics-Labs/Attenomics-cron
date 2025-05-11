import { neo4jDriver } from "../DB/neo4j.DB.js";
import { getDayIndex } from "../component/datetime.component.js";
import fetch from "node-fetch";

export async function processUserSupporters(username) {
    const session = neo4jDriver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {username: $username}), 
            (s)-[r:SUPPORTS]->(u)
            WITH s, r, u
            MATCH (t:Tweet {tweetID: r.tweetID})
            MATCH p = (s)-[r]->(u)
            RETURN p, t, s`,
            { username }
        );

        let Tweets = {};
        result.records.map(el => {
            const tweet = el.get('t').properties;
            const day = getDayIndex(tweet['timestamp']);
            if (day != null) {
                const previousDay = day - 1;
                if (Tweets[tweet['username']] == undefined) {
                    Tweets[tweet['username']] = [{
                        tweet: tweet['text'],
                        metric: {
                            likes: tweet[`likes_day${previousDay}`] ?? tweet[`likes_day${day}`] ?? 0,
                            views: tweet[`views_day${previousDay}`] ?? tweet[`views_day${day}`] ?? 0,
                            retweets: tweet[`retweets_day${previousDay}`] ?? tweet[`retweets_day${day}`] ?? 0,
                            bookmarkCount: tweet[`bookmarkCount_day${previousDay}`] ?? tweet[`bookmarkCount_day${day}`] ?? 0,
                            replies: tweet['replies'] ?? 0
                        }
                    }];
                } else {
                    Tweets[tweet['username']].push({
                        tweet: tweet['text'],
                        metric: {
                            likes: tweet[`likes_day${previousDay}`] ?? tweet[`likes_day${day}`] ?? 0,
                            views: tweet[`views_day${previousDay}`] ?? tweet[`views_day${day}`] ?? 0,
                            retweets: tweet[`retweets_day${previousDay}`] ?? tweet[`retweets_day${day}`] ?? 0,
                            bookmarkCount: tweet[`bookmarkCount_day${previousDay}`] ?? tweet[`bookmarkCount_day${day}`] ?? 0,
                            replies: tweet['replies'] ?? 0
                        }
                    });
                }
            }
        });

        // Prepare payload for model API
        const modelPayload = {
            status: 200,
            payload: {
                [username]: {
                    SUPPORTS: Object.entries(Tweets).map(([account_x, tweets]) => ({
                        account_x,
                        Tweets: tweets
                    }))
                }
            },
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
                console.error(`Model API error for user ${username}:`, await modelResponse.text());
                return null;
            }

            const supportScores = await modelResponse.json();
            console.log(`Support scores for ${username}:`, supportScores);

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
                    await session.run(
                        `MATCH (creator:User {username: $creator})
                         MATCH (supporter:User {username: $supporter})
                         MERGE (supporter)-[r:SUPPORTS]->(creator)
                         SET r.rawScore = $rawScore,
                             r.normalizedScore = $normalizedScore,
                             r.updatedAt = datetime()`,
                        {
                            creator: username,
                            supporter: supporter,
                            rawScore: scores.rawScore,
                            normalizedScore: scores.normalizedScore
                        }
                    );
                }

                // Store the complete scores in the creator's node
                await session.run(
                    `MATCH (u:User {username: $username})
                     SET u.supportScores = $scores`,
                    {
                        username,
                        scores: JSON.stringify(normalizedScores)
                    }
                );
            }

            return supportScores;
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

export async function processAllSupporters() {
    const session = neo4jDriver.session();
    try {
        // Get all users
        const result = await session.run(
            `MATCH (u:User)
            RETURN u.username as username`
        );

        const users = result.records.map(record => record.get('username'));
        console.log(`Found ${users.length} users to process for supporter scores`);

        // Process users in batches to avoid overwhelming the system
        const batchSize = 5;
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            console.log(`Processing supporter scores batch ${i/batchSize + 1} of ${Math.ceil(users.length/batchSize)}`);
            
            await Promise.all(batch.map(username => processUserSupporters(username)));
            
            // Add a small delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('✅ Finished processing all users supporter scores');
    } catch (error) {
        console.error('❌ Error in processAllSupporters:', error);
    } finally {
        await session.close();
    }
} 