const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateResetToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const { getFileUrl } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

// Submit application
const submitApplication = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

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
    } = req.body;

    const profileImage = req.file ? req.file.filename : null;

    // Check if email already exists in applications or users
    const [existingApplications] = await connection.execute(
      'SELECT id FROM applications WHERE email = ? AND status = "pending"',
      [email]
    );

    if (existingApplications.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Es existiert bereits eine offene Bewerbung mit dieser E-Mail-Adresse',
      });
    }

    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Es existiert bereits ein Benutzer mit dieser E-Mail-Adresse',
      });
    }

    // Insert application
    await connection.execute(`
      INSERT INTO applications 
      (email, first_name, last_name, birth_date, street, house_number, 
       postal_code, city, phone, tshirt_size, profile_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      email, firstName, lastName, birthDate, street, houseNumber,
      postalCode, city, phone, tshirtSize, profileImage
    ]);

    await connection.commit();

    res.status(201).json({
      message: 'Bewerbung erfolgreich eingereicht',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Submit application error:', error);
    res.status(500).json({
      message: 'Fehler beim Einreichen der Bewerbung',
    });
  } finally {
    connection.release();
  }
};

// Get all applications (admin)
const getApplications = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

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

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countQuery = query.replace('SELECT a.*,', 'SELECT COUNT(*) as total FROM (SELECT a.id');
    const [countResult] = await db.execute(countQuery + ') as subquery', params);
    const total = countResult[0].total;

    // Get paginated results
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [applications] = await db.execute(query, params);

    // Add file URLs
    applications.forEach(app => {
      app.profile_image_url = getFileUrl(app.profile_image);
    });

    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Bewerbungen',
    });
  }
};

// Get single application (admin)
const getApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const [applications] = await db.execute(`
      SELECT 
        a.*,
        u.email as reviewer_email,
        CONCAT(sp.first_name, ' ', sp.last_name) as reviewer_name
      FROM applications a
      LEFT JOIN users u ON a.reviewed_by = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE a.id = ?
    `, [id]);

    if (applications.length === 0) {
      return res.status(404).json({
        message: 'Bewerbung nicht gefunden',
      });
    }

    const application = applications[0];
    application.profile_image_url = getFileUrl(application.profile_image);

    res.json(application);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Bewerbung',
    });
  }
};

// Accept application (admin)
const acceptApplication = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { qualifications = [] } = req.body;
    const reviewerId = req.user.id;

    // Get application
    const [applications] = await connection.execute(
      'SELECT * FROM applications WHERE id = ? AND status = "pending"',
      [id]
    );

    if (applications.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: 'Bewerbung nicht gefunden oder bereits bearbeitet',
      });
    }

    const application = applications[0];

    // Create user account
    const resetToken = generateResetToken();
    const resetExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const [userResult] = await connection.execute(`
      INSERT INTO users (email, role, is_active, reset_token, reset_token_expires)
      VALUES (?, 'staff', true, ?, ?)
    `, [application.email, resetToken, resetExpires]);

    const userId = userResult.insertId;

    // Generate personal code
    const personalCode = `${new Date().getFullYear()}${String(userId).padStart(4, '0')}`;

    // Create staff profile
    const [profileResult] = await connection.execute(`
      INSERT INTO staff_profiles 
      (user_id, first_name, last_name, birth_date, street, house_number, 
       postal_code, city, phone, tshirt_size, profile_image, personal_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      application.first_name,
      application.last_name,
      application.birth_date,
      application.street,
      application.house_number,
      application.postal_code,
      application.city,
      application.phone,
      application.tshirt_size,
      application.profile_image,
      personalCode
    ]);

    const staffId = profileResult.insertId;

    // Add qualifications
    if (qualifications.length > 0) {
      const qualificationValues = qualifications.map(qualId => [staffId, qualId]);
      await connection.query(
        'INSERT INTO staff_qualifications (staff_id, qualification_id) VALUES ?',
        [qualificationValues]
      );
    }

    // Update application status
    await connection.execute(
      'UPDATE applications SET status = "accepted", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [reviewerId, id]
    );

    // Send acceptance email
    await emailService.sendApplicationAcceptedEmail(
      application.email,
      application.first_name,
      application.last_name,
      resetToken
    );

    await connection.commit();

    res.json({
      message: 'Bewerbung erfolgreich angenommen',
      userId,
      personalCode,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Accept application error:', error);
    res.status(500).json({
      message: 'Fehler beim Annehmen der Bewerbung',
    });
  } finally {
    connection.release();
  }
};

// Reject application (admin)
const rejectApplication = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { notes } = req.body;
    const reviewerId = req.user.id;

    // Get application
    const [applications] = await connection.execute(
      'SELECT * FROM applications WHERE id = ? AND status = "pending"',
      [id]
    );

    if (applications.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: 'Bewerbung nicht gefunden oder bereits bearbeitet',
      });
    }

    const application = applications[0];

    // Update application status
    await connection.execute(
      'UPDATE applications SET status = "rejected", notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [notes, reviewerId, id]
    );

    // Send rejection email
    await emailService.sendApplicationRejectedEmail(
      application.email,
      application.first_name,
      application.last_name
    );

    await connection.commit();

    res.json({
      message: 'Bewerbung abgelehnt',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Reject application error:', error);
    res.status(500).json({
      message: 'Fehler beim Ablehnen der Bewerbung',
    });
  } finally {
    connection.release();
  }
};

// Delete application (admin)
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if application exists and is not accepted
    const [applications] = await db.execute(
      'SELECT status FROM applications WHERE id = ?',
      [id]
    );

    if (applications.length === 0) {
      return res.status(404).json({
        message: 'Bewerbung nicht gefunden',
      });
    }

    if (applications[0].status === 'accepted') {
      return res.status(400).json({
        message: 'Angenommene Bewerbungen können nicht gelöscht werden',
      });
    }

    await db.execute('DELETE FROM applications WHERE id = ?', [id]);

    res.json({
      message: 'Bewerbung erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      message: 'Fehler beim Löschen der Bewerbung',
    });
  }
};

module.exports = {
  submitApplication,
  getApplications,
  getApplication,
  acceptApplication,
  rejectApplication,
  deleteApplication,
};
