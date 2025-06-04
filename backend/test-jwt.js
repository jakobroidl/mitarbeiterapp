// backend/test-jwt.js
const jwt = require('jsonwebtoken');
const { generateToken, validateToken } = require('./src/middleware/auth');

console.log('=== JWT Token Test ===');
console.log('');

// Test environment variables
console.log('JWT_SECRET from env:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('');

// Test token generation
const testUserId = 1;
console.log('Generating token for user ID:', testUserId);

try {
  const token = generateToken(testUserId);
  console.log('Token generated successfully!');
  console.log('Token:', token);
  console.log('');
  
  // Test token validation
  console.log('Validating token...');
  const validation = validateToken(token);
  
  if (validation.valid) {
    console.log('Token is valid!');
    console.log('Decoded payload:', validation.decoded);
  } else {
    console.log('Token is invalid!');
    console.log('Error:', validation.error);
  }
  
  // Manual decode to see structure
  console.log('');
  console.log('Token structure:');
  const parts = token.split('.');
  console.log('Header:', Buffer.from(parts[0], 'base64').toString());
  console.log('Payload:', Buffer.from(parts[1], 'base64').toString());
  
} catch (error) {
  console.error('Error:', error.message);
}

console.log('');
console.log('=== Test Complete ===');



