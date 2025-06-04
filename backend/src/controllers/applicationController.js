// backend/src/controllers/applicationController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { sendApplicationAcceptedEmail, sendApplicationRejectedEmail } = require('../services/emailService');
const { deleteFile, getFileUrl } = require('../middleware/upload');



// Generiere einen eindeutigen Personal-Code
// Funktion zur Generierung eines eindeutigen numerischen Personal-Codes
const generatePersonalCode = async (connection) => {
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    // Generiere 6-stelligen numerischen Code
    code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Prüfe ob Code bereits existiert
    const [existing] = await connection.execute(
      'SELECT id FROM staff_profiles WHERE personal_code = ?',
      [code]
    );
    
    if (existing.length === 0) {
      isUnique = true;
    }
  }
  
  return code;
};

// Alle Bewerbungen abrufen
const getApplications = async (req, res) => {
  console.log('\n=== GET APPLICATIONS ===');
  console.log('Query params:', req.query);
  
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
      console.log('[getApplications] Filtering by status:', status);
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
      console.log('[getApplications] Searching for:', search);
    }
    
    // Zähle Gesamtanzahl
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM applications a
      LEFT JOIN users u ON a.processed_by = u.id
      LEFT JOIN staff_profiles u_staff ON u.id = u_staff.user_id
      WHERE 1=1
    `;
    
    // Füge die gleichen WHERE-Bedingungen zum Count-Query hinzu
    let countQueryWithConditions = countQuery;
    const countParams = [];
    
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      countQueryWithConditions += ' AND a.status = ?';
      countParams.push(status);
    }
    
    if (search) {
      countQueryWithConditions += ` AND (
        a.first_name LIKE ? OR 
        a.last_name LIKE ? OR 
        a.email LIKE ? OR
        CONCAT(a.first_name, ' ', a.last_name) LIKE ?
      )`;
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam, searchParam, searchParam);
    }
    
    console.log('[getApplications] Executing count query...');
    const [countResult] = await db.execute(countQueryWithConditions, countParams);
    const total = countResult[0].total;
    console.log('[getApplications] Total count:', total);
    
    // Sortierung und Pagination
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('[getApplications] Executing main query...');
    const [applications] = await db.execute(query, params);
    console.log('[getApplications] Found applications:', applications.length);
    
    // Füge Bild-URLs hinzu
    applications.forEach(app => {
      if (app.profile_image) {
        app.profile_image_url = getFileUrl(app.profile_image);
      }
    });
    
    // Statistiken
    console.log('[getApplications] Getting statistics...');
    const [stats] = await db.execute(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(*) as total
      FROM applications
    `);
    
    console.log('[getApplications] Stats:', stats[0]);
    console.log('=== GET APPLICATIONS COMPLETE ===\n');
    
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
    console.error('[getApplications] ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: 'Fehler beim Abrufen der Bewerbungen' });
  }
};

// Einzelne Bewerbung abrufen
const getApplication = async (req, res) => {
  console.log('\n=== GET APPLICATION ===');
  console.log('Application ID:', req.params.id);
  
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
      console.log('[getApplication] Application not found');
      return res.status(404).json({ message: 'Bewerbung nicht gefunden' });
    }
    
    const application = applications[0];
    console.log('[getApplication] Found application:', application.email);
    
    // Füge Bild-URL hinzu
    if (application.profile_image) {
      application.profile_image_url = getFileUrl(application.profile_image);
    }
    
    console.log('=== GET APPLICATION COMPLETE ===\n');
    res.json(application);
    
  } catch (error) {
    console.error('[getApplication] ERROR:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Bewerbung' });
  }
};

