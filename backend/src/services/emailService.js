// backend/src/services/emailService.js
const db = require('../config/database');

// Sicherstellen, dass nodemailer korrekt geladen wird
let nodemailer;
try {
  nodemailer = require('nodemailer');
  console.log('[EmailService] Nodemailer loaded successfully');
} catch (error) {
  console.error('[EmailService] Failed to load nodemailer:', error);
  throw new Error('Nodemailer konnte nicht geladen werden');
}

const createTransporter = () => {
  console.log('[EmailService] Creating email transporter...');
  
  // Gmail-spezifische Konfiguration
  if (process.env.EMAIL_HOST === 'smtp.gmail.com') {
    console.log('[EmailService] Using Gmail configuration');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  
  // Debug-Ausgabe
  if (process.env.NODE_ENV === 'development') {
    config.debug = true; // Aktiviere Debug-Ausgabe
    config.logger = true; // Aktiviere Logger
  }
  
  console.log('[EmailService] Config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
    tls: config.tls
  });
  
  try {
    const transporter = nodemailer.createTransport(config);
    console.log('[EmailService] Transporter created successfully');
    return transporter;
  } catch (error) {
    console.error('[EmailService] Failed to create transporter:', error);
    throw error;
  }
};

// Template aus Datenbank laden
const getEmailTemplate = async (templateName) => {
  try {
    const [templates] = await db.execute(
      'SELECT * FROM email_templates WHERE name = ? AND is_active = 1',
      [templateName]
    );
    
    if (templates.length === 0) {
      console.error(`[EmailService] Email template '${templateName}' not found`);
      return null;
    }
    
    return templates[0];
  } catch (error) {
    console.error('[EmailService] Error loading email template:', error);
    return null;
  }
};

// Template-Variablen ersetzen
const replaceTemplateVariables = (template, variables) => {
  let text = template;
  
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    text = text.replace(regex, variables[key]);
  });
  
  return text;
};

// Generische E-Mail senden Funktion - VERBESSERT
const sendEmail = async (to, subject, textBody, htmlBody) => {
  console.log('[EmailService] Attempting to send email to:', to);
  
  // Prüfe ob Email-Service konfiguriert ist
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[EmailService] Email service not configured');
    return { 
      success: false, 
      error: 'Email service not configured. Please check EMAIL_HOST, EMAIL_USER and EMAIL_PASS in .env' 
    };
  }
  
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Event Staff App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody
    };
    
    console.log('[EmailService] Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] Email sent successfully:', info);
    console.log('[EmailService] Message ID:', info.messageId);
    console.log('[EmailService] Response:', info.response);
    
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (error) {
    console.error('[EmailService] Error sending email:', error);
    console.error('[EmailService] Error code:', error.code);
    console.error('[EmailService] Error response:', error.response);
    console.error('[EmailService] Error command:', error.command);
    
    // Spezifische Fehlerbehandlung
    let errorMessage = error.message;
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Verbindung zum Email-Server abgelehnt. Bitte prüfen Sie Host und Port.';
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Socket-Fehler. Möglicherweise ist der Email-Server nicht erreichbar.';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Authentifizierung fehlgeschlagen. Bitte prüfen Sie Benutzername und Passwort.';
    } else if (error.responseCode === 535) {
      errorMessage = 'Authentifizierung fehlgeschlagen. Falscher Benutzername oder Passwort.';
    }
    
    return { success: false, error: errorMessage, details: error };
  }
};

