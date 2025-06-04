const { validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg
    }));
    
    console.log('Validation errors:', errorMessages);
    console.log('Request body:', req.body);
    
    return res.status(400).json({
      message: 'Validierungsfehler',
      errors: errorMessages
    });
  }
  
  next();
};

// Custom validators
const isValidGermanPhoneNumber = (value) => {
  if (!value) return true; // Optional field
  
  // Remove spaces and dashes
  const cleaned = value.replace(/[\s-]/g, '');
  
  // Check German phone number formats
  const patterns = [
    /^(\+49|0049|0)[1-9]\d{1,14}$/, // Standard format
    /^01[567]\d{7,9}$/ // Mobile numbers
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
};

const isValidPostalCode = (value) => {
  if (!value) return true; // Optional field
  
  // German postal code: 5 digits
  return /^\d{5}$/.test(value);
};

const isValidBirthDate = (value) => {
  if (!value) return true; // Optional field
  
  const date = new Date(value);
  const now = new Date();
  const minAge = 16; // Minimum age
  const maxAge = 100; // Maximum age
  
  const ageInYears = (now - date) / (365.25 * 24 * 60 * 60 * 1000);
  
  return ageInYears >= minAge && ageInYears <= maxAge;
};

const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  
  // Remove leading/trailing whitespace
  value = value.trim();
  
  // Remove multiple spaces
  value = value.replace(/\s+/g, ' ');
  
  return value;
};

// Custom validator for optional integer fields that accepts null
const isOptionalInt = (value) => {
  if (value === null || value === undefined || value === '') return true;
  const num = parseInt(value);
  return !isNaN(num) && num > 0;
};

module.exports = {
  handleValidationErrors,
  isValidGermanPhoneNumber,
  isValidPostalCode,
  isValidBirthDate,
  sanitizeInput,
  isOptionalInt
};


