// backend/src/config/database.js
const mysql = require('mysql2');

// WICHTIG: Lade dotenv hier, falls es noch nicht geladen wurde
if (!process.env.DB_HOST) {
  require('dotenv').config();
}

// Debug-Ausgabe
console.log('=== Database Configuration ===');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || '3306');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
console.log('=============================');

// Erstelle einen Connection Pool für bessere Performance
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 60000, // 60 Sekunden Timeout
};

console.log('Creating connection pool with config:', {
  ...poolConfig,
  password: poolConfig.password ? '***HIDDEN***' : undefined
});

const pool = mysql.createPool(poolConfig).promise();

// Test Datenbankverbindung beim Start - aber verzögert
let connectionTested = false;

const testConnection = async () => {
  if (connectionTested) return;
  connectionTested = true;
  
  try {
    console.log('Testing database connection...');
    const connection = await pool.getConnection();
    
    // Test Query
    const [result] = await connection.execute('SELECT 1 as test');
    console.log('Test query result:', result);
    
    console.log('✅ Datenbankverbindung erfolgreich hergestellt');
    console.log(`📍 Verbunden mit: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
    
    connection.release();
  } catch (err) {
    console.error('❌ Datenbankverbindung fehlgeschlagen:', err.message);
    console.error('Error code:', err.code);
    console.error('Error details:', err);
    
    if (err.code === 'ENOTFOUND') {
      console.error('-> Host nicht gefunden. Überprüfen Sie DB_HOST');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('-> Verbindung verweigert. Ist die Datenbank erreichbar?');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('-> Zugriff verweigert. Überprüfen Sie Username/Passwort');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('-> Datenbank existiert nicht. Überprüfen Sie DB_NAME');
    }
    
    console.error('Bitte überprüfen Sie Ihre Datenbank-Konfiguration in der .env Datei');
    
    // Nicht sofort beenden - lass den Server trotzdem starten
    // process.exit(1);
  }
};

// Verzögere den Connection Test um sicherzustellen dass .env geladen ist
setTimeout(testConnection, 100);

// Bei Server-Shutdown Pool schließen
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('📴 Datenbankverbindung geschlossen');
    process.exit(0);
  } catch (err) {
    console.error('Fehler beim Schließen der Datenbankverbindung:', err);
    process.exit(1);
  }
});

// Wrapper Funktion für bessere Fehlerbehandlung
pool.executeWithRetry = async (query, params, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.execute(query, params);
    } catch (error) {
      console.error(`Database query error (attempt ${i + 1}/${retries}):`, error.message);
      if (i === retries - 1) throw error;
      
      // Warte bevor Wiederholung
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

module.exports = pool;
