

const createattentionquery = `
    CREATE TABLE IF NOT EXISTS attentions (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    date BIGINT NOT NULL,
    attention_score DECIMAL(20, 15) DEFAULT 0);
`;

const insertAttentionquery = `
    INSERT INTO attentions (
    username,
    date,
    attention_score
) VALUES (
    $1, -- username
    $2, -- date
    $3  -- attention_score
)
RETURNING id;`;

const Attentionvalues = (attention) => [
    attention.username,
    attention.date,                // $2 - username     // $3 - date
    attention.Attention         // $4 - attention_score
];

export { createattentionquery, insertAttentionquery, Attentionvalues };