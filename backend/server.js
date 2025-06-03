// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database connection
const db = require('./src/config/database');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const staffRoutes = require('./src/routes/staffRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const shiftRoutes = require('./src/routes/shiftRoutes');
const timeclockRoutes = require('./src/routes/timeclockRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');

// Import middleware
const { handleUploadError } = require('./src/middleware/upload');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Für Bildanzeige
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Zu viele Anfragen von dieser IP, bitte versuchen Sie es später erneut.'
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// More restrictive rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true,
  message: 'Zu viele Login-Versuche, bitte versuchen Sie es später erneut.'
});

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api', dashboardRoutes); // Dashboard routes have their own prefixes
app.use('/api/staff', staffRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/timeclock', timeclockRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Endpoint nicht gefunden',
    path: req.originalUrl 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      message: 'Datei ist zu groß. Maximale Größe: 5MB' 
    });
  }
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      message: 'CORS-Fehler: Origin nicht erlaubt' 
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    message: err.message || 'Ein Fehler ist aufgetreten',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize server
const startServer = async () => {
  try {
    // Test database connection
    await db.getConnection();
    console.log('✅ Datenbankverbindung erfolgreich');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server läuft auf Port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📧 Email Service: ${process.env.EMAIL_HOST ? 'Konfiguriert' : 'Nicht konfiguriert'}`);
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Starten des Servers:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM empfangen, fahre Server herunter...');
  
  try {
    await db.end();
    console.log('✅ Datenbankverbindungen geschlossen');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler beim Herunterfahren:', error);
    process.exit(1);
  }
});

// Start the server
startServer();
