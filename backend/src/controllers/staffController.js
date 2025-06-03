// backend/src/controllers/staffController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { sendPasswordResetEmail } = require('../services/emailService');
const { generateResetToken } = require('../middleware/auth');
const { deleteFile, getFileUrl } = require('../middleware/upload');

// Alle Mitarbeiter abrufen
const getAllStaff = async (req, res) => {
  try {
    const { 
      search, 
      status = 'all', 
      qualification,
      page = 1, 
      limit = 20,
      sort = 'name'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        sp.id,
        sp.user_id,
        sp.personal_code,
        sp.first_name,
        sp.last_name,
        CONCAT(sp.first_name, ' ', sp.last_name) as full_name,
        sp.phone,
        sp.birth_date,
        sp.city,
        sp.profile_image,
        sp.hired_date,
        u.email,
        u.role,
        u.is_active,
        GROUP_CONCAT(DISTINCT q.name SEPARATOR ', ') as qualifications,
        COUNT(DISTINCT sa.id) as total_shifts,
        COUNT(DISTINCT CASE WHEN sa.status = 'confirmed' THEN sa.id END) as confirmed_shifts
      FROM staff_profiles sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN staff_qualifications sq ON sp.id = sq.staff_id
      LEFT JOIN qualifications q ON sq.qualification_id = q.id
      LEFT JOIN shift_assignments sa ON sp.id = sa.staff_id
      WHERE u.role IN ('staff', 'admin')
    `;
    
    const params = [];
    
    // Status Filter
    if (status === 'active') {
      query += ' AND u.is_active = 1';
    } else if (status === 'inactive') {
      query += ' AND u.is_active = 0';
    }
    
    // Suchfilter
    if (search) {
      query += ` AND (
        sp.first_name LIKE ? OR 
        sp.last_name LIKE ? OR 
        CONCAT(sp.first_name, ' ', sp.last_name) LIKE ? OR
        sp.personal_code LIKE ? OR
        u.email LIKE ?
      )`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }
    
    // Qualifikations-Filter
    if (qualification) {
      query += ` AND EXISTS (
        SELECT 1 FROM staff_qualifications sq2 
        WHERE sq2.staff_id = sp.id AND sq2.qualification_id = ?
      )`;
      params.push(qualification);
    }
    
    query += ' GROUP BY sp.id';
    
    // Sortierung
    switch (sort) {
      case 'name':
        query += ' ORDER BY sp.last_name, sp.first_name';
        break;
      case 'code':
        query += ' ORDER BY sp.personal_code';
        break;
      case 'hired':
        query += ' ORDER BY sp.hired_date DESC';
        break;
      default:
        query += ' ORDER BY sp.last_name, sp.first_name';
    }
    
    // Zähle Gesamtanzahl
    const countQuery = `
      SELECT COUNT(DISTINCT sp.id) as total 
      FROM staff_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE u.role IN ('staff', 'admin')
      ${status === 'active' ? 'AND u.is_active = 1' : ''}
      ${status === 'inactive' ? 'AND u.is_active = 0' : ''}
      ${search ? `AND (
        sp.first_name LIKE ? OR 
        sp.last_name LIKE ? OR 
        CONCAT(sp.first_name, ' ', sp.last_name) LIKE ? OR
        sp.personal_code LIKE ? OR
        u.email LIKE ?
      )` : ''}
      ${qualification ? `AND EXISTS (
        SELECT 1 FROM staff_qualifications sq2 
        WHERE sq2.staff_id = sp.id AND sq2.qualification_id = ?
      )` : ''}
    `;
    
    const countParams = [...params];
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    // Pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [staff] = await db.execute(query, params);
    
    // Füge Bild-URLs hinzu
    staff.forEach(member => {
      if (member.profile_image) {
        member.profile_image_url = getFileUrl(member.profile_image);
      }
    });
    
    // Hole verfügbare Qualifikationen für Filter
    const [qualifications] = await db.execute(
      'SELECT id, name, color FROM qualifications WHERE is_active = 1 ORDER BY name'
    );
    
    res.json({
      staff,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        qualifications
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Mitarbeiter:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Mitarbeiter' 
    });
  }
};

// Einzelnen Mitarbeiter abrufen
const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Hole Mitarbeiter-Details
    const [staff] = await db.execute(`
      SELECT 
        sp.*,
        u.email,
        u.role,
        u.is_active,
        u.created_at as user_created_at
      FROM staff_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.id = ?
    `, [id]);
    
    if (staff.length === 0) {
      return res.status(404).json({ 
        message: 'Mitarbeiter nicht gefunden' 
      });
    }
    
    const member = staff[0];
    
    // Füge Bild-URL hinzu
    if (member.profile_image) {
      member.profile_image_url = getFileUrl(member.profile_image);
    }
    
    // Hole Qualifikationen
    const [qualifications] = await db.execute(`
      SELECT 
        q.id,
        q.name,
        q.color,
        sq.assigned_at,
        CONCAT(assigner.first_name, ' ', assigner.last_name) as assigned_by
      FROM staff_qualifications sq
      JOIN qualifications q ON sq.qualification_id = q.id
      LEFT JOIN users u_assigner ON sq.assigned_by = u_assigner.id
      LEFT JOIN staff_profiles assigner ON u_assigner.id = assigner.user_id
      WHERE sq.staff_id = ?
      ORDER BY q.name
    `, [id]);
    
    // Hole Schicht-Historie
    const [shiftHistory] = await db.execute(`
      SELECT 
        s.id as shift_id,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        e.name as event_name,
        sa.status,
        sa.confirmed_at,
        p.name as position_name
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN events e ON s.event_id = e.id
      LEFT JOIN positions p ON sa.position_id = p.id
      WHERE sa.staff_id = ?
      ORDER BY s.start_time DESC
      LIMIT 20
    `, [id]);
    
    // Hole Arbeitszeiten-Statistik
    const [workStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_entries,
        COALESCE(SUM(total_minutes) / 60, 0) as total_hours,
        COUNT(DISTINCT DATE(clock_in)) as days_worked,
        COUNT(DISTINCT MONTH(clock_in)) as months_worked
      FROM timeclock_entries
      WHERE staff_id = ? AND status = 'completed'
    `, [id]);
    
    res.json({
      ...member,
      qualifications,
      shiftHistory,
      workStats: workStats[0]
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen des Mitarbeiters:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen des Mitarbeiters' 
    });
  }
};

