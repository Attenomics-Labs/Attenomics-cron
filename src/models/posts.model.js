const createpostsquery = `CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    tweet_id VARCHAR(50) NOT NULL,
);`;

const insertPostQuery = `
  INSERT INTO posts (
    username, tweet_id
  ) VALUES (
    $1, $2
  )
    username = EXCLUDED.username,
    tweet_id = EXCLUDED.tweet_id;
`;

const postvalues = (post) => [
  post.username,
  post.tweetID
];


export { insertPostQuery, postvalues, createpostsquery }