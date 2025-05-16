const createsuppotervaluequery = `
    CREATE TABLE IF NOT EXISTS supportersvalues (
    id SERIAL PRIMARY KEY,
    creator VARCHAR(255) NOT NULL,
    suppoter VARCHAR(255) NOT NULL,
    raw_score DECIMAL(20, 15) DEFAULT 0,
    normalized_score DECIMAL(20, 15) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP 
    );
`;
const createsuppoterquery = `
    CREATE TABLE IF NOT EXISTS supporters (
    id SERIAL PRIMARY KEY,
    creator VARCHAR(255) NOT NULL,
    suppoter VARCHAR(255) NOT NULL,
    tweet_id VARCHAR(50) NOT NULL,
    text TEXT,
    type VARCHAR(255));
`;

const insertsuppotervaluequery = `
    INSERT INTO supporters(
    creator,
    suppoter,
    raw_score,
    normalized_score,
    updated_at
) VALUES(
    $1,
    $2,
    $3,
    $4,
    CURRENT_TIMESTAMP
)RETURNING id;`;



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

const supportvalues = (supporter) => [
    supporter.creator,
    supporter.supporter,
    supporter.rawScore,
    supporter.normalizedScore
];


const supportervalues = (supporter) => [
    supporter.creator,
    supporter.suppoter,
    supporter.tweet_id,
    supporter.type,
    supporter.text,
];

export { supportervalues, supportvalues, insertSuppoterquery, insertsuppotervaluequery, createsuppoterquery, createsuppotervaluequery };