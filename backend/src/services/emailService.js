// backend/src/services/emailService.js
const nodemailer = require('nodemailer');
const db = require('../config/database');

// E-Mail Transporter erstellen
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Template-Variablen ersetzen
const replaceTemplateVariables = (template, variables) => {
  let result = template;
  
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  
  return result;
};

// Template aus Datenbank holen
const getEmailTemplate = async (templateName) => {
  const [templates] = await db.execute(
    'SELECT * FROM email_templates WHERE name = ? AND is_active = 1',
    [templateName]
  );
  
  if (templates.length === 0) {
    throw new Error(`E-Mail Template '${templateName}' nicht gefunden`);
  }
  
  return templates[0];
};

// Basis E-Mail senden
const sendEmail = async (to, subject, text, html) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Event Staff App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('E-Mail gesendet:', info.messageId, 'an:', to);
    return info;
  } catch (error) {
    console.error('Fehler beim E-Mail-Versand:', error);
    throw error;
  }
};

// Template-basierte E-Mail senden
const sendTemplateEmail = async (to, templateName, variables) => {
  try {
    const template = await getEmailTemplate(templateName);
    
    // Ersetze Variablen in Subject, Text und HTML
    const subject = replaceTemplateVariables(template.subject, variables);
    const text = replaceTemplateVariables(template.body_text, variables);
    const html = replaceTemplateVariables(template.body_html, variables);
    
    return await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error(`Fehler beim Senden der Template-E-Mail '${templateName}':`, error);
    throw error;
  }
};

// Bewerbung angenommen
const sendApplicationAcceptedEmail = async (email, firstName, lastName, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`;
  
  return await sendTemplateEmail(email, 'application_accepted', {
    firstName,
    lastName,
    resetLink
  });
};

// Bewerbung abgelehnt
const sendApplicationRejectedEmail = async (email, firstName, lastName) => {
  return await sendTemplateEmail(email, 'application_rejected', {
    firstName,
    lastName
  });
};

// Veranstaltungseinladung
const sendEventInvitationEmail = async (email, firstName, eventName, eventDate, eventLocation) => {
  return await sendTemplateEmail(email, 'event_invitation', {
    firstName,
    eventName,
    eventDate: new Date(eventDate).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    eventLocation
  });
};

// Schichteinteilung
const sendShiftAssignmentEmail = async (email, firstName, eventName, status) => {
  const statusText = {
    'preliminary': 'vorläufig erstellt',
    'final': 'finalisiert',
    'confirmed': 'bestätigt'
  };
  
  return await sendTemplateEmail(email, 'shift_assignment', {
    firstName,
    eventName,
    status: statusText[status] || status
  });
};

// Neue Nachricht
const sendNewMessageNotification = async (email, firstName, subject) => {
  return await sendTemplateEmail(email, 'new_message', {
    firstName,
    subject
  });
};

// Passwort zurücksetzen
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  try {
    // Erstelle Template falls nicht vorhanden
    const template = await getEmailTemplate('password_reset').catch(async () => {
      // Fallback Template
      return {
        subject: 'Passwort zurücksetzen - Event Staff App',
        body_text: `Hallo {{firstName}},\n\nSie haben eine Passwort-Zurücksetzung angefordert. Klicken Sie auf den folgenden Link:\n\n{{resetLink}}\n\nDer Link ist 24 Stunden gültig.\n\nFalls Sie keine Zurücksetzung angefordert haben, ignorieren Sie diese E-Mail.\n\nMit freundlichen Grüßen\nDas Event Staff Team`,
        body_html: `<p>Hallo {{firstName}},</p><p>Sie haben eine Passwort-Zurücksetzung angefordert. Klicken Sie auf den folgenden Link:</p><p><a href="{{resetLink}}">Passwort zurücksetzen</a></p><p>Der Link ist 24 Stunden gültig.</p><p>Falls Sie keine Zurücksetzung angefordert haben, ignorieren Sie diese E-Mail.</p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>`
      };
    });
    
    const subject = replaceTemplateVariables(template.subject, { firstName });
    const text = replaceTemplateVariables(template.body_text, { firstName, resetLink });
    const html = replaceTemplateVariables(template.body_html, { firstName, resetLink });
    
    return await sendEmail(email, subject, text, html);
  } catch (error) {
    console.error('Fehler beim Senden der Passwort-Reset E-Mail:', error);
    throw error;
  }
};

// Massenmail senden (für globale Nachrichten)
const sendBulkEmail = async (recipients, subject, text, html) => {
  const transporter = createTransporter();
  const results = [];
  
  // Sende E-Mails in Batches von 10
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const promises = batch.map(recipient => {
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"Event Staff App" <${process.env.EMAIL_USER}>`,
        to: recipient.email,
        subject: replaceTemplateVariables(subject, {
          firstName: recipient.firstName,
          lastName: recipient.lastName
        }),
        text: replaceTemplateVariables(text, {
          firstName: recipient.firstName,
          lastName: recipient.lastName
        }),
        html: replaceTemplateVariables(html, {
          firstName: recipient.firstName,
          lastName: recipient.lastName
        })
      };
      
      return transporter.sendMail(mailOptions)
        .then(info => ({ success: true, email: recipient.email, messageId: info.messageId }))
        .catch(error => ({ success: false, email: recipient.email, error: error.message }));
    });
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // Kurze Pause zwischen Batches
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
};

// Test E-Mail Konfiguration
const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ E-Mail Konfiguration erfolgreich getestet');
    return { success: true, message: 'E-Mail Konfiguration funktioniert' };
  } catch (error) {
    console.error('❌ E-Mail Konfiguration fehlgeschlagen:', error);
    return { success: false, message: error.message };
  }
};

// Template Management
const updateEmailTemplate = async (templateName, updates) => {
  const { subject, bodyText, bodyHtml } = updates;
  
  const [result] = await db.execute(
    `UPDATE email_templates 
     SET subject = COALESCE(?, subject),
         body_text = COALESCE(?, body_text),
         body_html = COALESCE(?, body_html),
         updated_at = NOW()
     WHERE name = ?`,
    [subject, bodyText, bodyHtml, templateName]
  );
  
  return result.affectedRows > 0;
};

const getEmailTemplates = async () => {
  const [templates] = await db.execute(
    'SELECT * FROM email_templates ORDER BY name'
  );
  
  return templates;
};

module.exports = {
  sendEmail,
  sendTemplateEmail,
  sendApplicationAcceptedEmail,
  sendApplicationRejectedEmail,
  sendEventInvitationEmail,
  sendShiftAssignmentEmail,
  sendNewMessageNotification,
  sendPasswordResetEmail,
  sendBulkEmail,
  testEmailConfiguration,
  updateEmailTemplate,
  getEmailTemplates
};
