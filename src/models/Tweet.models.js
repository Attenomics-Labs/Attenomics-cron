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

export { TweetModel, normalizeTweet };