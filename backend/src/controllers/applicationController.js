// backend/src/controllers/applicationController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { sendApplicationAcceptedEmail, sendApplicationRejectedEmail } = require('../services/emailService');
const { deleteFile, getFileUrl } = require('../middleware/upload');

// Generiere einen eindeutigen Personal-Code
const generatePersonalCode = async () => {
  let code;
  let exists = true;
  
  while (exists) {
    // Format: Erste 3 Buchstaben + 3 Zufallszahlen (z.B. EVT123)
    const letters = 'EVT';
    const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    code = letters + numbers;
    
    // Prüfe ob Code bereits existiert
    const [result] = await db.execute(
      'SELECT COUNT(*) as count FROM staff_profiles WHERE personal_code = ?',
      [code]
    );
    
    exists = result[0].count > 0;
  }
  
  return code;
};

// Alle Bewerbungen abrufen
const getApplications = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        a.*,
        u.email as processor_email,
        CONCAT(u_staff.first_name, ' ', u_staff.last_name) as processor_name
      FROM applications a
      LEFT JOIN users u ON a.processed_by = u.id
      LEFT JOIN staff_profiles u_staff ON u.id = u_staff.user_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter nach Status
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    // Suchfilter
    if (search) {
      query += ` AND (
        a.first_name LIKE ? OR 
        a.last_name LIKE ? OR 
        a.email LIKE ? OR
        CONCAT(a.first_name, ' ', a.last_name) LIKE ?
      )`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    
    // Zähle Gesamtanzahl
    const countQuery = query.replace('SELECT a.*,', 'SELECT COUNT(*) as total FROM (SELECT a.id');
    const [countResult] = await db.execute(countQuery + ') as subquery', params);
    const total = countResult[0].total;
    
    // Sortierung und Pagination
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [applications] = await db.execute(query, params);
    
    // Füge Bild-URLs hinzu
    applications.forEach(app => {
      if (app.profile_image) {
        app.profile_image_url = getFileUrl(app.profile_image);
      }
    });
    
    // Statistiken
    const [stats] = await db.execute(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(*) as total
      FROM applications
    `);
    
    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0]
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Bewerbungen:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Bewerbungen' });
  }
};

// Einzelne Bewerbung abrufen
const getApplication = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [applications] = await db.execute(
      `SELECT 
        a.*,
        u.email as processor_email,
        CONCAT(u_staff.first_name, ' ', u_staff.last_name) as processor_name
      FROM applications a
      LEFT JOIN users u ON a.processed_by = u.id
      LEFT JOIN staff_profiles u_staff ON u.id = u_staff.user_id
      WHERE a.id = ?`,
      [id]
    );
    
    if (applications.length === 0) {
      return res.status(404).json({ message: 'Bewerbung nicht gefunden' });
    }
    
    const application = applications[0];
    
    // Füge Bild-URL hinzu
    if (application.profile_image) {
      application.profile_image_url = getFileUrl(application.profile_image);
    }
    
    res.json(application);
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Bewerbung:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Bewerbung' });
  }
};

// Neue Bewerbung einreichen (öffentlich)
const submitApplication = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
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
    
    const {
      email,
      firstName,
      lastName,
      birthDate,
      phone,
      street,
      houseNumber,
      postalCode,
      city,
      tshirtSize,
      privacyAgreed
    } = req.body;
    
    // Prüfe ob E-Mail bereits existiert
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser.length > 0) {
      if (req.file) {
        await deleteFile(req.file.filename);
      }
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Diese E-Mail-Adresse ist bereits registriert' 
      });
    }
    
    // Prüfe ob bereits eine Bewerbung existiert
    const [existingApplication] = await connection.execute(
      'SELECT id, status FROM applications WHERE email = ? AND status = "pending"',
      [email]
    );
    
    if (existingApplication.length > 0) {
      if (req.file) {
        await deleteFile(req.file.filename);
      }
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Es existiert bereits eine offene Bewerbung mit dieser E-Mail-Adresse' 
      });
    }
    
    // Speichere Bewerbung
    const profileImage = req.file ? req.file.filename : null;
    
    const [result] = await connection.execute(
      `INSERT INTO applications (
        email, first_name, last_name, birth_date, phone,
        street, house_number, postal_code, city, tshirt_size,
        profile_image, privacy_agreed, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        email, firstName, lastName, birthDate, phone,
        street, houseNumber, postalCode, city, tshirtSize,
        profileImage, privacyAgreed ? 1 : 0
      ]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ('application_submitted', 'application', ?, ?, ?, ?)`,
      [
        result.insertId,
        JSON.stringify({ email, name: `${firstName} ${lastName}` }),
        req.ip,
        req.get('user-agent')
      ]
    );
    
    await connection.commit();
    
    res.status(201).json({ 
      message: 'Bewerbung erfolgreich eingereicht',
      applicationId: result.insertId 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Einreichen der Bewerbung:', error);
    
    // Lösche hochgeladene Datei bei Fehler
    if (req.file) {
      await deleteFile(req.file.filename);
    }
    
    res.status(500).json({ message: 'Fehler beim Einreichen der Bewerbung' });
  } finally {
    connection.release();
  }
};

// Bewerbung annehmen
const acceptApplication = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { qualifications = [] } = req.body;
    const adminId = req.user.id;
    
    // Hole Bewerbungsdaten
    const [applications] = await connection.execute(
      'SELECT * FROM applications WHERE id = ? AND status = "pending"',
      [id]
    );
    
    if (applications.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Bewerbung nicht gefunden oder bereits bearbeitet' 
      });
    }
    
    const application = applications[0];
    
    // Erstelle User Account
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Tage
    const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    
    const [userResult] = await connection.execute(
      `INSERT INTO users (email, password, role, is_active, reset_token, reset_token_expires)
       VALUES (?, ?, 'staff', 1, ?, ?)`,
      [application.email, hashedPassword, resetToken, resetTokenExpires]
    );
    
    const userId = userResult.insertId;
    
    // Generiere Personal-Code
    const personalCode = await generatePersonalCode();
    
    // Erstelle Staff Profile
    const [profileResult] = await connection.execute(
      `INSERT INTO staff_profiles (
        user_id, personal_code, first_name, last_name, birth_date,
        phone, street, house_number, postal_code, city,
        tshirt_size, profile_image, hired_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
      [
        userId, personalCode,
        application.first_name, application.last_name, application.birth_date,
        application.phone, application.street, application.house_number,
        application.postal_code, application.city, application.tshirt_size,
        application.profile_image
      ]
    );
    
    const staffId = profileResult.insertId;
    
    // Füge Qualifikationen hinzu
    if (qualifications.length > 0) {
      const qualificationValues = qualifications.map(qId => [staffId, qId, adminId]);
      await connection.query(
        `INSERT INTO staff_qualifications (staff_id, qualification_id, assigned_by)
         VALUES ?`,
        [qualificationValues]
      );
    }
    
    // Update Bewerbungsstatus
    await connection.execute(
      `UPDATE applications 
       SET status = 'accepted', processed_by = ?, processed_at = NOW()
       WHERE id = ?`,
      [adminId, id]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'application_accepted', 'application', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          applicant: `${application.first_name} ${application.last_name}`,
          email: application.email,
          staffId,
          qualifications
        })
      ]
    );
    
    // Sende E-Mail mit Passwort-Reset-Link
    await sendApplicationAcceptedEmail(
      application.email,
      application.first_name,
      application.last_name,
      resetToken
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Bewerbung erfolgreich angenommen',
      staffId,
      personalCode 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Annehmen der Bewerbung:', error);
    res.status(500).json({ message: 'Fehler beim Annehmen der Bewerbung' });
  } finally {
    connection.release();
  }
};

