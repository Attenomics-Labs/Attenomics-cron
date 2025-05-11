/** Map raw API tweet object to our internal shape */
//creating Model for Tweets
const TweetModel = (t) => {
    return {
        bookmarkCount: t.bookmarkCount,
        conversationId: t.conversationId,
        tweetID: t.id,
        likes: t.likeCount,
        name: t.author.name,
        permanentUrl: t.url,
        replies: t.replyCount,
        retweets: t.retweetCount,
        text: t.text,
        userId: t.author.id,
        username: t.author.userName,
        isReply: t.isReply,
        isQuoted: t.isQuoted ?? false,
        isEdited: t.isEdited ?? false,
        timestamp: Math.floor(new Date(t.createdAt).getTime() / 1000),
        inReplyToStatusId: t.inReplyToId,
        views: t.viewCount
    };
}

function normalizeTweet(raw) {
    return {
        text: raw.text || "",
        likes: Number(raw.likes ?? 0),
        likes_day0: Number(raw.likes_day0 ?? 0),
        likes_day1: Number(raw.likes_day1 ?? 0),
        likes_day2: Number(raw.likes_day2 ?? 0),
        likes_day3: Number(raw.likes_day3 ?? 0),
        likes_total: Number(raw.likes_total ?? raw.likes ?? 0),

        retweets: Number(raw.retweets ?? 0),
        retweets_day0: Number(raw.retweets_day0 ?? 0),
        retweets_day1: Number(raw.retweets_day1 ?? 0),
        retweets_day2: Number(raw.retweets_day2 ?? 0),
        retweets_day3: Number(raw.retweets_day3 ?? 0),
        retweets_total: Number(raw.retweets_total ?? raw.retweets ?? 0),

        bookmarkCount: Number(raw.bookmarkCount ?? 0),
        bookmarkCount_day0: Number(raw.bookmarkCount_day0 ?? 0),
        bookmarkCount_day1: Number(raw.bookmarkCount_day1 ?? 0),
        bookmarkCount_day2: Number(raw.bookmarkCount_day2 ?? 0),
        bookmarkCount_day3: Number(raw.bookmarkCount_day3 ?? 0),
        bookmarkCount_total: Number(raw.bookmarkCount_total ?? raw.bookmarkCount ?? 0),

        views: String(raw.views_total ?? raw.views ?? "0"),
        views_day0: Number(raw.views_day0 ?? 0),
        views_day1: Number(raw.views_day1 ?? 0),
        views_day2: Number(raw.views_day2 ?? 0),
        views_day3: Number(raw.views_day3 ?? 0),

        replies: Number(raw.replies ?? 0),
        isQuoted: Boolean(raw.isQuoted ?? false),
        isReply: Boolean(raw.isReply ?? false),
        isEdited: Boolean(raw.isEdited ?? false),

        tweetID: raw.tweetID || "",
        username: raw.username || "",
        name: raw.name || "",
        userId: raw.userId || "",
        timestamp: Number(raw.timestamp ?? 0),
        permanentUrl: raw.permanentUrl || "",
        conversationId: raw.conversationId || ""
    };
}

const createTweetTableQuery = `
    CREATE TABLE IF NOT EXISTS tweets (
    id SERIAL PRIMARY KEY,
    tweet_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    text TEXT,
    timestamp TIMESTAMP,
    conversation_id VARCHAR(50),
    in_reply_to_status_id VARCHAR(50),
    is_reply BOOLEAN DEFAULT FALSE,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    replies INT DEFAULT 0,
    retweets INT DEFAULT 0,
    bookmark_count INT DEFAULT 0,
    views_day0 INT DEFAULT 0,
    views_day1 INT DEFAULT 0,
    views_day2 INT DEFAULT 0,
    views_day3 INT DEFAULT 0,
    views_total INT DEFAULT 0,
    likes_day0 INT DEFAULT 0,
    likes_day1 INT DEFAULT 0,
    likes_day2 INT DEFAULT 0,
    likes_day3 INT DEFAULT 0,
    likes_total INT DEFAULT 0,
    replies_day0 INT DEFAULT 0,
    replies_day1 INT DEFAULT 0,
    replies_day2 INT DEFAULT 0,
    replies_day3 INT DEFAULT 0,
    replies_total INT DEFAULT 0,
    retweets_day0 INT DEFAULT 0,
    retweets_day1 INT DEFAULT 0,
    retweets_day2 INT DEFAULT 0,
    retweets_day3 INT DEFAULT 0,
    retweets_total INT DEFAULT 0,
    bookmark_count_day0 INT DEFAULT 0,
    bookmark_count_day1 INT DEFAULT 0,
    bookmark_count_day2 INT DEFAULT 0,
    bookmark_count_day3 INT DEFAULT 0,
    bookmark_count_total INT DEFAULT 0);
    `;

