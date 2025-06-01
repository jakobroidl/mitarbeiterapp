// backend/fix-admin-password.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

async function fixAdmin() {
  try {
    console.log('🔧 Fixing Admin Password...\n');
    
    // Generate new password hash for "admin123"
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('📝 Neuer Password Hash generiert');
    
    // Check if admin exists
    const [existing] = await db.execute(
      'SELECT id, email, is_active FROM users WHERE email = ?',
      ['admin@example.com']
    );
    
    if (existing.length === 0) {
      console.log('❌ Admin user existiert nicht! Erstelle neuen...');
      
      // Create admin user
      const [result] = await db.execute(
        'INSERT INTO users (email, password, role, is_active) VALUES (?, ?, ?, ?)',
        ['admin@example.com', hashedPassword, 'admin', 1]
      );
      
      // Create profile
      await db.execute(
        'INSERT INTO staff_profiles (user_id, first_name, last_name, personal_code) VALUES (?, ?, ?, ?)',
        [result.insertId, 'Admin', 'User', 'ADMIN001']
      );
      
      console.log('✅ Admin User erstellt!');
    } else {
      console.log('📝 Admin gefunden, aktualisiere Passwort...');
      
      // Update password and ensure active
      await db.execute(
        'UPDATE users SET password = ?, is_active = 1 WHERE email = ?',
        [hashedPassword, 'admin@example.com']
      );
      
      console.log('✅ Passwort aktualisiert!');
      console.log('   Active:', existing[0].is_active ? 'Ja' : 'Nein → Jetzt aktiviert!');
    }
    
    // Test the password
    console.log('\n🧪 Teste neues Passwort...');
    const [users] = await db.execute('SELECT password FROM users WHERE email = ?', ['admin@example.com']);
    const isValid = await bcrypt.compare('admin123', users[0].password);
    console.log('   Password Test:', isValid ? '✅ Erfolgreich' : '❌ Fehlgeschlagen');
    
    console.log('\n📧 Login Daten:');
    console.log('   Email: admin@example.com');
    console.log('   Passwort: admin123');
    console.log('\n✅ Fertig! Versuche jetzt den Login.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

fixAdmin();