// Bewerbung ablehnen
const rejectApplication = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    
    // Hole Bewerbungsdaten
    const [applications] = await connection.execute(
      'SELECT * FROM applications WHERE id = ? AND status = "pending"',
      [id]
    );
    
    if (applications.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Bewerbung nicht gefunden oder bereits bearbeitet' 
      });
    }
    
    const application = applications[0];
    
    // Update Bewerbungsstatus
    await connection.execute(
      `UPDATE applications 
       SET status = 'rejected', rejection_reason = ?, 
           processed_by = ?, processed_at = NOW()
       WHERE id = ?`,
      [reason || null, adminId, id]
    );
    
    // Lösche Profilbild
    if (application.profile_image) {
      await deleteFile(application.profile_image);
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'application_rejected', 'application', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          applicant: `${application.first_name} ${application.last_name}`,
          email: application.email,
          reason
        })
      ]
    );
    
    // Sende Ablehnungs-E-Mail
    await sendApplicationRejectedEmail(
      application.email,
      application.first_name,
      application.last_name
    );
    
    await connection.commit();
    
    res.json({ message: 'Bewerbung wurde abgelehnt' });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Ablehnen der Bewerbung:', error);
    res.status(500).json({ message: 'Fehler beim Ablehnen der Bewerbung' });
  } finally {
    connection.release();
  }
};

// Bewerbung löschen (nur abgelehnte)
const deleteApplication = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const adminId = req.user.id;
    
    // Prüfe ob Bewerbung existiert und abgelehnt wurde
    const [applications] = await connection.execute(
      'SELECT * FROM applications WHERE id = ? AND status = "rejected"',
      [id]
    );
    
    if (applications.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Bewerbung nicht gefunden oder kann nicht gelöscht werden' 
      });
    }
    
    const application = applications[0];
    
    // Lösche Profilbild
    if (application.profile_image) {
      await deleteFile(application.profile_image);
    }
    
    // Lösche Bewerbung
    await connection.execute('DELETE FROM applications WHERE id = ?', [id]);
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'application_deleted', 'application', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          applicant: `${application.first_name} ${application.last_name}`,
          email: application.email
        })
      ]
    );
    
    await connection.commit();
    
    res.json({ message: 'Bewerbung wurde gelöscht' });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Löschen der Bewerbung:', error);
    res.status(500).json({ message: 'Fehler beim Löschen der Bewerbung' });
  } finally {
    connection.release();
  }
};

// Statistiken abrufen
const getApplicationStats = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    // Monatliche Statistiken
    const [monthlyStats] = await db.execute(`
      SELECT 
        MONTH(created_at) as month,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM applications
      WHERE YEAR(created_at) = ?
      GROUP BY MONTH(created_at)
      ORDER BY month
    `, [year]);
    
    // Gesamtstatistiken
    const [totalStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as total_accepted,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as total_rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
        AVG(CASE WHEN status != 'pending' THEN DATEDIFF(processed_at, created_at) END) as avg_processing_days
      FROM applications
    `);
    
    // Top Städte
    const [topCities] = await db.execute(`
      SELECT 
        city,
        COUNT(*) as count
      FROM applications
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `);
    
    res.json({
      monthlyStats,
      totalStats: totalStats[0],
      topCities
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Statistiken' });
  }
};

module.exports = {
  getApplications,
  getApplication,
  submitApplication,
  acceptApplication,
  rejectApplication,
  deleteApplication,
  getApplicationStats
};