const insertTweetQuery = `
  INSERT INTO tweets (
    tweet_id, username, text, timestamp, conversation_id,
    in_reply_to_status_id, is_reply, views, likes, replies,
    retweets, bookmark_count, views_day0, views_day1, views_day2,
    views_day3, views_total, likes_day0, likes_day1, likes_day2,
    likes_day3, likes_total, replies_day0, replies_day1, replies_day2,
    replies_day3, replies_total, retweets_day0, retweets_day1, retweets_day2,
    retweets_day3, retweets_total, bookmark_count_day0, bookmark_count_day1,
    bookmark_count_day2, bookmark_count_day3, bookmark_count_total
  ) VALUES (
    $1, $2, $3, TO_TIMESTAMP($4), $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
    $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
    $31, $32, $33, $34, $35, $36, $37
  )
  ON CONFLICT (tweet_id) DO UPDATE SET
    username = EXCLUDED.username,
    text = EXCLUDED.text,
    timestamp = EXCLUDED.timestamp,
    conversation_id = EXCLUDED.conversation_id,
    in_reply_to_status_id = EXCLUDED.in_reply_to_status_id,
    is_reply = EXCLUDED.is_reply,
    views = EXCLUDED.views,
    likes = EXCLUDED.likes,
    replies = EXCLUDED.replies,
    retweets = EXCLUDED.retweets,
    bookmark_count = EXCLUDED.bookmark_count,
    views_day0 = EXCLUDED.views_day0,
    views_day1 = EXCLUDED.views_day1,
    views_day2 = EXCLUDED.views_day2,
    views_day3 = EXCLUDED.views_day3,
    views_total = EXCLUDED.views_total,
    likes_day0 = EXCLUDED.likes_day0,
    likes_day1 = EXCLUDED.likes_day1,
    likes_day2 = EXCLUDED.likes_day2,
    likes_day3 = EXCLUDED.likes_day3,
    likes_total = EXCLUDED.likes_total,
    replies_day0 = EXCLUDED.replies_day0,
    replies_day1 = EXCLUDED.replies_day1,
    replies_day2 = EXCLUDED.replies_day2,
    replies_day3 = EXCLUDED.replies_day3,
    replies_total = EXCLUDED.replies_total,
    retweets_day0 = EXCLUDED.retweets_day0,
    retweets_day1 = EXCLUDED.retweets_day1,
    retweets_day2 = EXCLUDED.retweets_day2,
    retweets_day3 = EXCLUDED.retweets_day3,
    retweets_total = EXCLUDED.retweets_total,
    bookmark_count_day0 = EXCLUDED.bookmark_count_day0,
    bookmark_count_day1 = EXCLUDED.bookmark_count_day1,
    bookmark_count_day2 = EXCLUDED.bookmark_count_day2,
    bookmark_count_day3 = EXCLUDED.bookmark_count_day3,
    bookmark_count_total = EXCLUDED.bookmark_count_total;
`;

const Tweetvalues = (tweet) => [
    tweet.tweetID ?? tweet.id,                     // $1: tweet_id
    tweet.username,                                // $2: username
    tweet.text ?? "",                              // $3: text
    Math.round(parseFloat(tweet.timestamp ?? 0)),  // $4: timestamp (for TO_TIMESTAMP)
    tweet.conversationId ?? tweet.conversation_id, // $5: conversation_id
    tweet.inReplyToStatusId ?? tweet.in_reply_to_status_id ?? null, // $6: in_reply_to_status_id
    Boolean(tweet.isReply ?? false),               // $7: is_reply
    Math.round(parseFloat(tweet.views ?? 0)),      // $8: views
    Math.round(parseFloat(tweet.likes ?? 0)),      // $9: likes
    Math.round(parseFloat(tweet.replies ?? 0)),    // $10: replies
    Math.round(parseFloat(tweet.retweets ?? 0)),   // $11: retweets
    Math.round(parseFloat(tweet.bookmarkCount ?? tweet.bookmark_count ?? 0)), // $12: bookmark_count
    Math.round(parseFloat(tweet.views_day0 ?? 0)), // $13: views_day0
    Math.round(parseFloat(tweet.views_day1 ?? 0)), // $14: views_day1
    Math.round(parseFloat(tweet.views_day2 ?? 0)), // $15: views_day2
    Math.round(parseFloat(tweet.views_day3 ?? 0)), // $16: views_day3
    Math.round(parseFloat(tweet.views_total ?? 0)), // $17: views_total
    Math.round(parseFloat(tweet.likes_day0 ?? 0)), // $18: likes_day0
    Math.round(parseFloat(tweet.likes_day1 ?? 0)), // $19: likes_day1
    Math.round(parseFloat(tweet.likes_day2 ?? 0)), // $20: likes_day2
    Math.round(parseFloat(tweet.likes_day3 ?? 0)), // $21: likes_day3
    Math.round(parseFloat(tweet.likes_total ?? 0)), // $22: likes_total
    Math.round(parseFloat(tweet.replies_day0 ?? 0)), // $23: replies_day0
    Math.round(parseFloat(tweet.replies_day1 ?? 0)), // $24: replies_day1
    Math.round(parseFloat(tweet.replies_day2 ?? 0)), // $25: replies_day2
    Math.round(parseFloat(tweet.replies_day3 ?? 0)), // $26: replies_day3
    Math.round(parseFloat(tweet.replies_total ?? 0)), // $27: replies_total
    Math.round(parseFloat(tweet.retweets_day0 ?? 0)), // $28: retweets_day0
    Math.round(parseFloat(tweet.retweets_day1 ?? 0)), // $29: retweets_day1
    Math.round(parseFloat(tweet.retweets_day2 ?? 0)), // $30: retweets_day2
    Math.round(parseFloat(tweet.retweets_day3 ?? 0)), // $31: retweets_day3
    Math.round(parseFloat(tweet.retweets_total ?? 0)), // $32: retweets_total
    Math.round(parseFloat(tweet.bookmarkCount_day0 ?? tweet.bookmark_count_day0 ?? 0)), // $33: bookmark_count_day0
    Math.round(parseFloat(tweet.bookmarkCount_day1 ?? tweet.bookmark_count_day1 ?? 0)), // $34: bookmark_count_day1
    Math.round(parseFloat(tweet.bookmarkCount_day2 ?? tweet.bookmark_count_day2 ?? 0)), // $35: bookmark_count_day2
    Math.round(parseFloat(tweet.bookmarkCount_day3 ?? tweet.bookmark_count_day3 ?? 0)), // $36: bookmark_count_day3
    Math.round(parseFloat(tweet.bookmarkCount_total ?? tweet.bookmark_count_total ?? 0)) // $37: bookmark_count_total
];

