// backend/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { sendPasswordResetEmail } = require('../services/emailService');

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Helper function to generate reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Login
const login = async (req, res) => {
  try {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Request body:', req.body);
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;
    console.log('Email:', email);
    console.log('Password received:', password ? 'Yes' : 'No');

    // Get user with staff profile
    console.log('Searching for user in database...');
    const [users] = await db.execute(
      `SELECT 
        u.id, 
        u.email, 
        u.password, 
        u.role, 
        u.is_active,
        sp.id as staff_id, 
        sp.first_name, 
        sp.last_name, 
        sp.personal_code, 
        sp.profile_image
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.email = ?`,
      [email]
    );

    console.log('Query executed. Found users:', users.length);

    if (users.length === 0) {
      console.log('No user found with email:', email);
      return res.status(401).json({ 
        message: 'Ungültige Anmeldedaten' 
      });
    }

    const user = users[0];
    console.log('User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      has_password: !!user.password,
      password_length: user.password ? user.password.length : 0
    });

    // Check if user is active
    if (!user.is_active) {
      console.log('User is inactive');
      return res.status(401).json({ 
        message: 'Ihr Account wurde deaktiviert. Bitte kontaktieren Sie den Administrator.' 
      });
    }

    // Verify password
    console.log('Verifying password...');
    let isValidPassword = false;
    
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
      console.log('Password comparison result:', isValidPassword);
    } catch (bcryptError) {
      console.error('Bcrypt error:', bcryptError);
      return res.status(500).json({ 
        message: 'Fehler bei der Passwortprüfung' 
      });
    }

    if (!isValidPassword) {
      console.log('Invalid password');
      
      // Log failed login attempt
      try {
        await db.execute(
          `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent)
           VALUES (?, 'login_failed', 'auth', ?, ?, ?)`,
          [
            user.id,
            JSON.stringify({ email }),
            req.ip || 'unknown',
            req.get('user-agent') || 'unknown'
          ]
        );
      } catch (logError) {
        console.error('Error logging failed attempt:', logError);
      }

      return res.status(401).json({ 
        message: 'Ungültige Anmeldedaten' 
      });
    }

    console.log('Password is valid, generating token...');

    // Generate JWT token
    const token = generateToken(user.id);
    console.log('Token generated');

    // Update last login
    try {
      await db.execute(
        'UPDATE users SET updated_at = NOW() WHERE id = ?',
        [user.id]
      );
    } catch (updateError) {
      console.error('Error updating last login:', updateError);
    }

    // Log successful login
    try {
      await db.execute(
        `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent)
         VALUES (?, 'login_success', 'auth', ?, ?, ?)`,
        [
          user.id,
          JSON.stringify({ email }),
          req.ip || 'unknown',
          req.get('user-agent') || 'unknown'
        ]
      );
    } catch (logError) {
      console.error('Error logging successful login:', logError);
    }

    // Get additional information based on role
    let additionalData = {};
    
    if (user.staff_id && (user.role === 'staff' || user.role === 'admin')) {
      try {
        // Get unread messages count
        const [unreadMessages] = await db.execute(
          `SELECT COUNT(*) as count 
           FROM message_recipients mr
           JOIN messages m ON mr.message_id = m.id
           WHERE mr.recipient_id = ? AND mr.is_read = 0 AND mr.is_deleted = 0`,
          [user.id]
        );
        additionalData.unreadMessages = unreadMessages[0]?.count || 0;

        // Get upcoming events count
        const [upcomingEvents] = await db.execute(
          `SELECT COUNT(DISTINCT e.id) as count
           FROM events e
           JOIN event_invitations ei ON e.id = ei.event_id
           WHERE ei.staff_id = ? 
             AND ei.status = 'accepted'
             AND e.status = 'published'
             AND e.start_date > NOW()`,
          [user.staff_id]
        );
        additionalData.upcomingEvents = upcomingEvents[0]?.count || 0;
      } catch (additionalError) {
        console.error('Error fetching additional data:', additionalError);
      }
    }

    if (user.role === 'admin') {
      try {
        // Get pending applications count for admin
        const [pendingApplications] = await db.execute(
          'SELECT COUNT(*) as count FROM applications WHERE status = "pending"'
        );
        additionalData.pendingApplications = pendingApplications[0]?.count || 0;
      } catch (additionalError) {
        console.error('Error fetching admin data:', additionalError);
      }
    }

    console.log('Login successful, sending response...');

    res.json({
      message: 'Login erfolgreich',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        personalCode: user.personal_code,
        profileImage: user.profile_image ? `/uploads/profiles/${user.profile_image}` : null,
        ...additionalData
      }
    });

    console.log('=== LOGIN COMPLETE ===');

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Fehler beim Login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Log logout
    await db.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, ip_address, user_agent)
       VALUES (?, 'logout', 'auth', ?, ?)`,
      [userId, req.ip || 'unknown', req.get('user-agent') || 'unknown']
    );

    res.json({ message: 'Logout erfolgreich' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Logout' 
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get complete user data
    const [users] = await db.execute(
      `SELECT 
        u.id, u.email, u.role, u.is_active,
        sp.id as staff_id, sp.first_name, sp.last_name, 
        sp.personal_code, sp.profile_image, sp.phone,
        sp.birth_date, sp.street, sp.house_number,
        sp.postal_code, sp.city, sp.tshirt_size,
        sp.emergency_contact, sp.emergency_phone
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        message: 'Benutzer nicht gefunden' 
      });
    }

    const user = users[0];

    // Get qualifications
    let qualifications = [];
    if (user.staff_id) {
      const [quals] = await db.execute(
        `SELECT q.id, q.name, q.color
         FROM qualifications q
         JOIN staff_qualifications sq ON q.id = sq.qualification_id
         WHERE sq.staff_id = ?`,
        [user.staff_id]
      );
      qualifications = quals;
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      profile: {
        staffId: user.staff_id,
        firstName: user.first_name,
        lastName: user.last_name,
        personalCode: user.personal_code,
        profileImage: user.profile_image ? `/uploads/profiles/${user.profile_image}` : null,
        phone: user.phone,
        birthDate: user.birth_date,
        address: {
          street: user.street,
          houseNumber: user.house_number,
          postalCode: user.postal_code,
          city: user.city
        },
        tshirtSize: user.tshirt_size,
        emergencyContact: user.emergency_contact,
        emergencyPhone: user.emergency_phone,
        qualifications
      }
    });

  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Benutzerdaten' 
    });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: errors.array() 
      });
    }

    const { email } = req.body;

    // Get user
    const [users] = await connection.execute(
      `SELECT u.id, u.email, sp.first_name
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       WHERE u.email = ? AND u.is_active = 1`,
      [email]
    );

    // Always send success message (security)
    if (users.length === 0) {
      await connection.commit();
      return res.json({ 
        message: 'Falls ein Account mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' 
      });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token
    await connection.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, user.id]
    );

    // Send email
    await sendPasswordResetEmail(
      user.email,
      user.first_name || 'Nutzer',
      resetToken
    );

    // Log activity
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent)
       VALUES (?, 'password_reset_requested', 'auth', ?, ?, ?)`,
      [
        user.id,
        JSON.stringify({ email }),
        req.ip || 'unknown',
        req.get('user-agent') || 'unknown'
      ]
    );

    await connection.commit();

    res.json({ 
      message: 'Falls ein Account mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Zurücksetzen des Passworts' 
    });
  } finally {
    connection.release();
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: errors.array() 
      });
    }

    const { token, password } = req.body;

    // Get user with valid token
    const [users] = await connection.execute(
      `SELECT id, email, reset_token_expires
       FROM users
       WHERE reset_token = ? AND reset_token_expires > NOW() AND is_active = 1`,
      [token]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Ungültiger oder abgelaufener Token' 
      });
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and delete token
    await connection.execute(
      `UPDATE users 
       SET password = ?, reset_token = NULL, reset_token_expires = NULL 
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    // Log activity
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent)
       VALUES (?, 'password_reset_completed', 'auth', ?, ?, ?)`,
      [
        user.id,
        JSON.stringify({ email: user.email }),
        req.ip || 'unknown',
        req.get('user-agent') || 'unknown'
      ]
    );

    await connection.commit();

    res.json({ 
      message: 'Passwort erfolgreich zurückgesetzt' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error resetting password:', error);
    res.status(500).json({ 
      message: 'Fehler beim Setzen des neuen Passworts' 
    });
  } finally {
    connection.release();
  }
};

// Set initial password for new staff
const setPassword = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: errors.array() 
      });
    }

    const { token, password } = req.body;

    // Get user with valid token
    const [users] = await connection.execute(
      `SELECT u.id, u.email, sp.first_name, sp.last_name
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       WHERE u.reset_token = ? 
         AND u.reset_token_expires > NOW() 
         AND u.is_active = 1`,
      [token]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Ungültiger oder abgelaufener Token' 
      });
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and delete token
    await connection.execute(
      `UPDATE users 
       SET password = ?, reset_token = NULL, reset_token_expires = NULL 
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    // Log activity
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent)
       VALUES (?, 'password_set_initial', 'auth', ?, ?, ?)`,
      [
        user.id,
        JSON.stringify({ 
          email: user.email,
          name: `${user.first_name} ${user.last_name}`
        }),
        req.ip || 'unknown',
        req.get('user-agent') || 'unknown'
      ]
    );

    // Generate automatic login token
    const loginToken = generateToken(user.id);

    await connection.commit();

    res.json({ 
      message: 'Passwort erfolgreich gesetzt',
      token: loginToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role || 'staff'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error setting initial password:', error);
    res.status(500).json({ 
      message: 'Fehler beim Setzen des Passworts' 
    });
  } finally {
    connection.release();
  }
};

// Change password for logged in users
const changePassword = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: errors.array() 
      });
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get current password
    const [users] = await connection.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Benutzer nicht gefunden' 
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValidPassword) {
      await connection.rollback();
      return res.status(401).json({ 
        message: 'Aktuelles Passwort ist falsch' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await connection.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    // Log activity
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, ip_address, user_agent)
       VALUES (?, 'password_changed', 'auth', ?, ?)`,
      [userId, req.ip || 'unknown', req.get('user-agent') || 'unknown']
    );

    await connection.commit();

    res.json({ 
      message: 'Passwort erfolgreich geändert' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error changing password:', error);
    res.status(500).json({ 
      message: 'Fehler beim Ändern des Passworts' 
    });
  } finally {
    connection.release();
  }
};

// Validate token
const validateToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Check if token exists and is valid
    const [users] = await db.execute(
      `SELECT u.id, u.email, sp.first_name, sp.last_name
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       WHERE u.reset_token = ? 
         AND u.reset_token_expires > NOW() 
         AND u.is_active = 1`,
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ 
        valid: false,
        message: 'Ungültiger oder abgelaufener Token' 
      });
    }

    res.json({ 
      valid: true,
      email: users[0].email,
      name: users[0].first_name ? `${users[0].first_name} ${users[0].last_name}` : users[0].email
    });

  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Fehler beim Validieren des Tokens' 
    });
  }
};

module.exports = {
  login,
  logout,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
  setPassword,
  changePassword,
  validateToken
};


