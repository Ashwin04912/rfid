const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate(fresh = false) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  console.log('Connected to MySQL server.');

  // Fresh: drop and recreate the database
  if (fresh) {
    console.log('Dropping database...');
    await connection.query(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME}\``);
    console.log('Database dropped.');
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const queries = schema.split(';').filter(q => q.trim().length > 0);

  for (let query of queries) {
    try {
      await connection.query(query);
      console.log('Executed query successfully.');
    } catch (err) {
      if (err.code === 'ER_DB_CREATE_EXISTS') {
        console.log('Database already exists.');
      } else {
        console.error('Error executing query:', err.message);
      }
    }
  }

  await connection.end();
  console.log('Migration completed.');
}

const fresh = process.argv.includes('--fresh');
migrate(fresh).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});