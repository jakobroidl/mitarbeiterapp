// backend/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { sendPasswordResetEmail } = require('../services/emailService');
const { generateToken, generateResetToken } = require('../middleware/auth');

// Login
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Hole User mit Staff-Profil
    const [users] = await db.execute(
      `SELECT 
        u.id, u.email, u.password, u.role, u.is_active,
        sp.id as staff_id, sp.first_name, sp.last_name, 
        sp.personal_code, sp.profile_image
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        message: 'Ungültige Anmeldedaten' 
      });
    }

    const user = users[0];

    // Prüfe ob User aktiv ist
    if (!user.is_active) {
      return res.status(401).json({ 
        message: 'Ihr Account wurde deaktiviert. Bitte kontaktieren Sie den Administrator.' 
      });
    }

    // Prüfe Passwort
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Log fehlgeschlagenen Login-Versuch
      await db.execute(
        `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent)
         VALUES (?, 'login_failed', 'auth', ?, ?, ?)`,
        [
          user.id,
          JSON.stringify({ email }),
          req.ip,
          req.get('user-agent')
        ]
      );

      return res.status(401).json({ 
        message: 'Ungültige Anmeldedaten' 
      });
    }

    // Generiere JWT Token
    const token = generateToken(user.id);

    // Update last login
    await db.execute(
      'UPDATE users SET updated_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Log erfolgreichen Login
    await db.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent)
       VALUES (?, 'login_success', 'auth', ?, ?, ?)`,
      [
        user.id,
        JSON.stringify({ email }),
        req.ip,
        req.get('user-agent')
      ]
    );

    // Hole zusätzliche Informationen je nach Rolle
    let additionalData = {};
    
    if (user.role === 'staff' || user.role === 'admin') {
      // Hole ungelesene Nachrichten
      const [unreadMessages] = await db.execute(
        `SELECT COUNT(*) as count 
         FROM message_recipients mr
         JOIN messages m ON mr.message_id = m.id
         WHERE mr.recipient_id = ? AND mr.is_read = 0 AND mr.is_deleted = 0`,
        [user.id]
      );
      additionalData.unreadMessages = unreadMessages[0].count;

      // Hole anstehende Events
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
      additionalData.upcomingEvents = upcomingEvents[0].count;
    }

    if (user.role === 'admin') {
      // Hole offene Bewerbungen für Admin
      const [pendingApplications] = await db.execute(
        'SELECT COUNT(*) as count FROM applications WHERE status = "pending"'
      );
      additionalData.pendingApplications = pendingApplications[0].count;
    }

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

  } catch (error) {
    console.error('Login Fehler:', error);
    res.status(500).json({ 
      message: 'Fehler beim Login' 
    });
  }
};

// Logout (hauptsächlich für Activity Log)
const logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Log Logout
    await db.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, ip_address, user_agent)
       VALUES (?, 'logout', 'auth', ?, ?)`,
      [userId, req.ip, req.get('user-agent')]
    );

    res.json({ message: 'Logout erfolgreich' });

  } catch (error) {
    console.error('Logout Fehler:', error);
    res.status(500).json({ 
      message: 'Fehler beim Logout' 
    });
  }
};

// Aktuellen User abrufen
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Hole vollständige User-Daten
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

    // Hole Qualifikationen
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
    console.error('Fehler beim Abrufen des aktuellen Users:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Benutzerdaten' 
    });
  }
};

// Passwort zurücksetzen anfordern
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

    // Hole User
    const [users] = await connection.execute(
      `SELECT u.id, u.email, sp.first_name
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       WHERE u.email = ? AND u.is_active = 1`,
      [email]
    );

    // Sende immer Erfolgsmeldung (Sicherheit)
    if (users.length === 0) {
      await connection.commit();
      return res.json({ 
        message: 'Falls ein Account mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' 
      });
    }

    const user = users[0];

    // Generiere Reset Token
    const resetToken = generateResetToken();
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Stunden

    // Speichere Token
    await connection.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, user.id]
    );

    // Sende E-Mail
    await sendPasswordResetEmail(
      user.email,
      user.first_name || 'Nutzer',
      resetToken
    );

    // Log Aktivität
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent)
       VALUES (?, 'password_reset_requested', 'auth', ?, ?, ?)`,
      [
        user.id,
        JSON.stringify({ email }),
        req.ip,
        req.get('user-agent')
      ]
    );

    await connection.commit();

    res.json({ 
      message: 'Falls ein Account mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Passwort-Reset:', error);
    res.status(500).json({ 
      message: 'Fehler beim Zurücksetzen des Passworts' 
    });
  } finally {
    connection.release();
  }
};

