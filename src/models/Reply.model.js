const createreplysquery = `CREATE TABLE IF NOT EXISTS reply (
    id SERIAL PRIMARY KEY,
    reply_id VARCHAR(50) NOT NULL,
    tweet_id VARCHAR(50) NOT NULL);
    `;

const insertreplyQuery = `
  INSERT INTO reply (
    reply_id, tweet_id
  ) VALUES (
    $1, $2
  );
`;

const replyvalues = (reply) => [
    reply.reply_id,
    reply.tweet_id
];

export { replyvalues, insertreplyQuery, createreplysquery };