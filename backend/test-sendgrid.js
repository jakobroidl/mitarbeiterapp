// backend/test-sendgrid.js
require('dotenv').config();

async function testSendGrid() {
  console.log('=== SENDGRID TEST ===\n');
  
  // 1. Prüfe ob alle Variablen gesetzt sind
  console.log('1️⃣  Prüfe Konfiguration:\n');
  
  const config = {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL,
    fromName: process.env.SENDGRID_FROM_NAME || 'Event Staff App',
    testEmail: process.env.SENDGRID_TEST_EMAIL || process.env.SENDGRID_FROM_EMAIL
  };
  
  // Zeige Konfiguration
  console.log('API Key:', config.apiKey ? `✅ ${config.apiKey.substring(0, 10)}...` : '❌ FEHLT');
  console.log('From Email:', config.fromEmail ? `✅ ${config.fromEmail}` : '❌ FEHLT');
  console.log('From Name:', config.fromName);
  console.log('Test Email:', config.testEmail);
  console.log('');
  
  // Prüfe ob API Key vorhanden
  if (!config.apiKey || !config.fromEmail) {
    console.log('❌ FEHLER: Bitte setzen Sie SENDGRID_API_KEY und SENDGRID_FROM_EMAIL in der .env Datei!');
    return;
  }
  
  // 2. Lade SendGrid
  console.log('2️⃣  Lade SendGrid SDK...\n');
  
  let sgMail;
  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(config.apiKey);
    console.log('✅ SendGrid SDK geladen und konfiguriert\n');
  } catch (error) {
    console.log('❌ FEHLER: SendGrid SDK nicht gefunden!');
    console.log('Installieren Sie es mit: npm install @sendgrid/mail\n');
    return;
  }
  
  // 3. Sende Test-Email
  console.log('3️⃣  Sende Test-E-Mail...\n');
  
  const msg = {
    to: config.testEmail,
    from: {
      email: config.fromEmail,
      name: config.fromName
    },
    subject: 'SendGrid Test - Event Staff App',
    text: 'Test erfolgreich! SendGrid funktioniert.',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4CAF50;">✅ SendGrid Test erfolgreich!</h1>
        <p>Ihre SendGrid Integration funktioniert einwandfrei.</p>
        
        <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Konfiguration:</h3>
          <ul>
            <li><strong>Von:</strong> ${config.fromEmail}</li>
            <li><strong>Name:</strong> ${config.fromName}</li>
            <li><strong>Zeit:</strong> ${new Date().toLocaleString('de-DE')}</li>
          </ul>
        </div>
        
        <p>Sie können jetzt die Event Staff App mit E-Mail-Funktionalität nutzen!</p>
      </div>
    `
  };
  
  try {
    const response = await sgMail.send(msg);
    console.log('✅ E-Mail erfolgreich gesendet!');
    console.log('Status:', response[0].statusCode);
    console.log('An:', config.testEmail);
    console.log('\n📬 Prüfen Sie Ihr E-Mail-Postfach!\n');
    
  } catch (error) {
    console.log('❌ FEHLER beim Senden:', error.message);
    
    if (error.response) {
      console.log('\nDetails:');
      console.log(error.response.body);
      
      // Hilfe bei häufigen Fehlern
      if (error.code === 403) {
        console.log('\n💡 LÖSUNG:');
        console.log('Sie müssen Ihre E-Mail-Adresse bei SendGrid verifizieren:');
        console.log('1. Gehen Sie zu: https://app.sendgrid.com/settings/sender_auth');
        console.log('2. Klicken Sie auf "Verify Single Sender"');
        console.log('3. Verifizieren Sie:', config.fromEmail);
      }
    }
  }
  
  // 4. Teste den Email Service
  console.log('\n4️⃣  Teste Email Service Integration...\n');
  
  try {
    const emailService = require('./src/config/emailConfig');
    console.log('Email Service geladen:', emailService ? '✅' : '❌');
    
    if (emailService.testEmailConfiguration) {
      const result = await emailService.testEmailConfiguration();
      if (result.success) {
        console.log('✅ Email Service Test erfolgreich!');
      } else {
        console.log('❌ Email Service Test fehlgeschlagen:', result.error);
      }
    }
    
  } catch (error) {
    console.log('⚠️  Email Service konnte nicht getestet werden:', error.message);
  }
  
  console.log('\n=== TEST BEENDET ===');
}

// Test ausführen
testSendGrid().catch(console.error);
