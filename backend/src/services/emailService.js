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



