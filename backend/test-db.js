// backend/test-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('=== Testing Database Connection ===');
  console.log('');
  
  // Show configuration (hide password)
  console.log('Configuration:');
  console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
  console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');
  console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
  console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
  console.log('');

  try {
    console.log('Creating connection...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connection successful!');
    console.log('');
    
    // Test query
    console.log('Testing query...');
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('Query result:', rows);
    console.log('');
    
    // Check tables
    console.log('Checking tables...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Found', tables.length, 'tables');
    
    // List tables
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log('-', tableName);
    });
    console.log('');
    
    // Check users table
    console.log('Checking users table...');
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log('Users in database:', users[0].count);
    
    // Close connection
    await connection.end();
    console.log('');
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('');
    console.error('❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('');
    console.error('Common issues:');
    console.error('1. Check if the database server is accessible');
    console.error('2. Verify username and password');
    console.error('3. Make sure the database exists');
    console.error('4. Check firewall/network settings');
    console.error('5. Verify the IP address is whitelisted on the server');
  }
}

testConnection();


