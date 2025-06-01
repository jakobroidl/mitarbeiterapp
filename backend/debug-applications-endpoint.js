// backend/debug-applications-endpoint.js
require('dotenv').config();
const db = require('./src/config/database');

async function debugApplicationsEndpoint() {
  console.log('🔍 Debug Applications Endpoint\n');
  
  try {
    // 1. Test direct DB query
    console.log('1️⃣ Teste direkte DB Abfrage...');
    const query = `
      SELECT 
        a.*,
        u.email as reviewer_email,
        CONCAT(sp.first_name, ' ', sp.last_name) as reviewer_name
      FROM applications a
      LEFT JOIN users u ON a.reviewed_by = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE 1=1
      ORDER BY a.created_at DESC
      LIMIT 20
    `;
    
    console.log('Query:', query);
    
    const [applications] = await db.execute(query);
    console.log(`✅ Query erfolgreich! ${applications.length} Bewerbungen gefunden.\n`);
    
    // 2. Check JWT Secret
    console.log('2️⃣ Prüfe JWT Secret...');
    console.log('   JWT_SECRET gesetzt:', process.env.JWT_SECRET ? 'Ja ✅' : 'Nein ❌');
    if (!process.env.JWT_SECRET) {
      console.log('   ⚠️  JWT_SECRET fehlt in .env!');
    }
    
    // 3. Test pagination query
    console.log('\n3️⃣ Teste Count Query...');
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT a.id
        FROM applications a
        LEFT JOIN users u ON a.reviewed_by = u.id
        LEFT JOIN staff_profiles sp ON u.id = sp.user_id
        WHERE 1=1
      ) as subquery
    `;
    
    const [countResult] = await db.execute(countQuery);
    console.log('   Count:', countResult[0].total);
    
    console.log('\n✅ Datenbank-Queries funktionieren!');
    console.log('\nMögliche Probleme:');
    console.log('- Auth Middleware (Token/User Problem)');
    console.log('- getFileUrl Funktion');
    console.log('- Fehlende Imports');
    
  } catch (error) {
    console.error('\n❌ Fehler gefunden:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

debugApplicationsEndpoint();