// Mitarbeiter aktualisieren
const updateStaff = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const updates = req.body;
    const adminId = req.user.id;
    
    // Validierung
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) {
        await deleteFile(req.file.filename);
      }
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: errors.array() 
      });
    }
    
    // Prüfe ob Mitarbeiter existiert
    const [existing] = await connection.execute(
      'SELECT user_id, profile_image FROM staff_profiles WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      if (req.file) {
        await deleteFile(req.file.filename);
      }
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Mitarbeiter nicht gefunden' 
      });
    }
    
    const staffUserId = existing[0].user_id;
    const oldImage = existing[0].profile_image;
    
    // Update User-Daten wenn vorhanden
    if (updates.email || updates.is_active !== undefined) {
      let userQuery = 'UPDATE users SET ';
      const userParams = [];
      const userUpdates = [];
      
      if (updates.email) {
        // Prüfe ob E-Mail bereits existiert
        const [emailCheck] = await connection.execute(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [updates.email, staffUserId]
        );
        
        if (emailCheck.length > 0) {
          if (req.file) {
            await deleteFile(req.file.filename);
          }
          await connection.rollback();
          return res.status(400).json({ 
            message: 'E-Mail-Adresse bereits vergeben' 
          });
        }
        
        userUpdates.push('email = ?');
        userParams.push(updates.email);
      }
      
      if (updates.is_active !== undefined) {
        userUpdates.push('is_active = ?');
        userParams.push(updates.is_active ? 1 : 0);
      }
      
      if (userUpdates.length > 0) {
        userQuery += userUpdates.join(', ') + ' WHERE id = ?';
        userParams.push(staffUserId);
        await connection.execute(userQuery, userParams);
      }
    }
    
    // Update Staff Profile
    const profileUpdates = [];
    const profileParams = [];
    
    const allowedFields = [
      'first_name', 'last_name', 'birth_date', 'phone',
      'street', 'house_number', 'postal_code', 'city',
      'tshirt_size', 'emergency_contact', 'emergency_phone', 'notes'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        profileUpdates.push(`${field} = ?`);
        profileParams.push(updates[field]);
      }
    });
    
    // Handle Profilbild
    if (req.file) {
      profileUpdates.push('profile_image = ?');
      profileParams.push(req.file.filename);
    }
    
    if (profileUpdates.length > 0) {
      const profileQuery = `UPDATE staff_profiles SET ${profileUpdates.join(', ')} WHERE id = ?`;
      profileParams.push(id);
      await connection.execute(profileQuery, profileParams);
      
      // Lösche altes Bild wenn neues hochgeladen wurde
      if (req.file && oldImage) {
        await deleteFile(oldImage);
      }
    }
    
    // Update Qualifikationen wenn vorhanden
    if (updates.qualifications && Array.isArray(updates.qualifications)) {
      // Lösche alle bestehenden Qualifikationen
      await connection.execute(
        'DELETE FROM staff_qualifications WHERE staff_id = ?',
        [id]
      );
      
      // Füge neue Qualifikationen hinzu
      if (updates.qualifications.length > 0) {
        const qualValues = updates.qualifications.map(qId => [id, qId, adminId]);
        await connection.query(
          'INSERT INTO staff_qualifications (staff_id, qualification_id, assigned_by) VALUES ?',
          [qualValues]
        );
      }
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'staff_updated', 'staff', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          updated_fields: Object.keys(updates),
          staff_name: `${updates.first_name || existing[0].first_name} ${updates.last_name || existing[0].last_name}`
        })
      ]
    );
    
    await connection.commit();
    
    // Hole aktualisierte Daten
    const updatedStaff = await getStaffById({ params: { id } }, { 
      json: (data) => data,
      status: () => ({ json: () => {} })
    });
    
    res.json({ 
      message: 'Mitarbeiter erfolgreich aktualisiert',
      staff: updatedStaff
    });
    
  } catch (error) {
    await connection.rollback();
    
    // Lösche hochgeladene Datei bei Fehler
    if (req.file) {
      await deleteFile(req.file.filename);
    }
    
    console.error('Fehler beim Aktualisieren des Mitarbeiters:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren des Mitarbeiters' 
    });
  } finally {
    connection.release();
  }
};