// Neue Bewerbung einreichen (öffentlich)
const submitApplication = async (req, res) => {
  console.log('\n=== SUBMIT APPLICATION ===');
  console.log('Request body:', { ...req.body, privacyAgreed: req.body.privacyAgreed });
  console.log('File uploaded:', req.file ? 'Yes' : 'No');
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('[submitApplication] Transaction started');
    
    // Validierung
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[submitApplication] Validation errors:', errors.array());
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
    console.log('[submitApplication] Checking if email exists...');
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser.length > 0) {
      console.log('[submitApplication] Email already exists in users table');
      if (req.file) {
        await deleteFile(req.file.filename);
      }
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Diese E-Mail-Adresse ist bereits registriert' 
      });
    }
    
    // Prüfe ob bereits eine Bewerbung existiert
    console.log('[submitApplication] Checking for existing application...');
    const [existingApplication] = await connection.execute(
      'SELECT id, status FROM applications WHERE email = ? AND status = "pending"',
      [email]
    );
    
    if (existingApplication.length > 0) {
      console.log('[submitApplication] Pending application already exists');
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
    console.log('[submitApplication] Saving application...');
    
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
    
    console.log('[submitApplication] Application saved with ID:', result.insertId);
    
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
    console.log('[submitApplication] Transaction committed');
    console.log('=== SUBMIT APPLICATION COMPLETE ===\n');
    
    res.status(201).json({ 
      message: 'Bewerbung erfolgreich eingereicht',
      applicationId: result.insertId 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('[submitApplication] ERROR:', error);
    console.error('Stack:', error.stack);
    
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
  console.log('\n=== ACCEPT APPLICATION ===');
  console.log('Time:', new Date().toISOString());
  console.log('Application ID:', req.params.id);
  console.log('Request body:', req.body);
  console.log('Admin user:', req.user);
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('[acceptApplication] Transaction started');
    
    const { id } = req.params;
    const { qualifications = [] } = req.body;
    const adminId = req.user.id;
    
    // Hole Bewerbungsdaten
    console.log('[acceptApplication] Fetching application...');
    const [applications] = await connection.execute(
      'SELECT * FROM applications WHERE id = ? AND status = "pending"',
      [id]
    );
    
    if (applications.length === 0) {
      console.log('[acceptApplication] Application not found or already processed');
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Bewerbung nicht gefunden oder bereits bearbeitet' 
      });
    }
    
    const application = applications[0];
    console.log('[acceptApplication] Application found:', application.email);
    
    // Erstelle User Account
    console.log('[acceptApplication] Creating user account...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Tage
    const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    
    const [userResult] = await connection.execute(
      `INSERT INTO users (email, password, role, is_active, reset_token, reset_token_expires)
       VALUES (?, ?, 'staff', 1, ?, ?)`,
      [application.email, hashedPassword, resetToken, resetTokenExpires]
    );
    
    const userId = userResult.insertId;
    console.log('[acceptApplication] User created with ID:', userId);
    
    // Generiere Personal-Code
    console.log('[acceptApplication] Generating personal code...');
    let personalCode;
    try {
      personalCode = await generatePersonalCode(connection);
      console.log('[acceptApplication] Personal code generated:', personalCode);
    } catch (error) {
      console.error('[acceptApplication] Error generating personal code:', error);
      throw error;
    }
    
    // Erstelle Staff Profile
    console.log('[acceptApplication] Creating staff profile...');
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
    console.log('[acceptApplication] Staff profile created with ID:', staffId);
    
    // Füge Qualifikationen hinzu
    if (qualifications.length > 0) {
      console.log('[acceptApplication] Adding qualifications:', qualifications);
      for (const qId of qualifications) {
        await connection.execute(
          `INSERT INTO staff_qualifications (staff_id, qualification_id, assigned_by)
           VALUES (?, ?, ?)`,
          [staffId, qId, adminId]
        );
      }
      console.log('[acceptApplication] Qualifications added');
    }
    
    // Update Bewerbungsstatus
    console.log('[acceptApplication] Updating application status...');
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
    console.log('[acceptApplication] Attempting to send email...');
    try {
      await sendApplicationAcceptedEmail(
        application.email,
        application.first_name,
        application.last_name,
        resetToken
      );
      console.log('[acceptApplication] Email sent successfully');
    } catch (emailError) {
      console.error('[acceptApplication] Email error:', emailError);
      console.log('[acceptApplication] Continuing despite email error...');
      // Trotzdem fortfahren - E-Mail ist nicht kritisch
    }
    
    await connection.commit();
    console.log('[acceptApplication] Transaction committed successfully');
    console.log('=== ACCEPT APPLICATION COMPLETE ===\n');
    
    res.json({ 
      message: 'Bewerbung erfolgreich angenommen',
      staffId,
      personalCode 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('[acceptApplication] ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Fehler beim Annehmen der Bewerbung',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
    console.log('[acceptApplication] Connection released');
  }
};

// Bewerbung ablehnen
const rejectApplication = async (req, res) => {
  console.log('\n=== REJECT APPLICATION ===');
  console.log('Application ID:', req.params.id);
  console.log('Rejection reason:', req.body.reason);
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('[rejectApplication] Transaction started');
    
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    
    // Hole Bewerbungsdaten
    console.log('[rejectApplication] Fetching application...');
    const [applications] = await connection.execute(
      'SELECT * FROM applications WHERE id = ? AND status = "pending"',
      [id]
    );
    
    if (applications.length === 0) {
      console.log('[rejectApplication] Application not found or already processed');
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Bewerbung nicht gefunden oder bereits bearbeitet' 
      });
    }
    
    const application = applications[0];
    console.log('[rejectApplication] Application found:', application.email);
    
    // Update Bewerbungsstatus
    console.log('[rejectApplication] Updating application status...');
    await connection.execute(
      `UPDATE applications 
       SET status = 'rejected', rejection_reason = ?, 
           processed_by = ?, processed_at = NOW()
       WHERE id = ?`,
      [reason || null, adminId, id]
    );
    
    // Lösche Profilbild
    if (application.profile_image) {
      console.log('[rejectApplication] Deleting profile image...');
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
    console.log('[rejectApplication] Attempting to send email...');
    try {
      await sendApplicationRejectedEmail(
        application.email,
        application.first_name,
        application.last_name
      );
      console.log('[rejectApplication] Email sent successfully');
    } catch (emailError) {
      console.error('[rejectApplication] Email error:', emailError);
      console.log('[rejectApplication] Continuing despite email error...');
      // Trotzdem fortfahren - E-Mail ist nicht kritisch
    }
    
    await connection.commit();
    console.log('[rejectApplication] Transaction committed');
    console.log('=== REJECT APPLICATION COMPLETE ===\n');
    
    res.json({ message: 'Bewerbung wurde abgelehnt' });
    
  } catch (error) {
    await connection.rollback();
    console.error('[rejectApplication] ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Fehler beim Ablehnen der Bewerbung',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
    console.log('[rejectApplication] Connection released');
  }
};

// Bewerbung löschen (nur abgelehnte)
const deleteApplication = async (req, res) => {
  console.log('\n=== DELETE APPLICATION ===');
  console.log('Application ID:', req.params.id);
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('[deleteApplication] Transaction started');
    
    const { id } = req.params;
    const adminId = req.user.id;
    
    // Prüfe ob Bewerbung existiert und abgelehnt wurde
    console.log('[deleteApplication] Checking application status...');
    const [applications] = await connection.execute(
      'SELECT * FROM applications WHERE id = ? AND status = "rejected"',
      [id]
    );
    
    if (applications.length === 0) {
      console.log('[deleteApplication] Application not found or not rejected');
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Bewerbung nicht gefunden oder kann nicht gelöscht werden' 
      });
    }
    
    const application = applications[0];
    console.log('[deleteApplication] Application can be deleted:', application.email);
    
    // Lösche Profilbild
    if (application.profile_image) {
      console.log('[deleteApplication] Deleting profile image...');
      await deleteFile(application.profile_image);
    }
    
    // Lösche Bewerbung
    console.log('[deleteApplication] Deleting application...');
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
    console.log('[deleteApplication] Transaction committed');
    console.log('=== DELETE APPLICATION COMPLETE ===\n');
    
    res.json({ message: 'Bewerbung wurde gelöscht' });
    
  } catch (error) {
    await connection.rollback();
    console.error('[deleteApplication] ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Fehler beim Löschen der Bewerbung',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
    console.log('[deleteApplication] Connection released');
  }
};

// Statistiken abrufen
const getApplicationStats = async (req, res) => {
  console.log('\n=== GET APPLICATION STATS ===');
  console.log('Query params:', req.query);
  
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    // Monatliche Statistiken
    console.log('[getApplicationStats] Getting monthly stats...');
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
    console.log('[getApplicationStats] Getting total stats...');
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
    console.log('[getApplicationStats] Getting top cities...');
    const [topCities] = await db.execute(`
      SELECT 
        city,
        COUNT(*) as count
      FROM applications
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('=== GET APPLICATION STATS COMPLETE ===\n');
    
    res.json({
      monthlyStats,
      totalStats: totalStats[0],
      topCities
    });
    
  } catch (error) {
    console.error('[getApplicationStats] ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Statistiken',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
