// backend/check-applications.js
require('dotenv').config();
const db = require('./src/config/database');

async function checkApplications() {
  try {
    console.log('🔍 Prüfe Bewerbungen in der Datenbank...\n');
    
    // 1. Count applications
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM applications');
    console.log(`📊 Anzahl Bewerbungen: ${countResult[0].total}`);
    
    // 2. Get all applications
    const [applications] = await db.execute(`
      SELECT id, email, first_name, last_name, status, created_at 
      FROM applications 
      ORDER BY created_at DESC
    `);
    
    if (applications.length === 0) {
      console.log('\n❌ Keine Bewerbungen gefunden!');
      console.log('\nMögliche Gründe:');
      console.log('1. Bewerbung wurde nicht gespeichert');
      console.log('2. Falsche Datenbank');
      console.log('3. Tabelle ist leer');
    } else {
      console.log('\n✅ Gefundene Bewerbungen:');
      applications.forEach((app, index) => {
        console.log(`\n${index + 1}. ${app.first_name} ${app.last_name}`);
        console.log(`   Email: ${app.email}`);
        console.log(`   Status: ${app.status}`);
        console.log(`   Erstellt: ${new Date(app.created_at).toLocaleString('de-DE')}`);
      });
    }
    
    // 3. Test the API endpoint
    console.log('\n\n🔍 Teste API Endpoint...');
    const axios = require('axios');
    
    // First get admin token
    console.log('1. Hole Admin Token...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('   ✅ Token erhalten');
    
    // Then test applications endpoint
    console.log('\n2. Teste /api/applications Endpoint...');
    const appsResponse = await axios.get('http://localhost:3001/api/applications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('   Status:', appsResponse.status);
    console.log('   Anzahl Bewerbungen von API:', appsResponse.data.applications?.length || 0);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    if (error.response) {
      console.error('   Response Status:', error.response.status);
      console.error('   Response Data:', error.response.data);
    }
    process.exit(1);
  }
}

checkApplications();
