// backend/test-gmail-465.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmailConnection() {
  console.log('=== GMAIL KONFIGURATION TESTEN (Port 465) ===\n');
  
  console.log('📧 Teste verschiedene Gmail-Konfigurationen...\n');
  
  // Test 1: Port 465 (SSL)
  console.log('1️⃣ Teste Port 465 mit SSL...');
  try {
    const transporter1 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    await transporter1.verify();
    console.log('✅ Port 465 funktioniert!\n');
    
    // Sende Test-Mail
    const info = await transporter1.sendMail({
      from: process.env.EMAIL_FROM || `"Event Staff App" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'Test - Port 465 funktioniert!',
      text: 'Gmail funktioniert über Port 465 (SSL).'
    });
    
    console.log('✅ E-Mail gesendet! Message ID:', info.messageId);
    console.log('\n🎉 Empfehlung: Verwenden Sie Port 465 in Ihrer .env:\n');
    console.log('EMAIL_HOST=smtp.gmail.com');
    console.log('EMAIL_PORT=465');
    return;
    
  } catch (error) {
    console.log('❌ Port 465 fehlgeschlagen:', error.message);
  }
  
  // Test 2: Port 587 mit verschiedenen Einstellungen
  console.log('\n2️⃣ Teste Port 587 mit erweiterten Einstellungen...');
  try {
    const transporter2 = nodemailer.createTransport({
      service: 'gmail', // Nutze Gmail-Service direkt
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    await transporter2.verify();
    console.log('✅ Gmail-Service funktioniert!\n');
    
    const info = await transporter2.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER,
      subject: 'Test - Gmail Service funktioniert!',
      text: 'Gmail funktioniert über service: "gmail".'
    });
    
    console.log('✅ E-Mail gesendet! Message ID:', info.messageId);
    return;
    
  } catch (error) {
    console.log('❌ Gmail-Service fehlgeschlagen:', error.message);
  }
  
  // Test 3: Debug-Modus
  console.log('\n3️⃣ Teste mit Debug-Modus...');
  try {
    const transporter3 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      debug: true,
      logger: true,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    });
    
    await transporter3.verify();
    console.log('✅ Debug-Verbindung funktioniert!');
    
  } catch (error) {
    console.log('❌ Debug-Test fehlgeschlagen:', error.message);
    console.log('\n📋 Vollständiger Fehler:', error);
  }
  
  // Hilfe-Informationen
  console.log('\n❓ MÖGLICHE LÖSUNGEN:');
  console.log('1. Firewall/Antivirus blockiert möglicherweise Port 587/465');
  console.log('2. Prüfen Sie Ihr App-Passwort:');
  console.log('   - Gehen Sie zu: https://myaccount.google.com/apppasswords');
  console.log('   - Erstellen Sie ein NEUES App-Passwort');
  console.log('3. Aktivieren Sie "Weniger sichere Apps" (falls 2FA nicht aktiv):');
  console.log('   - https://myaccount.google.com/lesssecureapps');
  console.log('4. Prüfen Sie, ob Gmail IMAP/SMTP aktiviert hat:');
  console.log('   - Gmail Einstellungen → Weiterleitung und POP/IMAP → IMAP aktivieren');
}

// Script ausführen
testGmailConnection().catch(console.error);


