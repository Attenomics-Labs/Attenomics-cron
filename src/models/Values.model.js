
const createvaluesquery = `
    CREATE TABLE IF NOT EXISTS values (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    date BIGINT NOT NULL,
    rank DECIMAL(20, 15) DEFAULT 0,
    norm DECIMAL(20, 15) DEFAULT 0,
    final_rank DECIMAL(20, 15) DEFAULT 0,
    avg_norm DECIMAL(20, 15) DEFAULT 0
    );
`;

const insertValuequery = `
    INSERT INTO values (
    username,
    date,
    rank,
    norm
) VALUES (
    $1,
    $2, 
    $3,  
    $4
)
RETURNING id;`;

const normsvalues = (values) => [
    values.username,
    values.date,                // $2 - username     // $3 - date
    values.rank,         // $4 - attention_score
    values.norm
];

export { normsvalues, insertValuequery, createvaluesquery };