// frontend/src/config/config.js

// This file contains runtime configuration for the frontend app
const config = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  
  // Company Information
  COMPANY_NAME: process.env.REACT_APP_COMPANY_NAME || 'Event Staff App',
  
  // Kiosk Configuration
  KIOSK_TOKEN: process.env.REACT_APP_KIOSK_TOKEN || 'default-kiosk-token',
  
  // Feature Flags
  ENABLE_EMAIL_NOTIFICATIONS: true,
  ENABLE_KIOSK_MODE: true,
  
  // Validation Settings
  MIN_PERSONAL_CODE_LENGTH: 3,
  MAX_PERSONAL_CODE_LENGTH: 20,
  MIN_PASSWORD_LENGTH: 8,
  
  // Time Settings
  AUTO_LOGOUT_MINUTES: 60,
  KIOSK_RESET_SECONDS: 5,
  
  // File Upload Settings
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

// Helper function to get kiosk token from localStorage or config
export const getKioskToken = () => {
  return localStorage.getItem('kiosk_token') || config.KIOSK_TOKEN;
};

// Helper function to set kiosk token in localStorage
export const setKioskToken = (token) => {
  if (token) {
    localStorage.setItem('kiosk_token', token);
  } else {
    localStorage.removeItem('kiosk_token');
  }
};

export default config;
