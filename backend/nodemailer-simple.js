// backend/test-nodemailer-simple.js
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

try {
  const nodemailer = require('nodemailer');
  console.log('✅ Nodemailer loaded successfully');
  console.log('Nodemailer version:', nodemailer.version);
  console.log('createTransporter exists?', typeof nodemailer.createTransporter);
  
  // Teste createTransporter
  const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'test'
    }
  });
  
  console.log('✅ Transporter created successfully');
  console.log('Transporter type:', typeof transporter);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}

// Prüfe node_modules
const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.join(process.cwd(), 'node_modules');
const nodemailerPath = path.join(nodeModulesPath, 'nodemailer');

console.log('\n--- File System Check ---');
console.log('node_modules exists?', fs.existsSync(nodeModulesPath));
console.log('nodemailer folder exists?', fs.existsSync(nodemailerPath));

if (fs.existsSync(nodemailerPath)) {
  const packageJsonPath = path.join(nodemailerPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log('Nodemailer version in node_modules:', pkg.version);
  }
}
