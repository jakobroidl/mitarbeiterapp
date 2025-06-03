const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendEmail = async (to, subject, text, html) => {
  const mailOptions = {
    from: `"Event Staff App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('E-Mail gesendet:', info.messageId);
  } catch (error) {
    console.error('Fehler beim E-Mail-Versand:', error);
    throw error;
  }
};

// ...

const sendApplicationAcceptedEmail = async (email, firstName, lastName, resetToken) => {
  const subject = 'Ihre Bewerbung wurde angenommen';
  const text = `Hallo ${firstName} ${lastName},\n\nIhre Bewerbung war erfolgreich. Klicken Sie auf den folgenden Link, um Ihr Passwort festzulegen:\n\n${process.env.FRONTEND_URL}/set-password?token=${resetToken}\n\nDas Event-Staff-Team`;
  const html = `<p>Hallo ${firstName} ${lastName},</p><p>Ihre Bewerbung war erfolgreich. Klicken Sie auf den folgenden Link, um Ihr Passwort festzulegen:</p><p><a href="${process.env.FRONTEND_URL}/set-password?token=${resetToken}">${process.env.FRONTEND_URL}/set-password?token=${resetToken}</a></p><p>Das Event-Staff-Team</p>`;

  await sendEmail(email, subject, text, html);
};

const sendEventInvitationEmail = async (email, firstName, eventName, eventDate, eventLocation, eventDescription) => {
  const subject = `Einladung: ${eventName}`;
  const text = `Hallo ${firstName},\n\nSie sind herzlich eingeladen, bei folgender Veranstaltung mitzuarbeiten:\n\n${eventName}\nDatum: ${eventDate}\nOrt: ${eventLocation}\n\n${eventDescription}\n\nBitte melden Sie sich in der App an, um die Einladung anzunehmen oder abzulehnen.\n\nDas Event-Staff-Team`;
  const html = `<p>Hallo ${firstName},</p><p>Sie sind herzlich eingeladen, bei folgender Veranstaltung mitzuarbeiten:</p><p><strong>${eventName}</strong><br>Datum: ${eventDate}<br>Ort: ${eventLocation}</p><p>${eventDescription}</p><p>Bitte melden Sie sich in der App an, um die Einladung anzunehmen oder abzulehnen.</p><p>Das Event-Staff-Team</p>`;

  await sendEmail(email, subject, text, html);  
};

// Weitere E-Mail-Funktionen...

module.exports = {
  sendEmail,
  sendApplicationAcceptedEmail,
  sendEventInvitationEmail,
  // ...
};
