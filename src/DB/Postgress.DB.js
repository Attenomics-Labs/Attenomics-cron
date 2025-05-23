import { Pool } from "pg";
import { createstatusquery, createsuppoterstatusquery, createupdatesstatusquery } from "../models/ScrapeStatus.model.js";
import { createsuppoterquery, createsuppotervaluequery } from "../models/supporter.model.js";
import { createusersquery } from "../models/User.Models.js";
import { createvaluesquery } from "../models/Values.model.js";
import { createreplysquery } from "../models/Reply.model.js";
import { createpostsquery } from "../models/posts.model.js";
import { createTweetTableQuery } from "../models/Tweet.models.js";
import { createTweetvectorTableQuery } from "../models/tweetvector.model.js";

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
        await createTables();
    } catch (error) {
        console.error('Connection error', error);
    }
}

const createTables = async () => {
    try {
        await client.query(createTweetTableQuery);
        await client.query(createstatusquery);
        await client.query(createsuppoterquery);
        await client.query(createusersquery);
        await client.query(createvaluesquery);
        await client.query(createreplysquery);
        await client.query(createpostsquery);
        await client.query(createupdatesstatusquery);
        await client.query(createsuppotervaluequery);
        await client.query(createsuppoterstatusquery);
        await client.query(createTweetvectorTableQuery);
    } catch (error) {
        console.log("creating table Error", error);
    }
}

export { client, connectDB }
