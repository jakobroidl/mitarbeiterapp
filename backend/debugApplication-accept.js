// backend/debug-application-accept.js
require('dotenv').config();
const db = require('./src/config/database');

async function debugApplicationAccept() {
  console.log('🔍 Debug Application Accept Process\n');
  
  try {
    // 1. Check pending applications
    console.log('1️⃣ Checking pending applications...');
    const [pendingApps] = await db.execute(
      'SELECT id, email, first_name, last_name, street, city FROM applications WHERE status = "pending" LIMIT 5'
    );
    
    if (pendingApps.length === 0) {
      console.log('   ❌ No pending applications found');
      return;
    }
    
    console.log(`   ✅ Found ${pendingApps.length} pending applications:`);
    pendingApps.forEach(app => {
      console.log(`      - ${app.first_name} ${app.last_name} (${app.email})`);
      console.log(`        Address: ${app.street || 'NO STREET'}, ${app.city || 'NO CITY'}`);
    });
    
    // 2. Check staff_profiles structure
    console.log('\n2️⃣ Checking staff_profiles table structure...');
    const [columns] = await db.execute(`
      SHOW COLUMNS FROM staff_profiles
    `);
    
    const columnNames = columns.map(col => col.Field);
    console.log('   Columns:', columnNames);
    
    const requiredColumns = ['street', 'house_number', 'postal_code', 'city', 'phone', 'birth_date', 'tshirt_size'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('   ❌ Missing columns:', missingColumns);
      console.log('\n   Run this SQL to fix:');
      missingColumns.forEach(col => {
        let type = 'VARCHAR(255)';
        if (col === 'postal_code') type = 'VARCHAR(10)';
        if (col === 'house_number' || col === 'phone') type = 'VARCHAR(20)';
        if (col === 'city') type = 'VARCHAR(100)';
        if (col === 'birth_date') type = 'DATE';
        if (col === 'tshirt_size') type = "ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL')";
        
        console.log(`   ALTER TABLE staff_profiles ADD COLUMN ${col} ${type};`);
      });
    } else {
      console.log('   ✅ All required columns exist');
    }
    
    // 3. Test insert
    console.log('\n3️⃣ Testing staff profile insert...');
    const testApp = pendingApps[0];
    
    console.log('   Test data:');
    console.log('   - Name:', testApp.first_name, testApp.last_name);
    console.log('   - Street:', testApp.street || 'NULL');
    console.log('   - City:', testApp.city || 'NULL');
    
    // 4. Check existing staff profiles
    console.log('\n4️⃣ Checking existing staff profiles with addresses...');
    const [staffWithAddress] = await db.execute(`
      SELECT COUNT(*) as count FROM staff_profiles 
      WHERE street IS NOT NULL AND street != '' 
      AND city IS NOT NULL AND city != ''
    `);
    
    console.log(`   Staff profiles with addresses: ${staffWithAddress[0].count}`);
    
    // 5. Show sample staff profile
    const [sampleStaff] = await db.execute(`
      SELECT user_id, first_name, last_name, street, city, personal_code 
      FROM staff_profiles 
      LIMIT 1
    `);
    
    if (sampleStaff.length > 0) {
      console.log('\n   Sample staff profile:');
      console.log('   ', sampleStaff[0]);
    }
    
    console.log('\n✅ Debug complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run fix-address-fields.js if columns are missing');
    console.log('   2. Check if application form saves address data correctly');
    console.log('   3. Test accepting an application with full address data');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugApplicationAccept();



