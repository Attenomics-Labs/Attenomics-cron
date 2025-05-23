
const createTweetvectorTableQuery = `
    CREATE TABLE IF NOT EXISTS tweetvectors (
    id SERIAL PRIMARY KEY,
    tweet_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    text TEXT,
    is_reply BOOLEAN DEFAULT FALSE,
    is_quoted BOOLEAN DEFAULT FALSE,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    replies INT DEFAULT 0,
    retweets INT DEFAULT 0,
    bookmark_count INT DEFAULT 0,
    views_total INT DEFAULT 0,
    likes_total INT DEFAULT 0,
    replies_total INT DEFAULT 0,
    retweets_total INT DEFAULT 0,
    bookmark_count_total INT DEFAULT 0,
    embedding vector(1024)
    );
    `;

const insertTweetvectorQuery = `
  INSERT INTO tweetvectors (
    tweet_id, username, text, is_reply, views, likes, replies,
    retweets, bookmark_count,  views_total,  likes_total, 
    replies_total,  retweets_total,  bookmark_count_total,
    is_quoted, embedding
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15, $16
  )
  ON CONFLICT (tweet_id) DO NOTHING;
`;

const Tweetvectorvalues = (tweet, embedding) => [
  tweet.tweetID ?? tweet.id,                     // $1: tweet_id
  tweet.username,                                // $2: username
  tweet.text ?? "",                              // $3: text
  Boolean(tweet.isReply ?? false),               // $7: is_reply
  Math.round(parseFloat(tweet.views ?? 0)),      // $8: views
  Math.round(parseFloat(tweet.likes ?? 0)),      // $9: likes
  Math.round(parseFloat(tweet.replies ?? 0)),    // $10: replies
  Math.round(parseFloat(tweet.retweets ?? 0)),   // $11: retweets
  Math.round(parseFloat(tweet.bookmarkCount ?? tweet.bookmark_count ?? 0)), // $12: bookmark_count
  Math.round(parseFloat(tweet.views_total ?? 0)), // $17: views_total
  Math.round(parseFloat(tweet.likes_total ?? 0)), // $22: likes_total
  Math.round(parseFloat(tweet.replies_total ?? 0)), // $27: replies_total
  Math.round(parseFloat(tweet.retweets_total ?? 0)), // $32: retweets_total
  Math.round(parseFloat(tweet.bookmarkCount_total ?? tweet.bookmark_count_total ?? 0)), // $37: bookmark_count_total
  Boolean(tweet.isQuoted ?? false),
  embedding ?? "[]",
];

export {
  Tweetvectorvalues,
  createTweetvectorTableQuery,
  insertTweetvectorQuery,
}