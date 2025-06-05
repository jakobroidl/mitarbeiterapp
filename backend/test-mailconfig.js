const bcrypt = require('bcryptjs');
const db = require('./src/config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Hilfsfunktion für Benutzereingaben
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Funktion zum Generieren eines eindeutigen Personal-Codes
const generatePersonalCode = async (connection) => {
  let code;
  let isUnique = false;
  
  // Starte mit 100001 für den ersten Admin
  let startCode = 100001;
  
  while (!isUnique) {
    code = startCode.toString();
    
    const [existing] = await connection.execute(
      'SELECT id FROM staff_profiles WHERE personal_code = ?',
      [code]
    );
    
    if (existing.length === 0) {
      isUnique = true;
    } else {
      startCode++;
    }
  }
  
  return code;
};

async function createAdmin() {
  console.log('=== ADMIN ACCOUNT ERSTELLEN ===\n');
  
  const connection = await db.getConnection();
  
  try {
    // Prüfe ob bereits ein Admin existiert
    const [existingAdmins] = await connection.execute(
      'SELECT u.email FROM users u WHERE u.role = "admin" AND u.is_active = 1'
    );
    
    if (existingAdmins.length > 0) {
      console.log('⚠️  Es existieren bereits folgende Admin-Accounts:');
      existingAdmins.forEach(admin => console.log(`   - ${admin.email}`));
      const proceed = await question('\nTrotzdem fortfahren? (j/n): ');
      if (proceed.toLowerCase() !== 'j') {
        console.log('Abgebrochen.');
        process.exit(0);
      }
    }
    
    // Benutzereingaben sammeln
    console.log('\nBitte geben Sie die Admin-Daten ein:\n');
    
    const email = await question('E-Mail-Adresse: ');
    
    // Prüfe ob E-Mail bereits existiert
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser.length > 0) {
      console.log('\n❌ Diese E-Mail-Adresse ist bereits registriert!');
      process.exit(1);
    }
    
    const firstName = await question('Vorname: ');
    const lastName = await question('Nachname: ');
    const password = await question('Passwort (mind. 8 Zeichen): ');
    
    // Passwort-Validierung
    if (password.length < 8) {
      console.log('\n❌ Passwort muss mindestens 8 Zeichen lang sein!');
      process.exit(1);
    }
    
    const birthDate = await question('Geburtsdatum (YYYY-MM-DD): ');
    const phone = await question('Telefonnummer: ');
    const street = await question('Straße: ');
    const houseNumber = await question('Hausnummer: ');
    const postalCode = await question('Postleitzahl: ');
    const city = await question('Stadt: ');
    const tshirtSize = await question('T-Shirt Größe (XS/S/M/L/XL/XXL/3XL): ');
    
    console.log('\n📋 Zusammenfassung:');
    console.log(`   E-Mail: ${email}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Adresse: ${street} ${houseNumber}, ${postalCode} ${city}`);
    
    const confirm = await question('\nDaten korrekt? (j/n): ');
    if (confirm.toLowerCase() !== 'j') {
      console.log('Abgebrochen.');
      process.exit(0);
    }
    
    // Transaction starten
    await connection.beginTransaction();
    
    try {
      console.log('\n🔐 Passwort wird gehasht...');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      console.log('👤 Erstelle User-Account...');
      const [userResult] = await connection.execute(
        'INSERT INTO users (email, password, role, is_active) VALUES (?, ?, "admin", 1)',
        [email, hashedPassword]
      );
      
      const userId = userResult.insertId;
      
      console.log('🆔 Generiere Personal-Code...');
      const personalCode = await generatePersonalCode(connection);
      
      console.log('📝 Erstelle Staff-Profil...');
      await connection.execute(
        `INSERT INTO staff_profiles (
          user_id, personal_code, first_name, last_name, birth_date,
          phone, street, house_number, postal_code, city,
          tshirt_size, hired_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
        [
          userId, personalCode, firstName, lastName, birthDate,
          phone, street, houseNumber, postalCode, city, tshirtSize
        ]
      );
      
      console.log('📊 Erstelle Aktivitätslog...');
      await connection.execute(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
         VALUES (?, 'admin_account_created', 'user', ?, ?)`,
        [
          userId,
          userId,
          JSON.stringify({
            email,
            name: `${firstName} ${lastName}`,
            createdBy: 'setup_script'
          })
        ]
      );
      
      await connection.commit();
      
      console.log('\n✅ Admin-Account erfolgreich erstellt!\n');
      console.log('📧 E-Mail:', email);
      console.log('🔑 Personal-Code:', personalCode);
      console.log('🔐 Passwort: [Wie eingegeben]');
      console.log('\nSie können sich jetzt mit diesen Daten einloggen.');
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('\n❌ Fehler beim Erstellen des Admin-Accounts:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    rl.close();
    process.exit(0);
  }
}

// Optional: Test-Daten entfernen
async function cleanupTestData() {
  console.log('\n🧹 Möchten Sie Test-Daten entfernen? (j/n): ');
  const cleanup = await question('');
  
  if (cleanup.toLowerCase() === 'j') {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      console.log('🗑️  Entferne Test-Admin...');
      await connection.execute('DELETE FROM users WHERE email = "admin@example.com"');
      
      console.log('✅ Test-Daten entfernt');
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error('❌ Fehler beim Entfernen der Test-Daten:', error.message);
    } finally {
      connection.release();
    }
  }
}

// Hauptfunktion
async function main() {
  console.clear();
  console.log('=================================');
  console.log('  EVENT STAFF ADMIN SETUP');
  console.log('=================================\n');
  
  // Optional: Test-Daten entfernen
  await cleanupTestData();
  
  // Admin erstellen
  await createAdmin();
}

// Script ausführen
main().catch(error => {
  console.error('Unerwarteter Fehler:', error);
  process.exit(1);
});
