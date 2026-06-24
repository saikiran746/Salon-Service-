const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  try {
    await client.query(`ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Photos';`);
    console.log("Column added");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