// Mitarbeiter deaktivieren/aktivieren
const toggleStaffStatus = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { is_active } = req.body;
    const adminId = req.user.id;
    
    // Hole User ID
    const [staff] = await connection.execute(
      'SELECT user_id, first_name, last_name FROM staff_profiles WHERE id = ?',
      [id]
    );
    
    if (staff.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Mitarbeiter nicht gefunden' 
      });
    }
    
    const { user_id, first_name, last_name } = staff[0];
    
    // Update Status
    await connection.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, user_id]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'staff', ?, ?)`,
      [
        adminId,
        is_active ? 'staff_activated' : 'staff_deactivated',
        id,
        JSON.stringify({
          staff_name: `${first_name} ${last_name}`
        })
      ]
    );
    
    await connection.commit();
    
    res.json({ 
      message: `Mitarbeiter wurde ${is_active ? 'aktiviert' : 'deaktiviert'}` 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Ändern des Mitarbeiter-Status:', error);
    res.status(500).json({ 
      message: 'Fehler beim Ändern des Status' 
    });
  } finally {
    connection.release();
  }
};

// Personal-Code ändern
const updatePersonalCode = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { personal_code } = req.body;
    const adminId = req.user.id;
    
    // Prüfe ob Code bereits existiert
    const [existing] = await connection.execute(
      'SELECT id FROM staff_profiles WHERE personal_code = ? AND id != ?',
      [personal_code, id]
    );
    
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Dieser Personal-Code ist bereits vergeben' 
      });
    }
    
    // Update Code
    await connection.execute(
      'UPDATE staff_profiles SET personal_code = ? WHERE id = ?',
      [personal_code, id]
    );
    
    // Aktivitätslog
    const [staff] = await connection.execute(
      'SELECT first_name, last_name FROM staff_profiles WHERE id = ?',
      [id]
    );
    
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'personal_code_changed', 'staff', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          staff_name: `${staff[0].first_name} ${staff[0].last_name}`,
          new_code: personal_code
        })
      ]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Personal-Code erfolgreich geändert',
      personal_code 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Ändern des Personal-Codes:', error);
    res.status(500).json({ 
      message: 'Fehler beim Ändern des Personal-Codes' 
    });
  } finally {
    connection.release();
  }
};

// Passwort-Reset für Mitarbeiter
const resetStaffPassword = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const adminId = req.user.id;
    
    // Hole Mitarbeiter-Daten
    const [staff] = await connection.execute(`
      SELECT 
        sp.user_id, sp.first_name, sp.last_name,
        u.email
      FROM staff_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.id = ?
    `, [id]);
    
    if (staff.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Mitarbeiter nicht gefunden' 
      });
    }
    
    const { user_id, first_name, last_name, email } = staff[0];
    
    // Generiere Reset Token
    const resetToken = generateResetToken();
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Stunden
    
    // Speichere Token
    await connection.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, user_id]
    );
    
    // Sende E-Mail
    await sendPasswordResetEmail(email, first_name, resetToken);
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'staff_password_reset', 'staff', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          staff_name: `${first_name} ${last_name}`,
          email
        })
      ]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Passwort-Reset E-Mail wurde versendet' 
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

// Mitarbeiter-Statistiken
const getStaffStatistics = async (req, res) => {
  try {
    // Gesamtstatistiken
    const [totalStats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT sp.id) as total_staff,
        COUNT(DISTINCT CASE WHEN u.is_active = 1 THEN sp.id END) as active_staff,
        COUNT(DISTINCT CASE WHEN u.role = 'admin' THEN sp.id END) as admin_count,
        AVG(DATEDIFF(NOW(), sp.hired_date) / 365) as avg_tenure_years
      FROM staff_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE u.role IN ('staff', 'admin')
    `);
    
    // Top-Mitarbeiter nach Arbeitsstunden
    const [topWorkers] = await db.execute(`
      SELECT 
        sp.id,
        CONCAT(sp.first_name, ' ', sp.last_name) as name,
        sp.personal_code,
        COALESCE(SUM(te.total_minutes) / 60, 0) as total_hours
      FROM staff_profiles sp
      LEFT JOIN timeclock_entries te ON sp.id = te.staff_id AND te.status = 'completed'
      JOIN users u ON sp.user_id = u.id
      WHERE u.is_active = 1
      GROUP BY sp.id
      ORDER BY total_hours DESC
      LIMIT 10
    `);
    
    // Qualifikations-Verteilung
    const [qualificationStats] = await db.execute(`
      SELECT 
        q.id,
        q.name,
        q.color,
        COUNT(sq.staff_id) as staff_count
      FROM qualifications q
      LEFT JOIN staff_qualifications sq ON q.id = sq.qualification_id
      WHERE q.is_active = 1
      GROUP BY q.id
      ORDER BY staff_count DESC
    `);
    
    // Neue Mitarbeiter (letzte 30 Tage)
    const [newHires] = await db.execute(`
      SELECT 
        sp.id,
        CONCAT(sp.first_name, ' ', sp.last_name) as name,
        sp.hired_date
      FROM staff_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.hired_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND u.is_active = 1
      ORDER BY sp.hired_date DESC
    `);
    
    res.json({
      totalStats: totalStats[0],
      topWorkers,
      qualificationStats,
      newHires
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Statistiken' 
    });
  }
};