// Bewerbung angenommen E-Mail
const sendApplicationAcceptedEmail = async (email, firstName, lastName, resetToken) => {
  console.log('[EmailService] Sending application accepted email to:', email);
  
  try {
    const template = await getEmailTemplate('application_accepted');
    
    // Fallback wenn Template nicht gefunden
    const resetLink = `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`;
    
    if (!template) {
      const subject = 'Ihre Bewerbung wurde angenommen';
      const text = `Hallo ${firstName} ${lastName},\n\nIhre Bewerbung wurde angenommen. Bitte setzen Sie Ihr Passwort über folgenden Link: ${resetLink}\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `<p>Hallo ${firstName} ${lastName},</p><p>Ihre Bewerbung wurde angenommen. Bitte setzen Sie Ihr Passwort über folgenden Link:</p><p><a href="${resetLink}">Passwort festlegen</a></p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>`;
      
      return await sendEmail(email, subject, text, html);
    }
    
    const variables = {
      firstName,
      lastName,
      resetLink
    };
    
    const subject = replaceTemplateVariables(template.subject, variables);
    const textBody = replaceTemplateVariables(template.body_text, variables);
    const htmlBody = replaceTemplateVariables(template.body_html, variables);
    
    return await sendEmail(email, subject, textBody, htmlBody);
  } catch (error) {
    console.error('[EmailService] Error in sendApplicationAcceptedEmail:', error);
    throw error;
  }
};

// Bewerbung abgelehnt E-Mail
const sendApplicationRejectedEmail = async (email, firstName, lastName) => {
  console.log('[EmailService] Sending application rejected email to:', email);
  
  try {
    const template = await getEmailTemplate('application_rejected');
    
    if (!template) {
      const subject = 'Ihre Bewerbung';
      const text = `Hallo ${firstName} ${lastName},\n\nleider müssen wir Ihnen mitteilen, dass wir Ihre Bewerbung nicht berücksichtigen können.\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `<p>Hallo ${firstName} ${lastName},</p><p>leider müssen wir Ihnen mitteilen, dass wir Ihre Bewerbung nicht berücksichtigen können.</p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>`;
      
      return await sendEmail(email, subject, text, html);
    }
    
    const variables = { firstName, lastName };
    
    const subject = replaceTemplateVariables(template.subject, variables);
    const textBody = replaceTemplateVariables(template.body_text, variables);
    const htmlBody = replaceTemplateVariables(template.body_html, variables);
    
    return await sendEmail(email, subject, textBody, htmlBody);
  } catch (error) {
    console.error('[EmailService] Error in sendApplicationRejectedEmail:', error);
    throw error;
  }
};

// Event-Einladung E-Mail
const sendEventInvitationEmail = async (email, firstName, eventName, eventDate, eventLocation) => {
  console.log('[EmailService] Sending event invitation email to:', email);
  
  try {
    const template = await getEmailTemplate('event_invitation');
    
    if (!template) {
      const subject = `Einladung: ${eventName}`;
      const text = `Hallo ${firstName},\n\nSie sind eingeladen bei folgender Veranstaltung mitzuarbeiten:\n\n${eventName}\nDatum: ${eventDate}\nOrt: ${eventLocation}\n\nBitte melden Sie sich in der App an um die Einladung anzunehmen.\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `<p>Hallo ${firstName},</p><p>Sie sind eingeladen bei folgender Veranstaltung mitzuarbeiten:</p><p><strong>${eventName}</strong><br>Datum: ${eventDate}<br>Ort: ${eventLocation}</p><p>Bitte melden Sie sich in der App an um die Einladung anzunehmen.</p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>`;
      
      return await sendEmail(email, subject, text, html);
    }
    
    const variables = {
      firstName,
      eventName,
      eventDate: new Date(eventDate).toLocaleDateString('de-DE'),
      eventLocation
    };
    
    const subject = replaceTemplateVariables(template.subject, variables);
    const textBody = replaceTemplateVariables(template.body_text, variables);
    const htmlBody = replaceTemplateVariables(template.body_html, variables);
    
    return await sendEmail(email, subject, textBody, htmlBody);
  } catch (error) {
    console.error('[EmailService] Error in sendEventInvitationEmail:', error);
    throw error;
  }
};

// Schichteinteilung E-Mail
const sendShiftAssignmentEmail = async (email, firstName, eventName, status) => {
  console.log('[EmailService] Sending shift assignment email to:', email);
  
  try {
    const template = await getEmailTemplate('shift_assignment');
    
    if (!template) {
      const subject = `Schichteinteilung: ${eventName}`;
      const text = `Hallo ${firstName},\n\nIhre Schichteinteilung für ${eventName} wurde ${status}.\n\nBitte prüfen Sie die Details in der App.\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `<p>Hallo ${firstName},</p><p>Ihre Schichteinteilung für <strong>${eventName}</strong> wurde ${status}.</p><p>Bitte prüfen Sie die Details in der App.</p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>`;
      
      return await sendEmail(email, subject, text, html);
    }
    
    const variables = {
      firstName,
      eventName,
      status
    };
    
    const subject = replaceTemplateVariables(template.subject, variables);
    const textBody = replaceTemplateVariables(template.body_text, variables);
    const htmlBody = replaceTemplateVariables(template.body_html, variables);
    
    return await sendEmail(email, subject, textBody, htmlBody);
  } catch (error) {
    console.error('[EmailService] Error in sendShiftAssignmentEmail:', error);
    throw error;
  }
};

