const createstatusquery = `
    CREATE TABLE IF NOT EXISTS Status (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    date VARCHAR(255) NOT NULL);
`;

const insertStatusquery = `
    INSERT INTO Status (
    username,
    date
) VALUES (
    $1, 
    $2
)
RETURNING id;`;

const statusvalues = (Status) => [
    Status.username,
    Status.date
];

export { createstatusquery, insertStatusquery, statusvalues };