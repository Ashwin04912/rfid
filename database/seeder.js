const mysql = require('mysql2/promise');
require('dotenv').config();

const employees = [
  { name: 'Ashwin', rfid_uid: '4B00C6CCD594', hourly_rate: 0 },
  { name: 'Sreya', rfid_uid: '4B00C6D60853', hourly_rate: 0 },
  { name: 'Abhiyaa', rfid_uid: '4B00C6CE7A39', hourly_rate: 0 },
  { name: 'Dhanesh', rfid_uid: '4B00C6DB7523', hourly_rate: 0 },
  { name: 'Shubaharshini', rfid_uid: '4B00C6D3BCE2', hourly_rate: 0 },
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Connected to MySQL server.');

  for (let emp of employees) {
    try {
      await connection.query(
        'INSERT INTO employees (name, rfid_uid, hourly_rate) VALUES (?, ?, ?)',
        [emp.name, emp.rfid_uid, emp.hourly_rate]
      );
      console.log(`Seeded: ${emp.name} (${emp.rfid_uid})`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`Skipped (already exists): ${emp.name}`);
      } else {
        console.error(`Error seeding ${emp.name}:`, err.message);
      }
    }
  }

  await connection.end();
  console.log('Seeding completed.');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});