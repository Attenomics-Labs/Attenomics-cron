const createsuppoterquery = `
    CREATE TABLE IF NOT EXISTS supporters (
    id SERIAL PRIMARY KEY,
    creator VARCHAR(255) NOT NULL,
    suppoter VARCHAR(255) NOT NULL,
    tweet_id VARCHAR(50) NOT NULL,
    text TEXT,
    type VARCHAR(255));
`;

const insertSuppoterquery = `
    INSERT INTO supporters (
    creator,
    suppoter,
    tweet_id,
    type,
    text
) VALUES (
    $1, 
    $2, 
    $3,
    $4,
    $5  
)
RETURNING id;`;

const supportervalues = (supporter) => [
    supporter.creator,
    supporter.suppoter,
    supporter.tweet_id,
    supporter.type,
    supporter.text,

];

export { supportervalues, insertSuppoterquery, createsuppoterquery };