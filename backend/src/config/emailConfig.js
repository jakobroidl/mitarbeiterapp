// backend/src/config/emailConfig.js
// Zentrale E-Mail-Konfiguration mit automatischer Service-Auswahl

const USE_SENDGRID = process.env.SENDGRID_API_KEY ? true : false;
const USE_MOCK = process.env.USE_MOCK_EMAIL === 'true';

let emailService;

console.log('[EmailConfig] Initializing email service...');
console.log('[EmailConfig] Environment:', process.env.NODE_ENV);
console.log('[EmailConfig] SendGrid API Key:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET');
console.log('[EmailConfig] Use Mock:', USE_MOCK);

if (USE_MOCK) {
  console.log('📧 Using MOCK email service (E-Mails werden lokal gespeichert)');
  try {
    emailService = require('../services/mockEmailService');
    console.log('[EmailConfig] Mock email service loaded successfully');
  } catch (error) {
    console.error('[EmailConfig] Failed to load mock email service:', error.message);
    throw new Error('Mock Email Service konnte nicht geladen werden');
  }
} else if (USE_SENDGRID) {
  console.log('📧 Using SendGrid email service');
  try {
    emailService = require('../services/emailService');
    console.log('[EmailConfig] SendGrid email service loaded successfully');
  } catch (error) {
    console.error('[EmailConfig] Failed to load SendGrid service:', error.message);
    console.log('[EmailConfig] Falling back to mock service...');
    
    // Fallback zu Mock-Service wenn SendGrid nicht funktioniert
    try {
      emailService = require('../services/mockEmailService');
      console.log('[EmailConfig] Mock email service loaded as fallback');
    } catch (mockError) {
      console.error('[EmailConfig] Failed to load any email service');
      throw new Error('Kein E-Mail-Service verfügbar');
    }
  }
} else {
  console.log('📧 Using standard SMTP email service');
  try {
    emailService = require('../services/emailService');
    console.log('[EmailConfig] Standard email service loaded successfully');
  } catch (error) {
    console.error('[EmailConfig] Failed to load standard email service:', error.message);
    console.log('[EmailConfig] Falling back to mock service...');
    
    // Fallback zu Mock-Service wenn SMTP nicht funktioniert
    try {
      emailService = require('../services/mockEmailService');
      console.log('[EmailConfig] Mock email service loaded as fallback');
    } catch (mockError) {
      console.error('[EmailConfig] Failed to load any email service');
      throw new Error('Kein E-Mail-Service verfügbar');
    }
  }
}

// Zeige welcher Service aktiv ist
console.log('[EmailConfig] Active email service configuration:');
if (USE_MOCK) {
  console.log('  - Type: MOCK (Development)');
  console.log('  - Emails saved to: backend/mock-emails/');
} else if (USE_SENDGRID) {
  console.log('  - Type: SendGrid');
  console.log('  - From:', process.env.SENDGRID_FROM_EMAIL);
} else {
  console.log('  - Type: SMTP');
  console.log('  - Host:', process.env.EMAIL_HOST);
  console.log('  - Port:', process.env.EMAIL_PORT);
}

module.exports = emailService;


