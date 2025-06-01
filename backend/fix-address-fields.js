// backend/fix-address-fields.js
require('dotenv').config();
const db = require('./src/config/database');

async function fixAddressFields() {
  console.log('🔧 Prüfe und repariere Adressfelder...\n');
  
  try {
    // 1. Prüfe welche Spalten in staff_profiles existieren
    console.log('1️⃣ Prüfe existierende Spalten in staff_profiles...');
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'staff_profiles'
    `, [process.env.DB_NAME]);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('   Gefundene Spalten:', existingColumns);
    
    // 2. Definiere benötigte Spalten
    const requiredColumns = {
      street: 'VARCHAR(255)',
      house_number: 'VARCHAR(20)',
      postal_code: 'VARCHAR(10)',
      city: 'VARCHAR(100)',
      birth_date: 'DATE',
      phone: 'VARCHAR(20)',
      tshirt_size: "ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL')"
    };
    
    // 3. Füge fehlende Spalten hinzu
    console.log('\n2️⃣ Füge fehlende Spalten hinzu...');
    for (const [column, type] of Object.entries(requiredColumns)) {
      if (!existingColumns.includes(column)) {
        console.log(`   ➕ Füge Spalte '${column}' hinzu...`);
        try {
          await db.execute(`ALTER TABLE staff_profiles ADD COLUMN ${column} ${type}`);
          console.log(`   ✅ Spalte '${column}' hinzugefügt`);
        } catch (err) {
          console.error(`   ❌ Fehler beim Hinzufügen von '${column}':`, err.message);
        }
      } else {
        console.log(`   ✓ Spalte '${column}' existiert bereits`);
      }
    }
    
    // 4. Prüfe applications Tabelle
    console.log('\n3️⃣ Prüfe applications Tabelle...');
    const [appColumns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'applications'
    `, [process.env.DB_NAME]);
    
    const appExistingColumns = appColumns.map(col => col.COLUMN_NAME);
    console.log('   Applications Spalten:', appExistingColumns.filter(col => 
      ['street', 'house_number', 'postal_code', 'city'].includes(col)
    ));
    
    // 5. Test: Hole eine Bewerbung
    console.log('\n4️⃣ Teste Datenabruf...');
    const [testApp] = await db.execute('SELECT * FROM applications LIMIT 1');
    if (testApp.length > 0) {
      console.log('   ✅ Test-Bewerbung gefunden');
      console.log('   Adressfelder:', {
        street: testApp[0].street || 'LEER',
        house_number: testApp[0].house_number || 'LEER',
        postal_code: testApp[0].postal_code || 'LEER',
        city: testApp[0].city || 'LEER'
      });
    }
    
    console.log('\n✅ Datenbankprüfung abgeschlossen!');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    process.exit(0);
  }
}

fixAddressFields();



