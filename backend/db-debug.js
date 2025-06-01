// backend/debug-db.js
require('dotenv').config();
const mysql = require('mysql2');

console.log('🔍 Debug Datenbank-Verbindung\n');
console.log('📋 Aktuelle Konfiguration:');
console.log('   Host:', process.env.DB_HOST);
console.log('   Port:', process.env.DB_PORT || 3306);
console.log('   User:', process.env.DB_USER);
console.log('   Database:', process.env.DB_NAME);
console.log('   Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'NICHT GESETZT');
console.log('\n');

// Test verschiedene Verbindungsoptionen
async function testConnections() {
  const configs = [
    {
      name: 'Standard Port 3306',
      config: {
        host: process.env.DB_HOST,
        port: 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 10000
      }
    },
    {
      name: 'Plesk MySQL Port 8443',
      config: {
        host: process.env.DB_HOST,
        port: 8443,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 10000
      }
    },
    {
      name: 'Mit SSL/TLS',
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
        connectTimeout: 10000
      }
    }
  ];

  for (const test of configs) {
    console.log(`\n🧪 Teste: ${test.name}`);
    console.log(`   Port: ${test.config.port}`);
    
    const connection = mysql.createConnection(test.config);
    
    try {
      await new Promise((resolve, reject) => {
        connection.connect((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log(`   ✅ ERFOLG! Verbindung hergestellt`);
      
      // Teste Query
      const [result] = await new Promise((resolve, reject) => {
        connection.query('SELECT 1 as test', (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      
      console.log(`   ✅ Query erfolgreich`);
      
      // Zeige die richtige Konfiguration
      console.log('\n🎯 FUNKTIONIERENDE KONFIGURATION:');
      console.log(`DB_HOST=${test.config.host}`);
      console.log(`DB_PORT=${test.config.port}`);
      console.log(`DB_USER=${test.config.user}`);
      console.log(`DB_NAME=${test.config.database}`);
      if (test.config.ssl) {
        console.log('# SSL erforderlich - füge dies zur database.js hinzu:');
        console.log('ssl: { rejectUnauthorized: false }');
      }
      
      connection.end();
      process.exit(0);
      
    } catch (error) {
      console.log(`   ❌ Fehler: ${error.message}`);
      
      // Detaillierte Fehleranalyse
      if (error.code === 'ECONNREFUSED') {
        console.log('      → Port ist geschlossen oder falsch');
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('      → Benutzername oder Passwort falsch');
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        console.log('      → Datenbank existiert nicht');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        console.log('      → Host nicht erreichbar oder Firewall blockiert');
      }
    }
  }
  
  console.log('\n❌ Keine Verbindung möglich!');
  console.log('\n📝 Nächste Schritte:');
  console.log('1. Prüfe in Plesk ob Remote-Verbindungen erlaubt sind');
  console.log('2. Prüfe die Firewall-Einstellungen');
  console.log('3. Versuche phpMyAdmin - dort siehst du die richtigen Verbindungsdaten');
  console.log('4. Prüfe ob deine IP-Adresse in Plesk erlaubt ist');
}

testConnections().catch(console.error);
