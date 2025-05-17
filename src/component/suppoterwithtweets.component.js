import { client } from "../DB/Postgress.DB.js";
import { getDayIndex } from "./datetime.component.js";

const supporterwithtweets = async (username) => {
    const result = await client.query(
        `with support AS (
                SELECT * from supporters WHERE creator = '${username}'
            ),tweet As (
                SELECT t.* from support s 
                inner join tweets t on t.tweet_id = s.tweet_id
            )
            select * from tweet;
            `
    ).then(el => el.rows);
    console.log(`Found ${result.length} tweets for ${username}`);
    
    let payload = {};
    payload[username] = {
        'SUPPORTS': []
    };
    let Tweets = {};
    
    result.map(el => {
        const tweet = el;
        const day = getDayIndex(tweet['timestamp']);
        
        if (day === null || day === undefined) {
            console.log(`Warning: Null day index for tweet from ${tweet['username']}, timestamp: ${tweet['timestamp']}`);
            return; // Skip this tweet
        }
        
        if (Tweets[tweet['username']] == undefined) {
            let metric = {
                // Ensure all metrics have default values of 0
                likes: 0,
                views: 0,
                retweets: 0,
                bookmarkCount: 0,
                replies: 0
            };
            
            // Map database field names to API expected field names with fallbacks
            metric.likes = tweet[`likes_day${day}`] || 0;
            metric.views = tweet[`views_day${day}`] || 0;
            metric.retweets = tweet[`retweets_day${day}`] || 0;
            metric.bookmarkCount = tweet[`bookmark_count_day${day}`] || 0;
            metric.replies = tweet[`replies_day${day}`] || 0;
            
            Tweets[tweet['username']] = [{
                tweet: tweet['text'] || "",
                metric: metric,
            }];
        }
        else {
            let metric = {
                // Ensure all metrics have default values of 0
                likes: 0,
                views: 0,
                retweets: 0,
                bookmarkCount: 0,
                replies: 0
            };
            
            // Map database field names to API expected field names with fallbacks
            metric.likes = tweet[`likes_day${day}`] || 0;
            metric.views = tweet[`views_day${day}`] || 0;
            metric.retweets = tweet[`retweets_day${day}`] || 0;
            metric.bookmarkCount = tweet[`bookmark_count_day${day}`] || 0;
            metric.replies = tweet[`replies_day${day}`] || 0;
            
            Tweets[tweet['username']].push({
                tweet: tweet['text'] || "",
                metric: metric,
            });
        }
    });
    
    for (const id in Tweets) {
        payload[username]['SUPPORTS'].push(
            {
                'account_x': id,
                'Tweets': Tweets[id]
            }
        );
    }
    
    // Log sample of the payload for debugging
    if (payload[username]['SUPPORTS'].length > 0) {
        const firstSupporter = payload[username]['SUPPORTS'][0];
        console.log(`Sample payload structure for ${username}:`, 
                    JSON.stringify({
                        supporter: firstSupporter.account_x,
                        tweetCount: firstSupporter.Tweets.length,
                        sampleTweet: firstSupporter.Tweets[0]
                    }, null, 2));
    } else {
        console.log(`Warning: No supports found for ${username}`);
    }
    
    return payload;
}

export { supporterwithtweets };