const updateTweetvalues = (tweet) => [
    tweet.tweetID ?? tweet.id,
    Math.round(parseFloat(tweet.views ?? 0)),
    Math.round(parseFloat(tweet.likes ?? 0)),
    Math.round(parseFloat(tweet.replies ?? 0)),
    Math.round(parseFloat(tweet.retweets ?? 0)),
    Math.round(parseFloat(tweet.bookmarkCount ?? tweet.bookmark_count ?? 0)),
    Math.round(parseFloat(tweet.views_day0 ?? 0)),
    Math.round(parseFloat(tweet.views_day1 ?? 0)),
    Math.round(parseFloat(tweet.views_day2 ?? 0)),
    Math.round(parseFloat(tweet.views_day3 ?? 0)),
    Math.round(parseFloat(tweet.views_total ?? 0)),
    Math.round(parseFloat(tweet.likes_day0 ?? 0)),
    Math.round(parseFloat(tweet.likes_day1 ?? 0)),
    Math.round(parseFloat(tweet.likes_day2 ?? 0)),
    Math.round(parseFloat(tweet.likes_day3 ?? 0)),
    Math.round(parseFloat(tweet.likes_total ?? 0)),
    Math.round(parseFloat(tweet.replies_day0 ?? 0)),
    Math.round(parseFloat(tweet.replies_day1 ?? 0)),
    Math.round(parseFloat(tweet.replies_day2 ?? 0)),
    Math.round(parseFloat(tweet.replies_day3 ?? 0)),
    Math.round(parseFloat(tweet.replies_total ?? 0)),
    Math.round(parseFloat(tweet.retweets_day0 ?? 0)),
    Math.round(parseFloat(tweet.retweets_day1 ?? 0)),
    Math.round(parseFloat(tweet.retweets_day2 ?? 0)),
    Math.round(parseFloat(tweet.retweets_day3 ?? 0)),
    Math.round(parseFloat(tweet.retweets_total ?? 0)),
    Math.round(parseFloat(tweet.bookmarkCount_day0 ?? tweet.bookmark_count_day0 ?? 0)),
    Math.round(parseFloat(tweet.bookmarkCount_day1 ?? tweet.bookmark_count_day1 ?? 0)),
    Math.round(parseFloat(tweet.bookmarkCount_day2 ?? tweet.bookmark_count_day2 ?? 0)),
    Math.round(parseFloat(tweet.bookmarkCount_day3 ?? tweet.bookmark_count_day3 ?? 0)),
    Math.round(parseFloat(tweet.bookmarkCount_total ?? tweet.bookmark_count_total ?? 0))
];

const updateTweetQuery = `
    UPDATE tweets
    SET 
    views = $2,
    likes = $3,
    replies = $4,
    retweets = $5,
    bookmark_count = $6,
    views_day0 = $7,
    views_day1 = $8,
    views_day2 = $9,
    views_day3 = $10,
    views_total = $11,
    likes_day0 = $12,
    likes_day1 = $13,
    likes_day2 = $14,
    likes_day3 = $15,
    likes_total = $16,
    replies_day0 = $17,
    replies_day1 = $18,
    replies_day2 = $19,
    replies_day3 = $20,
    replies_total = $21,
    retweets_day0 = $22,
    retweets_day1 = $23,
    retweets_day2 = $24,
    retweets_day3 = $25,
    retweets_total = $26,
    bookmark_count_day0 = $27,
    bookmark_count_day1 = $28,
    bookmark_count_day2 = $29,
    bookmark_count_day3 = $30,
    bookmark_count_total = $31
    WHERE tweet_id = $1::TEXT;
`;

export { TweetModel, normalizeTweet, createTweetTableQuery, Tweetvalues, insertTweetQuery, updateTweetQuery, updateTweetvalues };