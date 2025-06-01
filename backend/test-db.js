const mysql = require('mysql2');

// Erstelle einen Connection Pool für bessere Performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
}).promise();

// Test Datenbankverbindung beim Start
pool.getConnection()
  .then(connection => {
    console.log('✅ Datenbankverbindung erfolgreich hergestellt');
    console.log(`📍 Verbunden mit: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
    connection.release();
  })
  .catch(err => {
    console.error('❌ Datenbankverbindung fehlgeschlagen:', err.message);
    console.error('Bitte überprüfen Sie Ihre Datenbank-Konfiguration in der .env Datei');
    process.exit(1);
  });

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

module.exports = pool;
