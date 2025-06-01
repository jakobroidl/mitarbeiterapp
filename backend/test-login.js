// backend/test-login.js
require('dotenv').config();
const axios = require('axios');

async function testLogin() {
  console.log('🔍 Teste Login Endpoint...\n');
  
  const loginData = {
    email: 'admin@example.com',
    password: 'admin123'
  };
  
  console.log('📡 Sende Request an:', 'http://localhost:3001/api/auth/login');
  console.log('📦 Payload:', loginData);
  console.log('');
  
  try {
    const response = await axios.post(
      'http://localhost:3001/api/auth/login',
      loginData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Akzeptiere alle Status Codes
      }
    );
    
    console.log('📨 Response Status:', response.status);
    console.log('📋 Response Headers:', response.headers);
    console.log('📦 Response Data:', response.data);
    
    if (response.status === 204) {
      console.log('\n⚠️  Status 204 (No Content) - Das ist falsch für Login!');
      console.log('   Der Controller gibt keine Antwort zurück.');
    } else if (response.status === 200) {
      console.log('\n✅ Login erfolgreich!');
      if (response.data.token) {
        console.log('🔑 Token erhalten:', response.data.token.substring(0, 20) + '...');
      }
    } else if (response.status === 401) {
      console.log('\n❌ Login fehlgeschlagen:', response.data.message);
    } else {
      console.log('\n❌ Unerwarteter Status:', response.status);
    }
    
  } catch (error) {
    console.error('\n❌ Fehler:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   → Backend läuft nicht auf Port 3001');
    }
  }
}

testLogin();
