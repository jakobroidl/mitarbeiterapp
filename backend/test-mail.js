// backend/test-email.js
require('dotenv').config();
const { testEmailConfiguration, sendEmail } = require('./src/services/emailService');

async function testEmail() {
  console.log('=== E-Mail Configuration Test ===');
  console.log('Email Host:', process.env.EMAIL_HOST);
  console.log('Email Port:', process.env.EMAIL_PORT);
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email Pass:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
  console.log('================================\n');

  try {
    // Test 1: Konfiguration testen
    console.log('Testing email configuration...');
    const configTest = await testEmailConfiguration();
    console.log('Config test result:', configTest);
    
    if (configTest.success) {
      console.log('\n✅ E-Mail-Konfiguration erfolgreich!');
      
      // Test 2: Direkte E-Mail senden
      console.log('\nSending test email...');
      const result = await sendEmail(
        process.env.EMAIL_USER, // An dich selbst
        'Test E-Mail - Event Staff App',
        'Dies ist eine Test-Nachricht.\n\nWenn du diese E-Mail erhältst, funktioniert die Konfiguration!',
        `
        <h2>Test E-Mail</h2>
        <p>Dies ist eine <strong>Test-Nachricht</strong>.</p>
        <p>Wenn du diese E-Mail erhältst, funktioniert die Konfiguration!</p>
        <hr>
        <p><small>Gesendet von der Event Staff App</small></p>
        `
      );
      
      console.log('Email send result:', result);
      
      if (result.success) {
        console.log('\n✅ Test-E-Mail erfolgreich gesendet!');
        console.log('Prüfe dein Postfach:', process.env.EMAIL_USER);
      } else {
        console.log('\n❌ Fehler beim Senden der Test-E-Mail:', result.error);
      }
    } else {
      console.log('\n❌ E-Mail-Konfiguration fehlgeschlagen:', configTest.error);
    }
    
  } catch (error) {
    console.error('\n❌ Fehler:', error);
  } finally {
    process.exit();
  }
}

// Führe Test aus
testEmail();
