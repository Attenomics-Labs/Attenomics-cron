const createTweetvectorTableQuery = `
    CREATE TABLE IF NOT EXISTS tweetvectors (
    id SERIAL PRIMARY KEY,
    tweet_id VARCHAR(50) UNIQUE NOT NULL,
    embedding vector,
    metadata JSONB,
    pagecontent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

const insertTweetvectorQuery = `
  INSERT INTO tweetvectors (
    tweet_id, embedding, metadata, pagecontent 
  ) VALUES (
    $1, $2, $3, $4
  )
  ON CONFLICT (tweet_id) DO NOTHING;
`;

const Tweetvectorvalues = (content) => [
  content.id,
  content.embedding,
  content.metadata,
  content.pagecontent,
];

export {
  Tweetvectorvalues,
  createTweetvectorTableQuery,
  insertTweetvectorQuery,
};
