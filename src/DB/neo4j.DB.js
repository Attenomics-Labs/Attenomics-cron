// DB/neo4j.DB.js
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const neo4jDriver = neo4j.driver(
  process.env.URI,
  neo4j.auth.basic(process.env.USER_NAME, process.env.PASS)
);

const getWriteSession = () =>
  neo4jDriver.session({
    database: 'neo4j',
    defaultAccessMode: neo4j.session.WRITE
  });

async function verifyConnectivity() {
  try {
    const isconnected = await neo4jDriver.verifyAuthentication();
    if (isconnected) {
      console.log('✅ Connection to Neo4j established!');
    }
    else {
      console.log('❌ Connection Failed');
    }
  } catch (error) {
    console.error('❌ Connection error:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await neo4jDriver.close();
  process.exit(0);
});

export { verifyConnectivity, neo4jDriver, getWriteSession };
