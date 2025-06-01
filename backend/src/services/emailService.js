const nodemailer = require('nodemailer');
const db = require('../config/database');

// Mock Email Service für Entwicklung
console.log('📧 Email Service im Mock-Modus - Keine echten E-Mails werden versendet');

// Mock Transporter
const transporter = {
  sendMail: async (mailOptions) => {
    console.log('📨 Mock Email würde gesendet:', {
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    return { messageId: 'mock-message-id' };
  }
};

// Get email template
const getEmailTemplate = async (templateName) => {
  // Mock Templates
  const mockTemplates = {
    application_accepted: {
      subject: 'Ihre Bewerbung wurde angenommen',
      body: 'Herzlichen Glückwunsch! Ihre Bewerbung wurde angenommen.'
    },
    application_rejected: {
      subject: 'Ihre Bewerbung',
      body: 'Vielen Dank für Ihre Bewerbung. Leider können wir Sie nicht berücksichtigen.'
    }
  };
  
  return mockTemplates[templateName] || { subject: 'Test', body: 'Test Email' };
};

// Replace template variables
const replaceVariables = (text, variables) => {
  let result = text;
  
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  
  return result;
};

// Send email
const sendEmail = async (to, subject, html, text = null) => {
  try {
    const mailOptions = {
      from: '"Event Staff App" <noreply@example.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Mock E-Mail gesendet:', info.messageId);
    return info;
  } catch (error) {
    console.error('Fehler beim E-Mail-Versand:', error);
    throw error;
  }
};

// Send template email
const sendTemplateEmail = async (to, templateName, variables = {}) => {
  try {
    const template = await getEmailTemplate(templateName);
    
    const subject = replaceVariables(template.subject, variables);
    const body = replaceVariables(template.body, variables);
    
    const html = body.replace(/\n/g, '<br>');
    
    return await sendEmail(to, subject, html, body);
  } catch (error) {
    console.error('Fehler beim Template-E-Mail-Versand:', error);
    throw error;
  }
};

// Specific email functions
const sendApplicationAcceptedEmail = async (email, firstName, lastName, resetToken) => {
  console.log(`📧 Mock: Annahme-Email an ${email} für ${firstName} ${lastName}`);
  return { success: true };
};

const sendApplicationRejectedEmail = async (email, firstName, lastName) => {
  console.log(`📧 Mock: Ablehnungs-Email an ${email} für ${firstName} ${lastName}`);
  return { success: true };
};

const sendEventInvitationEmail = async (email, firstName, eventName, eventDate, eventLocation, eventDescription) => {
  console.log(`📧 Mock: Event-Einladung an ${email} für ${eventName}`);
  return { success: true };
};

const sendShiftAssignmentEmail = async (email, firstName, eventName, shiftDetails, assignmentType, confirmationDeadline = null) => {
  console.log(`📧 Mock: Schicht-Zuteilung an ${email} für ${eventName}`);
  return { success: true };
};

const sendPasswordResetEmail = async (email, resetToken) => {
  console.log(`📧 Mock: Passwort-Reset an ${email}`);
  return { success: true };
};

const sendBulkEmails = async (recipients, templateName, commonVariables = {}) => {
  console.log(`📧 Mock: Bulk-Email an ${recipients.length} Empfänger`);
  return recipients.map(r => ({ email: r.email, success: true }));
};

module.exports = {
  sendEmail,
  sendTemplateEmail,
  sendApplicationAcceptedEmail,
  sendApplicationRejectedEmail,
  sendEventInvitationEmail,
  sendShiftAssignmentEmail,
  sendPasswordResetEmail,
  sendBulkEmails
};
