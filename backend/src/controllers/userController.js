const db = require('../config/database');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT 
        u.id, u.email, u.role, u.is_active, u.created_at,
        sp.first_name, sp.last_name, sp.phone, sp.personal_code
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.role IN ('staff', 'admin')
      ORDER BY sp.last_name, sp.first_name
    `);

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Benutzer' });
  }
};

// Get single user
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    const [users] = await db.execute(`
      SELECT 
        u.id, u.email, u.role, u.is_active, u.created_at,
        sp.*
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.id = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    const user = users[0];

    // Get qualifications
    const [qualifications] = await db.execute(`
      SELECT q.id, q.name, q.description, q.color
      FROM qualifications q
      JOIN staff_qualifications sq ON q.id = sq.qualification_id
      WHERE sq.staff_id = ?
    `, [user.id]);

    user.qualifications = qualifications;

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen des Benutzers' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can update this data
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    // Admin can update everything, users can only update their profile
    if (req.user.role !== 'admin') {
      // Filter out fields that only admin can change
      delete req.body.role;
      delete req.body.is_active;
      delete req.body.email;
    }

    // Update user table if needed
    if (req.body.email || req.body.role || typeof req.body.is_active !== 'undefined') {
      const updates = [];
      const values = [];

      if (req.body.email) {
        updates.push('email = ?');
        values.push(req.body.email);
      }
      if (req.body.role) {
        updates.push('role = ?');
        values.push(req.body.role);
      }
      if (typeof req.body.is_active !== 'undefined') {
        updates.push('is_active = ?');
        values.push(req.body.is_active);
      }

      if (updates.length > 0) {
        values.push(id);
        await db.execute(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }
    }

    // Update profile if exists
    const profileUpdates = ['first_name', 'last_name', 'birth_date', 'street', 
                           'house_number', 'postal_code', 'city', 'phone', 'tshirt_size'];
    
    const profileValues = profileUpdates
      .filter(field => req.body[field] !== undefined)
      .map(field => req.body[field]);

    if (profileValues.length > 0) {
      const setClause = profileUpdates
        .filter(field => req.body[field] !== undefined)
        .map(field => `${field} = ?`)
        .join(', ');

      profileValues.push(id);
      
      await db.execute(
        `UPDATE staff_profiles SET ${setClause} WHERE user_id = ?`,
        profileValues
      );
    }

    res.json({ message: 'Benutzer erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Benutzers' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting yourself
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ message: 'Sie können sich nicht selbst löschen' });
    }

    await db.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'Benutzer erfolgreich gelöscht' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Fehler beim Löschen des Benutzers' });
  }
};

// Toggle user active status
const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.execute(
      'SELECT is_active FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    const newStatus = !users[0].is_active;

    await db.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [newStatus, id]
    );

    res.json({ 
      message: `Benutzer ${newStatus ? 'aktiviert' : 'deaktiviert'}`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Toggle user active error:', error);
    res.status(500).json({ message: 'Fehler beim Ändern des Benutzerstatus' });
  }
};

// Update user qualifications
const updateUserQualifications = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { qualifications } = req.body;

    // Get staff profile id
    const [staffProfile] = await connection.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [id]
    );

    if (staffProfile.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Mitarbeiterprofil nicht gefunden' });
    }

    const staffId = staffProfile[0].id;

    // Delete existing qualifications
    await connection.execute(
      'DELETE FROM staff_qualifications WHERE staff_id = ?',
      [staffId]
    );

    // Add new qualifications
    if (qualifications && qualifications.length > 0) {
      const values = qualifications.map(qualId => [staffId, qualId]);
      await connection.query(
        'INSERT INTO staff_qualifications (staff_id, qualification_id) VALUES ?',
        [values]
      );
    }

    await connection.commit();

    res.json({ message: 'Qualifikationen erfolgreich aktualisiert' });
  } catch (error) {
    await connection.rollback();
    console.error('Update qualifications error:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Qualifikationen' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleUserActive,
  updateUserQualifications,
};