// Neue Nachricht Benachrichtigung
const sendNewMessageNotification = async (email, firstName, messageSubject) => {
  console.log('[EmailService] Sending new message notification to:', email);
  
  try {
    const template = await getEmailTemplate('new_message');
    
    if (!template) {
      const subject = 'Neue Nachricht in der Event Staff App';
      const text = `Hallo ${firstName},\n\nSie haben eine neue Nachricht erhalten:\n\nBetreff: ${messageSubject}\n\nBitte melden Sie sich in der App an um die Nachricht zu lesen.\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `<p>Hallo ${firstName},</p><p>Sie haben eine neue Nachricht erhalten:</p><p><strong>Betreff:</strong> ${messageSubject}</p><p>Bitte melden Sie sich in der App an um die Nachricht zu lesen.</p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>`;
      
      return await sendEmail(email, subject, text, html);
    }
    
    const variables = {
      firstName,
      subject: messageSubject
    };
    
    const subject = replaceTemplateVariables(template.subject, variables);
    const textBody = replaceTemplateVariables(template.body_text, variables);
    const htmlBody = replaceTemplateVariables(template.body_html, variables);
    
    return await sendEmail(email, subject, textBody, htmlBody);
  } catch (error) {
    console.error('[EmailService] Error in sendNewMessageNotification:', error);
    throw error;
  }
};

// Passwort zurücksetzen E-Mail
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  console.log('[EmailService] Sending password reset email to:', email);
  
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Passwort zurücksetzen - Event Staff App';
    const text = `Hallo ${firstName},\n\nSie haben angefordert, Ihr Passwort zurückzusetzen.\n\nBitte klicken Sie auf folgenden Link:\n${resetLink}\n\nDer Link ist 24 Stunden gültig.\n\nFalls Sie diese Anfrage nicht gestellt haben, ignorieren Sie bitte diese E-Mail.\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
    const html = `
      <p>Hallo ${firstName},</p>
      <p>Sie haben angefordert, Ihr Passwort zurückzusetzen.</p>
      <p>Bitte klicken Sie auf folgenden Link:</p>
      <p><a href="${resetLink}" style="background-color: #007AFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Passwort zurücksetzen</a></p>
      <p>Oder kopieren Sie diesen Link in Ihren Browser:<br>${resetLink}</p>
      <p>Der Link ist 24 Stunden gültig.</p>
      <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie bitte diese E-Mail.</p>
      <p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>
    `;
    
    return await sendEmail(email, subject, text, html);
  } catch (error) {
    console.error('[EmailService] Error in sendPasswordResetEmail:', error);
    throw error;
  }
};

// Test E-Mail Konfiguration - KORRIGIERT
const testEmailConfiguration = async () => {
  console.log('[EmailService] Testing email configuration...');
  
  try {
    // Prüfe ob nodemailer geladen ist - KORRIGIERT
    if (!nodemailer || typeof nodemailer.createTransport !== 'function') {
      throw new Error('Nodemailer ist nicht korrekt geladen');
    }
    
    const transporter = createTransporter();
    
    // Verifiziere Transporter
    console.log('[EmailService] Verifying transporter...');
    try {
      await transporter.verify();
      console.log('[EmailService] Email transporter verified successfully');
    } catch (verifyError) {
      console.error('[EmailService] Transporter verification failed:', verifyError);
      // Manche SMTP-Server unterstützen VERIFY nicht, versuche trotzdem eine Test-Mail
      console.log('[EmailService] Trying to send test email despite verification failure...');
    }
    
    // Sende Test-E-Mail
    const adminEmail = process.env.EMAIL_USER || process.env.ADMIN_EMAIL;
    const testResult = await sendEmail(
      adminEmail,
      'Test E-Mail - Event Staff App',
      'Dies ist eine Test-E-Mail. Die E-Mail-Konfiguration funktioniert korrekt.',
      '<p>Dies ist eine <strong>Test-E-Mail</strong>.</p><p>Die E-Mail-Konfiguration funktioniert korrekt.</p>'
    );
    
    if (testResult.success) {
      return {
        success: true,
        message: 'E-Mail-Konfiguration erfolgreich getestet',
        result: testResult
      };
    } else {
      return {
        success: false,
        message: 'E-Mail-Konfiguration fehlgeschlagen',
        error: testResult.error,
        details: testResult.details
      };
    }
  } catch (error) {
    console.error('[EmailService] Email configuration test failed:', error);
    return {
      success: false,
      message: 'E-Mail-Konfiguration fehlgeschlagen',
      error: error.message,
      details: error
    };
  }
};

// E-Mail Templates aus DB abrufen
const getEmailTemplates = async () => {
  try {
    const [templates] = await db.execute(
      'SELECT * FROM email_templates ORDER BY name'
    );
    return templates;
  } catch (error) {
    console.error('[EmailService] Error loading email templates:', error);
    throw error;
  }
};

// E-Mail Template aktualisieren
const updateEmailTemplate = async (name, updates) => {
  try {
    const updateFields = [];
    const params = [];
    
    if (updates.subject !== undefined) {
      updateFields.push('subject = ?');
      params.push(updates.subject);
    }
    
    if (updates.bodyText !== undefined) {
      updateFields.push('body_text = ?');
      params.push(updates.bodyText);
    }
    
    if (updates.bodyHtml !== undefined) {
      updateFields.push('body_html = ?');
      params.push(updates.bodyHtml);
    }
    
    if (updateFields.length === 0) {
      return false;
    }
    
    params.push(name);
    
    const [result] = await db.execute(
      `UPDATE email_templates SET ${updateFields.join(', ')}, updated_at = NOW() WHERE name = ?`,
      params
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('[EmailService] Error updating email template:', error);
    throw error;
  }
};

// Debug-Funktion zum Prüfen des Moduls
const debugModule = () => {
  console.log('[EmailService] Module debug info:');
  console.log('- nodemailer type:', typeof nodemailer);
  console.log('- nodemailer version:', nodemailer.version || 'unknown');
  console.log('- createTransport exists:', typeof nodemailer?.createTransport);
  console.log('- Email config:');
  console.log('  - HOST:', process.env.EMAIL_HOST || 'NOT SET');
  console.log('  - PORT:', process.env.EMAIL_PORT || 'NOT SET');
  console.log('  - USER:', process.env.EMAIL_USER || 'NOT SET');
  console.log('  - PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
};

// Beim Laden des Moduls
console.log('[EmailService] Module loaded');
debugModule();

module.exports = {
  sendApplicationAcceptedEmail,
  sendApplicationRejectedEmail,
  sendEventInvitationEmail,
  sendShiftAssignmentEmail,
  sendNewMessageNotification,
  sendPasswordResetEmail,
  sendEmail,
  testEmailConfiguration,
  getEmailTemplates,
  updateEmailTemplate,
  debugModule
};


