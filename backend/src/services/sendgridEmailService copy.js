// backend/src/services/sendgridEmailService.js
const db = require('../config/database');

// SendGrid SDK verwenden
let sgMail;
try {
  sgMail = require('@sendgrid/mail');
  console.log('[SendGridService] SendGrid SDK loaded successfully');
} catch (error) {
  console.error('[SendGridService] Failed to load SendGrid SDK:', error);
  console.log('Bitte installieren Sie das SendGrid SDK: npm install @sendgrid/mail');
}

// SendGrid API Key setzen
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('[SendGridService] API Key configured');
} else {
  console.error('[SendGridService] SENDGRID_API_KEY not found in environment variables!');
}

// Template aus Datenbank laden
const getEmailTemplate = async (templateName) => {
  try {
    const [templates] = await db.execute(
      'SELECT * FROM email_templates WHERE name = ? AND is_active = 1',
      [templateName]
    );
    
    if (templates.length === 0) {
      console.error(`[SendGridService] Email template '${templateName}' not found`);
      return null;
    }
    
    return templates[0];
  } catch (error) {
    console.error('[SendGridService] Error loading email template:', error);
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

// Generische E-Mail senden Funktion mit SendGrid
const sendEmail = async (to, subject, textBody, htmlBody) => {
  console.log('[SendGridService] Sending email to:', to);
  
  // Prüfe ob SendGrid konfiguriert ist
  if (!process.env.SENDGRID_API_KEY) {
    console.error('[SendGridService] SendGrid API key not configured');
    return { 
      success: false, 
      error: 'SendGrid API key not configured. Please set SENDGRID_API_KEY in .env' 
    };
  }
  
  try {
    const msg = {
      to: to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com',
        name: process.env.SENDGRID_FROM_NAME || 'Event Staff App'
      },
      subject: subject,
      text: textBody,
      html: htmlBody,
    };
    
    // Optional: Reply-To Adresse
    if (process.env.SENDGRID_REPLY_TO) {
      msg.replyTo = process.env.SENDGRID_REPLY_TO;
    }
    
    console.log('[SendGridService] Sending with config:', {
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    });
    
    const response = await sgMail.send(msg);
    
    console.log('[SendGridService] Email sent successfully!');
    console.log('[SendGridService] Response status:', response[0].statusCode);
    console.log('[SendGridService] Response headers:', response[0].headers);
    
    return { 
      success: true, 
      messageId: response[0].headers['x-message-id'],
      response: response[0] 
    };
    
  } catch (error) {
    console.error('[SendGridService] Error sending email:', error);
    
    // SendGrid spezifische Fehlerbehandlung
    let errorMessage = error.message;
    
    if (error.response) {
      console.error('[SendGridService] Error response:', error.response.body);
      
      if (error.code === 401) {
        errorMessage = 'Ungültiger SendGrid API Key. Bitte prüfen Sie SENDGRID_API_KEY.';
      } else if (error.code === 403) {
        errorMessage = 'SendGrid Zugriff verweigert. Prüfen Sie Ihre Sender-Verifizierung.';
      } else if (error.response.body && error.response.body.errors) {
        errorMessage = error.response.body.errors.map(e => e.message).join(', ');
      }
    }
    
    return { 
      success: false, 
      error: errorMessage, 
      details: error 
    };
  }
};

// Bewerbung angenommen E-Mail
const sendApplicationAcceptedEmail = async (email, firstName, lastName, resetToken) => {
  console.log('[SendGridService] Sending application accepted email to:', email);
  
  try {
    const template = await getEmailTemplate('application_accepted');
    
    // Fallback wenn Template nicht gefunden
    const resetLink = `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`;
    
    if (!template) {
      const subject = 'Ihre Bewerbung wurde angenommen';
      const text = `Hallo ${firstName} ${lastName},\n\nIhre Bewerbung wurde angenommen. Bitte setzen Sie Ihr Passwort über folgenden Link: ${resetLink}\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007AFF;">Willkommen im Event Staff Team!</h2>
          <p>Hallo ${firstName} ${lastName},</p>
          <p>Ihre Bewerbung wurde angenommen. Bitte setzen Sie Ihr Passwort über folgenden Link:</p>
          <p style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Passwort festlegen</a>
          </p>
          <p style="color: #666; font-size: 14px;">Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link:<br>${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #E5E5EA; margin: 30px 0;">
          <p>Mit freundlichen Grüßen<br><strong>Das Event Staff Team</strong></p>
        </div>`;
      
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
    console.error('[SendGridService] Error in sendApplicationAcceptedEmail:', error);
    throw error;
  }
};

// Bewerbung abgelehnt E-Mail
const sendApplicationRejectedEmail = async (email, firstName, lastName) => {
  console.log('[SendGridService] Sending application rejected email to:', email);
  
  try {
    const template = await getEmailTemplate('application_rejected');
    
    if (!template) {
      const subject = 'Ihre Bewerbung';
      const text = `Hallo ${firstName} ${lastName},\n\nleider müssen wir Ihnen mitteilen, dass wir Ihre Bewerbung nicht berücksichtigen können.\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Ihre Bewerbung</h2>
          <p>Hallo ${firstName} ${lastName},</p>
          <p>leider müssen wir Ihnen mitteilen, dass wir Ihre Bewerbung nicht berücksichtigen können.</p>
          <p>Wir bedanken uns für Ihr Interesse und wünschen Ihnen für Ihre Zukunft alles Gute.</p>
          <hr style="border: none; border-top: 1px solid #E5E5EA; margin: 30px 0;">
          <p>Mit freundlichen Grüßen<br><strong>Das Event Staff Team</strong></p>
        </div>`;
      
      return await sendEmail(email, subject, text, html);
    }
    
    const variables = { firstName, lastName };
    
    const subject = replaceTemplateVariables(template.subject, variables);
    const textBody = replaceTemplateVariables(template.body_text, variables);
    const htmlBody = replaceTemplateVariables(template.body_html, variables);
    
    return await sendEmail(email, subject, textBody, htmlBody);
  } catch (error) {
    console.error('[SendGridService] Error in sendApplicationRejectedEmail:', error);
    throw error;
  }
};

// Event-Einladung E-Mail
const sendEventInvitationEmail = async (email, firstName, eventName, eventDate, eventLocation) => {
  console.log('[SendGridService] Sending event invitation email to:', email);
  
  try {
    const template = await getEmailTemplate('event_invitation');
    
    if (!template) {
      const subject = `Einladung: ${eventName}`;
      const formattedDate = new Date(eventDate).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const text = `Hallo ${firstName},\n\nSie sind eingeladen bei folgender Veranstaltung mitzuarbeiten:\n\n${eventName}\nDatum: ${formattedDate}\nOrt: ${eventLocation}\n\nBitte melden Sie sich in der App an um die Einladung anzunehmen.\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007AFF;">Neue Veranstaltungseinladung!</h2>
          <p>Hallo ${firstName},</p>
          <p>Sie sind eingeladen bei folgender Veranstaltung mitzuarbeiten:</p>
          <div style="background-color: #F5F7FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">${eventName}</h3>
            <p><strong>📅 Datum:</strong> ${formattedDate}</p>
            <p><strong>📍 Ort:</strong> ${eventLocation}</p>
          </div>
          <p>Bitte melden Sie sich in der App an um die Einladung anzunehmen oder abzulehnen.</p>
          <p style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/staff/invitations" style="background-color: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Zur App</a>
          </p>
          <hr style="border: none; border-top: 1px solid #E5E5EA; margin: 30px 0;">
          <p>Mit freundlichen Grüßen<br><strong>Das Event Staff Team</strong></p>
        </div>`;
      
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
    console.error('[SendGridService] Error in sendEventInvitationEmail:', error);
    throw error;
  }
};

// Schichteinteilung E-Mail
const sendShiftAssignmentEmail = async (email, firstName, eventName, status) => {
  console.log('[SendGridService] Sending shift assignment email to:', email);
  
  try {
    const template = await getEmailTemplate('shift_assignment');
    
    const statusText = status === 'final' ? 'endgültig festgelegt' : 'vorläufig geplant';
    const statusColor = status === 'final' ? '#34C759' : '#FF9500';
    
    if (!template) {
      const subject = `Schichteinteilung: ${eventName}`;
      const text = `Hallo ${firstName},\n\nIhre Schichteinteilung für ${eventName} wurde ${statusText}.\n\nBitte prüfen Sie die Details in der App.\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007AFF;">Schichteinteilung aktualisiert</h2>
          <p>Hallo ${firstName},</p>
          <p>Ihre Schichteinteilung für <strong>${eventName}</strong> wurde:</p>
          <p style="text-align: center; margin: 30px 0;">
            <span style="background-color: ${statusColor}; color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold;">${statusText.toUpperCase()}</span>
          </p>
          <p>Bitte prüfen Sie die Details in der App und bestätigen Sie Ihre Teilnahme.</p>
          <p style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/staff/shifts" style="background-color: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Schichten anzeigen</a>
          </p>
          <hr style="border: none; border-top: 1px solid #E5E5EA; margin: 30px 0;">
          <p>Mit freundlichen Grüßen<br><strong>Das Event Staff Team</strong></p>
        </div>`;
      
      return await sendEmail(email, subject, text, html);
    }
    
    const variables = {
      firstName,
      eventName,
      status: statusText
    };
    
    const subject = replaceTemplateVariables(template.subject, variables);
    const textBody = replaceTemplateVariables(template.body_text, variables);
    const htmlBody = replaceTemplateVariables(template.body_html, variables);
    
    return await sendEmail(email, subject, textBody, htmlBody);
  } catch (error) {
    console.error('[SendGridService] Error in sendShiftAssignmentEmail:', error);
    throw error;
  }
};

// Neue Nachricht Benachrichtigung
const sendNewMessageNotification = async (email, firstName, messageSubject) => {
  console.log('[SendGridService] Sending new message notification to:', email);
  
  try {
    const template = await getEmailTemplate('new_message');
    
    if (!template) {
      const subject = 'Neue Nachricht in der Event Staff App';
      const text = `Hallo ${firstName},\n\nSie haben eine neue Nachricht erhalten:\n\nBetreff: ${messageSubject}\n\nBitte melden Sie sich in der App an um die Nachricht zu lesen.\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007AFF;">Neue Nachricht erhalten</h2>
          <p>Hallo ${firstName},</p>
          <p>Sie haben eine neue Nachricht erhalten:</p>
          <div style="background-color: #F5F7FA; padding: 15px; border-left: 4px solid #007AFF; margin: 20px 0;">
            <p style="margin: 0;"><strong>Betreff:</strong> ${messageSubject}</p>
          </div>
          <p>Bitte melden Sie sich in der App an um die vollständige Nachricht zu lesen.</p>
          <p style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/staff/messages" style="background-color: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Nachricht lesen</a>
          </p>
          <hr style="border: none; border-top: 1px solid #E5E5EA; margin: 30px 0;">
          <p>Mit freundlichen Grüßen<br><strong>Das Event Staff Team</strong></p>
        </div>`;
      
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
    console.error('[SendGridService] Error in sendNewMessageNotification:', error);
    throw error;
  }
};

// Passwort zurücksetzen E-Mail
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  console.log('[SendGridService] Sending password reset email to:', email);
  
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Passwort zurücksetzen - Event Staff App';
    const text = `Hallo ${firstName},\n\nSie haben angefordert, Ihr Passwort zurückzusetzen.\n\nBitte klicken Sie auf folgenden Link:\n${resetLink}\n\nDer Link ist 24 Stunden gültig.\n\nFalls Sie diese Anfrage nicht gestellt haben, ignorieren Sie bitte diese E-Mail.\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007AFF;">Passwort zurücksetzen</h2>
        <p>Hallo ${firstName},</p>
        <p>Sie haben angefordert, Ihr Passwort zurückzusetzen.</p>
        <p>Bitte klicken Sie auf folgenden Link:</p>
        <p style="margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Passwort zurücksetzen</a>
        </p>
        <p style="color: #666; font-size: 14px;">Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link:<br>${resetLink}</p>
        <div style="background-color: #FFF3CD; border: 1px solid #FFEAA7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>⚠️ Wichtig:</strong> Der Link ist nur 24 Stunden gültig.</p>
        </div>
        <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie bitte diese E-Mail.</p>
        <hr style="border: none; border-top: 1px solid #E5E5EA; margin: 30px 0;">
        <p>Mit freundlichen Grüßen<br><strong>Das Event Staff Team</strong></p>
      </div>`;
    
    return await sendEmail(email, subject, text, html);
  } catch (error) {
    console.error('[SendGridService] Error in sendPasswordResetEmail:', error);
    throw error;
  }
};

// Test E-Mail Konfiguration
const testEmailConfiguration = async () => {
  console.log('[SendGridService] Testing email configuration...');
  
  try {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY nicht in .env gefunden');
    }
    
    if (!process.env.SENDGRID_FROM_EMAIL) {
      throw new Error('SENDGRID_FROM_EMAIL nicht in .env gefunden');
    }
    
    // Sende Test-E-Mail
    const testEmail = process.env.SENDGRID_TEST_EMAIL || process.env.SENDGRID_FROM_EMAIL;
    const testResult = await sendEmail(
      testEmail,
      'Test E-Mail - Event Staff App',
      'Dies ist eine Test-E-Mail von SendGrid. Die E-Mail-Konfiguration funktioniert korrekt.',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007AFF;">SendGrid Test erfolgreich!</h2>
        <p>Dies ist eine <strong>Test-E-Mail</strong> von SendGrid.</p>
        <p>Die E-Mail-Konfiguration funktioniert korrekt.</p>
        <div style="background-color: #D4EDDA; border: 1px solid #C3E6CB; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #155724;">✅ SendGrid ist einsatzbereit!</p>
        </div>
        <p style="color: #666; font-size: 14px;">
          Gesendet von: ${process.env.SENDGRID_FROM_EMAIL}<br>
          SendGrid Account verifiziert
        </p>
      </div>`
    );
    
    if (testResult.success) {
      return {
        success: true,
        message: 'SendGrid E-Mail-Konfiguration erfolgreich getestet',
        result: testResult
      };
    } else {
      return {
        success: false,
        message: 'SendGrid E-Mail-Konfiguration fehlgeschlagen',
        error: testResult.error,
        details: testResult.details
      };
    }
  } catch (error) {
    console.error('[SendGridService] Configuration test failed:', error);
    return {
      success: false,
      message: 'SendGrid E-Mail-Konfiguration fehlgeschlagen',
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
    console.error('[SendGridService] Error loading email templates:', error);
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
    console.error('[SendGridService] Error updating email template:', error);
    throw error;
  }
};

// Debug-Funktion
const debugModule = () => {
  console.log('[SendGridService] Module debug info:');
  console.log('- SendGrid SDK loaded:', !!sgMail);
  console.log('- API Key set:', !!process.env.SENDGRID_API_KEY);
  console.log('- From Email:', process.env.SENDGRID_FROM_EMAIL || 'NOT SET');
  console.log('- From Name:', process.env.SENDGRID_FROM_NAME || 'NOT SET');
  console.log('- Reply To:', process.env.SENDGRID_REPLY_TO || 'NOT SET');
};

// Beim Laden des Moduls
console.log('[SendGridService] Module loaded');
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
