const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken, generateResetToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user with profile
    const [users] = await db.execute(`
      SELECT 
        u.id, u.email, u.password, u.role, u.is_active,
        sp.first_name, sp.last_name, sp.profile_image, sp.personal_code
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.email = ?
    `, [email]);

    if (users.length === 0) {
      return res.status(401).json({ 
        message: 'E-Mail oder Passwort falsch' 
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ 
        message: 'Ihr Konto ist deaktiviert' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'E-Mail oder Passwort falsch' 
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Prepare user data
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImage: user.profile_image,
      personalCode: user.personal_code
    };

    res.json({
      message: 'Login erfolgreich',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Login' 
    });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await db.execute(`
      SELECT 
        u.id, u.email, u.role, u.is_active,
        sp.first_name, sp.last_name, sp.birth_date, sp.street, sp.house_number,
        sp.postal_code, sp.city, sp.phone, sp.tshirt_size, sp.profile_image,
        sp.personal_code
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.id = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ 
        message: 'Benutzer nicht gefunden' 
      });
    }

    const user = users[0];

    // Get qualifications
    const [qualifications] = await db.execute(`
      SELECT q.id, q.name, q.description, q.color
      FROM qualifications q
      JOIN staff_qualifications sq ON q.id = sq.qualification_id
      JOIN staff_profiles sp ON sq.staff_id = sp.id
      WHERE sp.user_id = ?
    `, [userId]);

    // Format response
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: {
        firstName: user.first_name,
        lastName: user.last_name,
        birthDate: user.birth_date,
        address: {
          street: user.street,
          houseNumber: user.house_number,
          postalCode: user.postal_code,
          city: user.city
        },
        phone: user.phone,
        tshirtSize: user.tshirt_size,
        profileImage: user.profile_image,
        personalCode: user.personal_code
      },
      qualifications
    };

    res.json(userData);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Benutzerdaten' 
    });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const [users] = await db.execute(
      'SELECT id, first_name FROM users u JOIN staff_profiles sp ON u.id = sp.user_id WHERE u.email = ?',
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if email exists
      return res.json({ 
        message: 'Wenn die E-Mail-Adresse existiert, wurde eine Anleitung zum Zurücksetzen gesendet.' 
      });
    }

    const user = users[0];
    const resetToken = generateResetToken();
    const resetExpires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await db.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetExpires, user.id]
    );

    await emailService.sendPasswordResetEmail(email, resetToken);

    res.json({ 
      message: 'Wenn die E-Mail-Adresse existiert, wurde eine Anleitung zum Zurücksetzen gesendet.' 
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Anfordern des Passwort-Resets' 
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const [users] = await db.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ 
        message: 'Ungültiger oder abgelaufener Token' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, users[0].id]
    );

    res.json({ 
      message: 'Passwort erfolgreich zurückgesetzt' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Zurücksetzen des Passworts' 
    });
  }
};

// Change password (authenticated)
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const [users] = await db.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        message: 'Benutzer nicht gefunden' 
      });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Aktuelles Passwort ist falsch' 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({ 
      message: 'Passwort erfolgreich geändert' 
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Ändern des Passworts' 
    });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Build update query dynamically
    const allowedFields = ['first_name', 'last_name', 'birth_date', 'street', 
                          'house_number', 'postal_code', 'city', 'phone', 'tshirt_size'];
    
    const updateFields = [];
    const values = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (updateFields.length > 0) {
      values.push(userId);
      await db.execute(
        `UPDATE staff_profiles SET ${updateFields.join(', ')} WHERE user_id = ?`,
        values
      );
    }

    res.json({ 
      message: 'Profil erfolgreich aktualisiert' 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren des Profils' 
    });
  }
};

module.exports = {
  login,
  getMe,
  requestPasswordReset,
  resetPassword,
  changePassword,
  updateProfile
};
