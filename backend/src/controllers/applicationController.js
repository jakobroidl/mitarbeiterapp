const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');
const { deleteFile } = require('../middleware/upload');

// Submit new application
const submitApplication = async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      birthDate,
      street,
      houseNumber,
      postalCode,
      city,
      phone,
      tshirtSize,
      privacyAgreed
    } = req.body;

    // Check if email already exists
    const [existing] = await db.execute(
      'SELECT id FROM applications WHERE email = ? AND status != "rejected"',
      [email]
    );

    if (existing.length > 0) {
      // Delete uploaded file if exists
      if (req.file) {
        await deleteFile(req.file.filename);
      }
      return res.status(400).json({
        message: 'Es existiert bereits eine Bewerbung mit dieser E-Mail-Adresse'
      });
    }

    // Save application
    const profileImage = req.file ? req.file.filename : null;

    const [result] = await db.execute(
      `INSERT INTO applications (
        email, first_name, last_name, birth_date, 
        street, house_number, postal_code, city, 
        phone, tshirt_size, profile_image, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        email, firstName, lastName, birthDate,
        street, houseNumber, postalCode, city,
        phone, tshirtSize, profileImage
      ]
    );

    res.status(201).json({
      message: 'Bewerbung erfolgreich eingereicht',
      applicationId: result.insertId
    });
  } catch (error) {
    console.error('Submit application error:', error);
    
    // Delete uploaded file on error
    if (req.file) {
      await deleteFile(req.file.filename);
    }

    res.status(500).json({
      message: 'Fehler beim Einreichen der Bewerbung'
    });
  }
};

// Get all applications (admin only)
const getApplications = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Build query
    let query = `
      SELECT 
        a.*,
        u.email as reviewer_email,
        CONCAT(sp.first_name, ' ', sp.last_name) as reviewer_name
      FROM applications a
      LEFT JOIN users u ON a.reviewed_by = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE 1=1
    `;
    
    const params = [];

    // Add filters
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Count total
    const countQuery = query.replace(
      'SELECT a.*, u.email as reviewer_email, CONCAT(sp.first_name, \' \', sp.last_name) as reviewer_name',
      'SELECT COUNT(*) as total'
    );
    
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;

    // Add pagination
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    // Execute query
    const [applications] = await db.execute(query, params);

    // Add file URLs
    applications.forEach(app => {
      app.profile_image_url = app.profile_image ? `/uploads/profiles/${app.profile_image}` : null;
    });

    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Bewerbungen'
    });
  }
};

// Get single application
const getApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const [applications] = await db.execute(
      `SELECT 
        a.*,
        u.email as reviewer_email,
        CONCAT(sp.first_name, ' ', sp.last_name) as reviewer_name
      FROM applications a
      LEFT JOIN users u ON a.reviewed_by = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE a.id = ?`,
      [id]
    );

    if (applications.length === 0) {
      return res.status(404).json({
        message: 'Bewerbung nicht gefunden'
      });
    }

    const application = applications[0];
    application.profile_image_url = application.profile_image 
      ? `/uploads/profiles/${application.profile_image}` 
      : null;

    res.json(application);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Bewerbung'
    });
  }
};

// Accept application


// backend/src/controllers/applicationController.js
// Ersetze die acceptApplication Funktion mit dieser verbesserten Version:

const acceptApplication = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { qualifications = [] } = req.body;
    const reviewerId = req.user.id;

    console.log('📝 Accepting application ID:', id);

    // Get application
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
    console.log('📋 Application data:', {
      name: `${application.first_name} ${application.last_name}`,
      hasAddress: !!(application.street && application.city)
    });

    // Create user account
    const tempPassword = uuidv4().slice(0, 8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    console.log('👤 Creating user account...');
    const [userResult] = await connection.execute(
      `INSERT INTO users (email, password, role, is_active, reset_token, reset_token_expires) 
       VALUES (?, ?, 'staff', true, ?, ?)`,
      [application.email, hashedPassword, resetToken, resetExpires]
    );

    const userId = userResult.insertId;
    console.log('✅ User created with ID:', userId);

    // Create staff profile with all fields
    const personalCode = 'M' + String(userId).padStart(4, '0');

    console.log('📁 Creating staff profile...');
    
    // Ensure all values are not undefined
    const profileData = {
      user_id: userId,
      first_name: application.first_name || '',
      last_name: application.last_name || '',
      birth_date: application.birth_date || null,
      street: application.street || '',
      house_number: application.house_number || '',
      postal_code: application.postal_code || '',
      city: application.city || '',
      phone: application.phone || '',
      tshirt_size: application.tshirt_size || null,
      profile_image: application.profile_image || null,
      personal_code: personalCode
    };

    console.log('📊 Profile data to insert:', profileData);

    try {
      const [profileResult] = await connection.execute(
        `INSERT INTO staff_profiles (
          user_id, first_name, last_name, birth_date,
          street, house_number, postal_code, city,
          phone, tshirt_size, profile_image, personal_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profileData.user_id,
          profileData.first_name,
          profileData.last_name,
          profileData.birth_date,
          profileData.street,
          profileData.house_number,
          profileData.postal_code,
          profileData.city,
          profileData.phone,
          profileData.tshirt_size,
          profileData.profile_image,
          profileData.personal_code
        ]
      );

      const staffId = profileResult.insertId;
      console.log('✅ Staff profile created with ID:', staffId);

      // Add qualifications
      if (qualifications.length > 0) {
        console.log('🎯 Adding qualifications:', qualifications);
        const qualificationValues = qualifications.map(qId => [staffId, qId]);
        await connection.query(
          'INSERT INTO staff_qualifications (staff_id, qualification_id) VALUES ?',
          [qualificationValues]
        );
        console.log('✅ Qualifications added');
      }

      // Update application status
      await connection.execute(
        'UPDATE applications SET status = "accepted", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
        [reviewerId, id]
      );
      console.log('✅ Application status updated');

      await connection.commit();
      console.log('✅ Transaction committed successfully');

      // Send acceptance email (only if not in test mode)
      try {
        await emailService.sendApplicationAcceptedEmail(
          application.email,
          application.first_name,
          application.last_name,
          resetToken
        );
        console.log('📧 Acceptance email sent');
      } catch (emailError) {
        console.error('📧 Email error (non-critical):', emailError.message);
        // Don't fail the whole operation if email fails
      }

      res.json({
        message: 'Bewerbung erfolgreich angenommen',
        userId,
        personalCode,
        details: {
          name: `${application.first_name} ${application.last_name}`,
          email: application.email,
          addressSaved: !!(profileData.street && profileData.city)
        }
      });

    } catch (insertError) {
      console.error('❌ Error inserting staff profile:', insertError);
      console.error('SQL Error:', insertError.sqlMessage);
      throw insertError; // Re-throw to be caught by outer try-catch
    }

  } catch (error) {
    await connection.rollback();
    console.error('❌ Accept application error:', error);
    console.error('Full error:', error.message);
    
    // Send more specific error message
    let errorMessage = 'Fehler beim Annehmen der Bewerbung';
    
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Datenbankfehler: Fehlende Spalten. Bitte Administrator kontaktieren.';
    } else if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = 'Diese E-Mail-Adresse ist bereits registriert.';
    }
    
    res.status(500).json({
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};


// Reject application
const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const reviewerId = req.user.id;

    const [applications] = await db.execute(
      'SELECT * FROM applications WHERE id = ? AND status = "pending"',
      [id]
    );

    if (applications.length === 0) {
      return res.status(404).json({
        message: 'Bewerbung nicht gefunden oder bereits bearbeitet'
      });
    }

    const application = applications[0];

    await db.execute(
      'UPDATE applications SET status = "rejected", notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [notes || null, reviewerId, id]
    );

    // Send rejection email
    await emailService.sendApplicationRejectedEmail(
      application.email,
      application.first_name,
      application.last_name
    );

    res.json({
      message: 'Bewerbung abgelehnt'
    });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({
      message: 'Fehler beim Ablehnen der Bewerbung'
    });
  }
};

// Delete application
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const [applications] = await db.execute(
      'SELECT profile_image FROM applications WHERE id = ?',
      [id]
    );

    if (applications.length === 0) {
      return res.status(404).json({
        message: 'Bewerbung nicht gefunden'
      });
    }

    // Delete profile image
    if (applications[0].profile_image) {
      await deleteFile(applications[0].profile_image);
    }

    // Delete application
    await db.execute('DELETE FROM applications WHERE id = ?', [id]);

    res.json({
      message: 'Bewerbung gelöscht'
    });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      message: 'Fehler beim Löschen der Bewerbung'
    });
  }
};

module.exports = {
  submitApplication,
  getApplications,
  getApplication,
  acceptApplication,
  rejectApplication,
  deleteApplication
};
