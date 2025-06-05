// backend/debug-email.js
// Temporäres Debug-Script um das nodemailer Problem zu diagnostizieren

console.log('=== DEBUG EMAIL MODULE ===');
console.log('Current directory:', __dirname);
console.log('Process directory:', process.cwd());

// Test 1: Prüfe ob nodemailer existiert
try {
  const fs = require('fs');
  const path = require('path');
  
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  const nodemailerPath = path.join(nodeModulesPath, 'nodemailer');
  
  console.log('\nChecking paths:');
  console.log('node_modules exists:', fs.existsSync(nodeModulesPath));
  console.log('nodemailer exists:', fs.existsSync(nodemailerPath));
  
  if (fs.existsSync(nodemailerPath)) {
    const packageJson = require(path.join(nodemailerPath, 'package.json'));
    console.log('Nodemailer version:', packageJson.version);
  }
} catch (error) {
  console.error('Error checking paths:', error.message);
}

// Test 2: Versuche nodemailer zu laden
console.log('\n--- Testing nodemailer import ---');
try {
  const nodemailer = require('nodemailer');
  console.log('✅ Nodemailer loaded successfully');
  console.log('Nodemailer type:', typeof nodemailer);
  console.log('createTransporter exists:', typeof nodemailer.createTransporter === 'function');
  
  // Test 3: Versuche einen Transporter zu erstellen
  console.log('\n--- Testing transporter creation ---');
  try {
    const transporter = nodemailer.createTransporter({
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test',
        pass: 'test'
      }
    });
    console.log('✅ Transporter created successfully');
    console.log('Transporter type:', typeof transporter);
    console.log('sendMail exists:', typeof transporter.sendMail === 'function');
  } catch (error) {
    console.error('❌ Transporter creation failed:', error.message);
  }
  
} catch (error) {
  console.error('❌ Failed to load nodemailer:', error.message);
  console.error('Error type:', error.constructor.name);
  console.error('Full error:', error);
}

// Test 4: Teste dotenv
console.log('\n--- Testing dotenv ---');
try {
  require('dotenv').config();
  console.log('✅ Dotenv loaded');
  console.log('Email config from .env:');
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
  console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
} catch (error) {
  console.error('❌ Dotenv error:', error.message);
}

console.log('\n=== END DEBUG ===');