// Passwort zurücksetzen (mit Token)
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

    // Hole User mit gültigem Token
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

    // Hash neues Passwort
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update Passwort und lösche Token
    await connection.execute(
      `UPDATE users 
       SET password = ?, reset_token = NULL, reset_token_expires = NULL 
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    // Log Aktivität
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent)
       VALUES (?, 'password_reset_completed', 'auth', ?, ?, ?)`,
      [
        user.id,
        JSON.stringify({ email: user.email }),
        req.ip,
        req.get('user-agent')
      ]
    );

    await connection.commit();

    res.json({ 
      message: 'Passwort erfolgreich zurückgesetzt' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Setzen des neuen Passworts:', error);
    res.status(500).json({ 
      message: 'Fehler beim Setzen des neuen Passworts' 
    });
  } finally {
    connection.release();
  }
};

// Passwort erstmalig setzen (für neue Mitarbeiter)
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

    // Hole User mit gültigem Token (speziell für neue Accounts)
    const [users] = await connection.execute(
      `SELECT u.id, u.email, sp.first_name, sp.last_name
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       WHERE u.reset_token = ? 
         AND u.reset_token_expires > NOW() 
         AND u.is_active = 1
         AND u.role = 'staff'`,
      [token]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Ungültiger oder abgelaufener Token' 
      });
    }

    const user = users[0];

    // Hash neues Passwort
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update Passwort und lösche Token
    await connection.execute(
      `UPDATE users 
       SET password = ?, reset_token = NULL, reset_token_expires = NULL 
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    // Log Aktivität
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent)
       VALUES (?, 'password_set_initial', 'auth', ?, ?, ?)`,
      [
        user.id,
        JSON.stringify({ 
          email: user.email,
          name: `${user.first_name} ${user.last_name}`
        }),
        req.ip,
        req.get('user-agent')
      ]
    );

    // Generiere automatischen Login Token
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
        role: 'staff'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim erstmaligen Setzen des Passworts:', error);
    res.status(500).json({ 
      message: 'Fehler beim Setzen des Passworts' 
    });
  } finally {
    connection.release();
  }
};

// Passwort ändern (für eingeloggte User)
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

    // Hole aktuelles Passwort
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

    // Prüfe aktuelles Passwort
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValidPassword) {
      await connection.rollback();
      return res.status(401).json({ 
        message: 'Aktuelles Passwort ist falsch' 
      });
    }

    // Hash neues Passwort
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update Passwort
    await connection.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    // Log Aktivität
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, ip_address, user_agent)
       VALUES (?, 'password_changed', 'auth', ?, ?)`,
      [userId, req.ip, req.get('user-agent')]
    );

    await connection.commit();

    res.json({ 
      message: 'Passwort erfolgreich geändert' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Ändern des Passworts:', error);
    res.status(500).json({ 
      message: 'Fehler beim Ändern des Passworts' 
    });
  } finally {
    connection.release();
  }
};

// Token validieren (für Frontend)
const validateToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Prüfe ob Token existiert und gültig ist
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
    console.error('Fehler beim Validieren des Tokens:', error);
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


