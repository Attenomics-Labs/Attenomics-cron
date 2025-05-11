import { Pool } from "pg";

const connectionString = `postgresql://${process.env.RDS_USERNAME}:${process.env.RDS_PASS}@${process.env.RDS_DOMAIN}:${process.env.RDS_PORT}/${process.env.DB_NAME}`;

const client = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

const connectDB = async () => {
    try {
        await client.connect().then((val) => {
            console.log('Connected to PostgreSQL');
        });
    } catch (error) {
        console.error('Connection error', error);
    }
}

export { client, connectDB }
