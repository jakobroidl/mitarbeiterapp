// backend/fix-admin-user.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

async function fixAdminUser() {
  try {
    console.log('=== Fixing Admin User ===');
    console.log('');
    
    const testEmail = 'admin@test.com';
    const testPassword = 'Admin123!';
    
    // First check if user exists
    const [users] = await db.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [testEmail]
    );
    
    if (users.length > 0) {
      console.log('Found user:', users[0].email, 'with ID:', users[0].id);
      
      // Check if staff profile exists
      const [profiles] = await db.execute(
        'SELECT id, personal_code FROM staff_profiles WHERE user_id = ?',
        [users[0].id]
      );
      
      if (profiles.length === 0) {
        console.log('No staff profile found. Creating one...');
        
        // Find unique personal code
        let personalCode = 'ADM001';
        let counter = 1;
        
        while (true) {
          const [existing] = await db.execute(
            'SELECT id FROM staff_profiles WHERE personal_code = ?',
            [personalCode]
          );
          if (existing.length === 0) break;
          counter++;
          personalCode = `ADM${String(counter).padStart(3, '0')}`;
        }
        
        // Create staff profile
        await db.execute(
          `INSERT INTO staff_profiles (
            user_id, personal_code, first_name, last_name, birth_date,
            phone, street, house_number, postal_code, city, tshirt_size
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            users[0].id, personalCode, 'Admin', 'User', '1990-01-01',
            '0123456789', 'Teststraße', '1', '12345', 'Berlin', 'L'
          ]
        );
        
        console.log('✅ Staff profile created with code:', personalCode);
      } else {
        console.log('✅ Staff profile exists with code:', profiles[0].personal_code);
      }
      
      // Update password to make sure it's correct
      console.log('');
      console.log('Updating password...');
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      await db.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, users[0].id]
      );
      console.log('✅ Password updated!');
      
    } else {
      console.log('User does not exist. Please run test-admin-login.js first.');
    }
    
    console.log('');
    console.log('=== Admin Login Credentials ===');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('==============================');
    
    // Test the login
    console.log('');
    console.log('Testing login...');
    const [testUsers] = await db.execute(
      'SELECT id, password FROM users WHERE email = ?',
      [testEmail]
    );
    
    if (testUsers.length > 0) {
      const isValid = await bcrypt.compare(testPassword, testUsers[0].password);
      console.log('Password test:', isValid ? '✅ PASSED' : '❌ FAILED');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Wait for DB connection
setTimeout(fixAdminUser, 500);
