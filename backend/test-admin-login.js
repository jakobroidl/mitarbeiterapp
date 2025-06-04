// backend/test-admin-login.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

async function testAdminLogin() {
  try {
    console.log('=== Testing Admin Login ===');
    console.log('');
    
    const testEmail = 'admin@test.com';
    const testPassword = 'Admin123!';
    
    console.log('Looking for user:', testEmail);
    
    // Get user
    const [users] = await db.execute(
      `SELECT 
        u.id, u.email, u.password, u.role, u.is_active,
        sp.first_name, sp.last_name
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.email = ?`,
      [testEmail]
    );
    
    if (users.length === 0) {
      console.log('❌ User not found!');
      console.log('');
      console.log('Creating new admin user...');
      
      // Create admin
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      
      const [result] = await db.execute(
        'INSERT INTO users (email, password, role, is_active) VALUES (?, ?, ?, ?)',
        [testEmail, hashedPassword, 'admin', 1]
      );
      
      await db.execute(
        `INSERT INTO staff_profiles (
          user_id, personal_code, first_name, last_name, birth_date,
          phone, street, house_number, postal_code, city, tshirt_size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId, 'ADM001', 'Admin', 'User', '1990-01-01',
          '0123456789', 'Teststraße', '1', '12345', 'Berlin', 'L'
        ]
      );
      
      console.log('✅ Admin user created!');
    } else {
      const user = users[0];
      console.log('✅ User found!');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Active:', user.is_active);
      console.log('- Name:', user.first_name, user.last_name);
      
      console.log('');
      console.log('Testing password...');
      
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log('Password valid:', isValid);
      
      if (!isValid) {
        console.log('');
        console.log('Updating password...');
        const newHash = await bcrypt.hash(testPassword, 10);
        await db.execute(
          'UPDATE users SET password = ? WHERE id = ?',
          [newHash, user.id]
        );
        console.log('✅ Password updated!');
      }
    }
    
    console.log('');
    console.log('=== Login Credentials ===');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('=======================');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Warte kurz damit DB-Verbindung aufgebaut ist
setTimeout(testAdminLogin, 500);
