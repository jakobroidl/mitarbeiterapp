// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

// JWT Secret aus Umgebungsvariablen oder Fallback
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    console.log('=== AUTH MIDDLEWARE ===');
    console.log('Headers:', req.headers);
    
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    console.log('Auth header:', authHeader);
    console.log('Extracted token:', token ? 'Token found' : 'No token');

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ 
        message: 'Kein Token vorhanden' 
      });
    }

    try {
      // Verify token
      console.log('Verifying token...');
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token decoded:', decoded);
      
      // Get user from database
      console.log('Fetching user from database...');
      const [users] = await db.execute(
        'SELECT id, email, role, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );

      console.log('Users found:', users.length);

      if (users.length === 0) {
        console.log('User not found in database');
        return res.status(401).json({ 
          message: 'Benutzer nicht gefunden' 
        });
      }

      const user = users[0];
      console.log('User found:', {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active
      });

      if (!user.is_active) {
        console.log('User is deactivated');
        return res.status(401).json({ 
          message: 'Benutzer ist deaktiviert' 
        });
      }

      // Attach user to request object
      req.user = user;
      console.log('User attached to request');
      console.log('=== AUTH SUCCESSFUL ===');
      
      next();
    } catch (tokenError) {
      console.error('Token verification error:', tokenError.message);
      
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token abgelaufen' 
        });
      } else if (tokenError.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          message: 'Token ungültig' 
        });
      }
      
      throw tokenError;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      message: 'Authentifizierungsfehler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Check if user has required role(s)
const requireRole = (roles) => {
  return (req, res, next) => {
    console.log('=== ROLE CHECK ===');
    console.log('Required roles:', roles);
    console.log('User:', req.user);
    
    if (!req.user) {
      console.log('No user in request');
      return res.status(401).json({ 
        message: 'Nicht authentifiziert' 
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    console.log('User role:', userRole);
    console.log('Allowed roles:', allowedRoles);
    console.log('Has permission:', allowedRoles.includes(userRole));

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Keine Berechtigung für diese Aktion' 
      });
    }

    console.log('=== ROLE CHECK PASSED ===');
    next();
  };
};

// Shortcut middlewares
const requireAdmin = requireRole('admin');
const requireStaff = requireRole(['staff', 'admin']);

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token, but that's okay for optional auth
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const [users] = await db.execute(
        'SELECT id, email, role, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length > 0 && users[0].is_active) {
        req.user = users[0];
      }
    } catch (error) {
      // Ignore token errors for optional auth
      console.log('Optional auth - token error ignored:', error.message);
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue anyway
  }
};

// Generate JWT token
const generateToken = (userId) => {
  if (!userId) {
    throw new Error('User ID is required to generate token');
  }

  console.log('Generating token for user ID:', userId);
  console.log('Using JWT_SECRET:', JWT_SECRET ? 'Secret is set' : 'WARNING: Using default secret!');
  
  const token = jwt.sign(
    { userId },
    JWT_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'event-staff-app',
      audience: 'event-staff-users'
    }
  );
  
  console.log('Token generated successfully');
  return token;
};

// Generate reset token (for password reset)
const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  console.log('Reset token generated');
  return token;
};

// Validate JWT token (helper function)
const validateToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Get user from token (helper function)
const getUserFromToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const [users] = await db.execute(
      `SELECT 
        u.id, u.email, u.role, u.is_active,
        sp.id as staff_id, sp.first_name, sp.last_name, 
        sp.personal_code, sp.profile_image
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.id = ?`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return null;
    }

    return users[0];
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
};

// Middleware to log all requests (for debugging)
const logRequests = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.user) {
    console.log('Authenticated user:', req.user.email);
  }
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireStaff,
  optionalAuth,
  generateToken,
  generateResetToken,
  validateToken,
  getUserFromToken,
  logRequests
};
