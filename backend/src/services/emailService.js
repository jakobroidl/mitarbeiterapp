// backend/src/services/emailService.js
const nodemailer = require('nodemailer');
const db = require('../config/database');

// E-Mail Transporter erstellen
const createTransporter = () => {
  console.log('Creating email transporter...');
  console.log('Email config:', {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    from: process.env.EMAIL_FROM,
    passLength: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0
  });

  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      // Für Gmail notwendig
      rejectUnauthorized: true,
      minVersion: "TLSv1.2"
    }
  });

  // Verifiziere die Konfiguration
  transporter.verify(function(error, success) {
    if (error) {
      console.error('E-Mail Transporter Verification Failed:', error);
    } else {
      console.log('E-Mail Server is ready to send messages');
    }
  });

  return transporter;
};

// Template aus Datenbank laden
const getEmailTemplate = async (templateName) => {
  try {
    const [templates] = await db.execute(
      'SELECT * FROM email_templates WHERE name = ? AND is_active = 1',
      [templateName]
    );
    
    if (templates.length === 0) {
      console.error(`Email template '${templateName}' not found`);
      return null;
    }
    
    return templates[0];
  } catch (error) {
    console.error('Error loading email template:', error);
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

// Generische E-Mail senden Funktion
const sendEmail = async (to, subject, textBody, htmlBody) => {
  const transporter = createTransporter();
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Event Staff App" <noreply@eventstaff.com>',
      to,
      subject,
      text: textBody,
      html: htmlBody
    };
    
    console.log('Sending email to:', to);
    console.log('Subject:', subject);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Bewerbung angenommen E-Mail
const sendApplicationAcceptedEmail = async (email, firstName, lastName, resetToken) => {
  console.log('Sending application accepted email to:', email);
  
  try {
    const template = await getEmailTemplate('application_accepted');
    if (!template) {
      // Fallback wenn Template nicht gefunden
      const resetLink = `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`;
      const subject = 'Ihre Bewerbung wurde angenommen';
      const text = `Hallo ${firstName} ${lastName},\n\nIhre Bewerbung wurde angenommen. Bitte setzen Sie Ihr Passwort über folgenden Link: ${resetLink}\n\nMit freundlichen Grüßen\nDas Event Staff Team`;
      const html = `<p>Hallo ${firstName} ${lastName},</p><p>Ihre Bewerbung wurde angenommen. Bitte setzen Sie Ihr Passwort über folgenden Link:</p><p><a href="${resetLink}">Passwort festlegen</a></p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>`;
      
      return await sendEmail(email, subject, text, html);
    }
    
    const variables = {
      firstName,
      lastName,
      resetLink: `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`
    };
    
    const subject = replaceTemplateVariables(template.subject, variables);
    const textBody = replaceTemplateVariables(template.body_text, variables);
    const htmlBody = replaceTemplateVariables(template.body_html, variables);
    
    return await sendEmail(email, subject, textBody, htmlBody);
  } catch (error) {
    console.error('Error in sendApplicationAcceptedEmail:', error);
    throw error;
  }
};

// Bewerbung abgelehnt E-Mail
const sendApplicationRejectedEmail = async (email, firstName, lastName) => {
  console.log('Sending application rejected email to:', email);
  
  try {
    const template = await getEmailTemplate('application_rejected');
    if (!template) {
      // Fallback
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
    console.error('Error in sendApplicationRejectedEmail:', error);
    throw error;
  }
};

// Event-Einladung E-Mail
const sendEventInvitationEmail = async (email, firstName, eventName, eventDate, eventLocation) => {
  console.log('Sending event invitation email to:', email);
  
  try {
    const template = await getEmailTemplate('event_invitation');
    if (!template) {
      // Fallback
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
    console.error('Error in sendEventInvitationEmail:', error);
    throw error;
  }
};

// Schichteinteilung E-Mail
const sendShiftAssignmentEmail = async (email, firstName, eventName, status) => {
  console.log('Sending shift assignment email to:', email);
  
  try {
    const template = await getEmailTemplate('shift_assignment');
    if (!template) {
      // Fallback
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
    console.error('Error in sendShiftAssignmentEmail:', error);
    throw error;
  }
};

// Neue Nachricht Benachrichtigung
const sendNewMessageNotification = async (email, firstName, messageSubject) => {
  console.log('Sending new message notification to:', email);
  
  try {
    const template = await getEmailTemplate('new_message');
    if (!template) {
      // Fallback
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
    console.error('Error in sendNewMessageNotification:', error);
    throw error;
  }
};

// Passwort zurücksetzen E-Mail
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  console.log('Sending password reset email to:', email);
  
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
    console.error('Error in sendPasswordResetEmail:', error);
    throw error;
  }
};

// Test E-Mail Konfiguration
const testEmailConfiguration = async () => {
  console.log('Testing email configuration...');
  
  try {
    const transporter = createTransporter();
    
    // Verifiziere Transporter
    await transporter.verify();
    console.log('Email transporter verified successfully');
    
    // Sende Test-E-Mail an Admin
    const adminEmail = process.env.EMAIL_USER || process.env.ADMIN_EMAIL;
    const testResult = await sendEmail(
      adminEmail,
      'Test E-Mail - Event Staff App',
      'Dies ist eine Test-E-Mail. Die E-Mail-Konfiguration funktioniert korrekt.',
      '<p>Dies ist eine <strong>Test-E-Mail</strong>.</p><p>Die E-Mail-Konfiguration funktioniert korrekt.</p>'
    );
    
    return {
      success: true,
      message: 'E-Mail-Konfiguration erfolgreich getestet',
      result: testResult
    };
  } catch (error) {
    console.error('Email configuration test failed:', error);
    return {
      success: false,
      message: 'E-Mail-Konfiguration fehlgeschlagen',
      error: error.message
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
    console.error('Error loading email templates:', error);
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
    console.error('Error updating email template:', error);
    throw error;
  }
};

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
  updateEmailTemplate
};


