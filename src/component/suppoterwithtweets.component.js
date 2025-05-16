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
    console.log(result.length);
    let payload = {};
    payload[username] = {
        'SUPPORTS': []
    };
    let Tweets = {};
    result.map(el => {
        const tweet = el;
        const day = getDayIndex(tweet['timestamp']);
        // if (day != null) {
        if (Tweets[tweet['username']] == undefined) {
            let metric = {};
            ["likes", "views", "retweets", "bookmark_Count", "replies"].forEach(f => {
                metric[f] = tweet[`${f}_day${day}`];
            });
            Tweets[tweet['username']] = [{
                tweet: tweet['text'],
                metric: metric,
            }];
        }
        else {
            let metric = {};
            ["likes", "views", "retweets", "bookmark_Count", "replies"].forEach(f => {
                metric[f] = tweet[`${f}_day${day}`];
            });
            Tweets[tweet['username']].push({
                tweet: tweet['text'],
                metric: metric,
            });
        }
        // }
    });
    for (const id in Tweets) {
        payload[username]['SUPPORTS'].push(
            {
                'account_x': id,
                'Tweets': Tweets[id]
            }
        );
    }
    return payload;
}

export { supporterwithtweets };