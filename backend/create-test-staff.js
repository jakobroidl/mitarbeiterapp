// backend/create-test-staff.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

async function createTestStaff() {
  try {
    console.log('=== Creating Test Staff User ===');
    console.log('');
    
    const testEmail = 'staff@test.com';
    const testPassword = 'Staff123!';
    
    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [testEmail]
    );
    
    if (existingUsers.length > 0) {
      console.log('❌ User already exists!');
      console.log('Updating password...');
      
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      await db.execute(
        'UPDATE users SET password = ?, is_active = 1 WHERE email = ?',
        [hashedPassword, testEmail]
      );
      
      console.log('✅ Password updated!');
    } else {
      // Create new staff user
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      
      const [userResult] = await db.execute(
        'INSERT INTO users (email, password, role, is_active) VALUES (?, ?, ?, ?)',
        [testEmail, hashedPassword, 'staff', 1]
      );
      
      const userId = userResult.insertId;
      
      // Generate unique personal code
      const personalCode = 'STF' + String(userId).padStart(3, '0');
      
      // Create staff profile
      await db.execute(
        `INSERT INTO staff_profiles (
          user_id, personal_code, first_name, last_name, birth_date,
          phone, street, house_number, postal_code, city, tshirt_size,
          hired_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId, personalCode, 'Max', 'Mustermann', '1995-05-15',
          '0171234567', 'Musterstraße', '42', '10115', 'Berlin', 'L'
        ]
      );
      
      console.log('✅ Staff user created!');
      console.log('Personal Code:', personalCode);
    }
    
    console.log('');
    console.log('=== Staff Login Credentials ===');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('===============================');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Wait for DB connection
setTimeout(createTestStaff, 500);