// Eigenes Profil abrufen (für Staff)
const getOwnProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Hole Staff ID
    const [staffResult] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (staffResult.length === 0) {
      return res.status(404).json({ 
        message: 'Profil nicht gefunden' 
      });
    }
    
    // Nutze getStaffById mit der Staff ID
    req.params.id = staffResult[0].id;
    return getStaffById(req, res);
    
  } catch (error) {
    console.error('Fehler beim Abrufen des eigenen Profils:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen des Profils' 
    });
  }
};

// Eigenes Profil aktualisieren (für Staff)
const updateOwnProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    
    // Hole Staff ID
    const [staffResult] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (staffResult.length === 0) {
      if (req.file) {
        await deleteFile(req.file.filename);
      }
      return res.status(404).json({ 
        message: 'Profil nicht gefunden' 
      });
    }
    
    // Beschränke erlaubte Felder für Selbst-Update
    const allowedSelfUpdateFields = [
      'phone', 'street', 'house_number', 'postal_code', 'city',
      'emergency_contact', 'emergency_phone', 'tshirt_size'
    ];
    
    // Filtere nur erlaubte Felder
    const filteredUpdates = {};
    allowedSelfUpdateFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });
    
    // Setze ID und rufe updateStaff auf
    req.params.id = staffResult[0].id;
    req.body = filteredUpdates;
    
    return updateStaff(req, res);
    
  } catch (error) {
    if (req.file) {
      await deleteFile(req.file.filename);
    }
    console.error('Fehler beim Aktualisieren des eigenen Profils:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren des Profils' 
    });
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  updateStaff,
  toggleStaffStatus,
  updatePersonalCode,
  resetStaffPassword,
  getStaffStatistics,
  getOwnProfile,
  updateOwnProfile
};


