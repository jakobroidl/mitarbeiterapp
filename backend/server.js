require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const timeStampRoutes = require('./src/routes/timeStampRoutes');
const knowledgeRoutes = require('./src/routes/knowledgeRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const qualificationRoutes = require('./src/routes/qualificationRoutes');
const emailTemplateRoutes = require('./src/routes/emailTemplateRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const shiftRoutes = require('./src/routes/shiftRoutes');
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/timestamps', timeStampRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/qualifications', qualificationRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', shiftRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Interner Serverfehler',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route nicht gefunden' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});
