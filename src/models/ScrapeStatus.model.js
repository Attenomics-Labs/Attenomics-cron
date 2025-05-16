const createstatusquery = `
    CREATE TABLE IF NOT EXISTS Status (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    date VARCHAR(255) NOT NULL);
`;

const createsuppoterstatusquery = `
    CREATE TABLE IF NOT EXISTS suppoterstatus (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    date VARCHAR(255) NOT NULL);
`;

const createupdatesstatusquery = `
    CREATE TABLE IF NOT EXISTS updatestatus (
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

const insertsuppoterStatusquery = `
    INSERT INTO suppoterstatus (
    username,
    date
) VALUES (
    $1, 
    $2
)
RETURNING id;`;

const insertupdateStatusquery = `
    INSERT INTO updatestatus (
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



export { 
    createstatusquery, 
    insertStatusquery, 
    statusvalues, 
    createupdatesstatusquery, 
    insertupdateStatusquery,
    createsuppoterstatusquery,
    insertsuppoterStatusquery,
};