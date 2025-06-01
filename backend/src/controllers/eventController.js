// backend/src/controllers/eventController.js
const db = require('../config/database');
const emailService = require('../services/emailService');

// Get all events (different views for admin and staff)
const getAllEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, search, startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query;
    let countQuery;
    let params = [];
    let countParams = [];

    if (userRole === 'admin') {
      // Admin sees all events
      query = `
        SELECT 
          e.*,
          u.email as creator_email,
          CONCAT(sp.first_name, ' ', sp.last_name) as creator_name,
          (SELECT COUNT(*) FROM event_invitations WHERE event_id = e.id) as invitation_count,
          (SELECT COUNT(*) FROM event_invitations WHERE event_id = e.id AND status = 'accepted') as accepted_count,
          (SELECT COUNT(*) FROM shifts WHERE event_id = e.id) as shift_count
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN staff_profiles sp ON u.id = sp.user_id
        WHERE 1=1
      `;
      
      countQuery = 'SELECT COUNT(*) as total FROM events e WHERE 1=1';
    } else {
      // Staff sees only events they're invited to
      const [staffProfile] = await db.execute(
        'SELECT id FROM staff_profiles WHERE user_id = ?',
        [userId]
      );

      if (staffProfile.length === 0) {
        return res.json({ events: [], pagination: { total: 0, page: 1, pages: 0 } });
      }

      const staffId = staffProfile[0].id;

      query = `
        SELECT 
          e.*,
          ei.status as invitation_status,
          ei.responded_at,
          (SELECT COUNT(*) FROM shifts WHERE event_id = e.id) as shift_count,
          (SELECT COUNT(*) FROM shift_registrations sr 
           JOIN shifts s ON sr.shift_id = s.id 
           WHERE s.event_id = e.id AND sr.staff_id = ?) as my_shift_count
        FROM events e
        JOIN event_invitations ei ON e.id = ei.event_id
        WHERE ei.staff_id = ? AND e.status != 'draft'
      `;
      
      params = [staffId, staffId];
      countParams = [staffId];
      
      countQuery = `
        SELECT COUNT(*) as total 
        FROM events e
        JOIN event_invitations ei ON e.id = ei.event_id
        WHERE ei.staff_id = ? AND e.status != 'draft'
      `;
    }

    // Add filters
    if (status) {
      query += ' AND e.status = ?';
      countQuery += ' AND e.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      query += ' AND (e.name LIKE ? OR e.location LIKE ?)';
      countQuery += ' AND (e.name LIKE ? OR e.location LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern);
    }

    if (startDate) {
      query += ' AND e.start_date >= ?';
      countQuery += ' AND e.start_date >= ?';
      params.push(startDate);
      countParams.push(startDate);
    }

    if (endDate) {
      query += ' AND e.end_date <= ?';
      countQuery += ' AND e.end_date <= ?';
      params.push(endDate);
      countParams.push(endDate);
    }

    // Count total
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Add sorting and pagination
    query += ' ORDER BY e.start_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    // Execute query
    const [events] = await db.execute(query, params);

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Veranstaltungen'
    });
  }
};

// Get single event
const getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Base query
    let query = `
      SELECT 
        e.*,
        u.email as creator_email,
        CONCAT(sp.first_name, ' ', sp.last_name) as creator_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE e.id = ?
    `;

    const [events] = await db.execute(query, [id]);

    if (events.length === 0) {
      return res.status(404).json({ message: 'Veranstaltung nicht gefunden' });
    }

    const event = events[0];

    // Check permissions for staff
    if (userRole !== 'admin') {
      const [staffProfile] = await db.execute(
        'SELECT id FROM staff_profiles WHERE user_id = ?',
        [userId]
      );

      if (staffProfile.length > 0) {
        const [invitation] = await db.execute(
          'SELECT * FROM event_invitations WHERE event_id = ? AND staff_id = ?',
          [id, staffProfile[0].id]
        );

        if (invitation.length === 0 && event.status === 'draft') {
          return res.status(403).json({ message: 'Keine Berechtigung' });
        }

        event.my_invitation = invitation[0] || null;
      }
    }

    // Get shifts
    const [shifts] = await db.execute(
      `SELECT 
        s.*,
        (SELECT COUNT(*) FROM shift_registrations WHERE shift_id = s.id) as registered_count,
        (SELECT COUNT(*) FROM shift_registrations WHERE shift_id = s.id AND status = 'confirmed') as confirmed_count
      FROM shifts s 
      WHERE s.event_id = ? 
      ORDER BY s.start_time`,
      [id]
    );

    event.shifts = shifts;

    // Get invitations (admin only)
    if (userRole === 'admin') {
      const [invitations] = await db.execute(
        `SELECT 
          ei.*,
          CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
          sp.personal_code
        FROM event_invitations ei
        JOIN staff_profiles sp ON ei.staff_id = sp.id
        WHERE ei.event_id = ?
        ORDER BY sp.last_name, sp.first_name`,
        [id]
      );

      event.invitations = invitations;
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Veranstaltung'
    });
  }
};

// Create event
const createEvent = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      name,
      description,
      start_date,
      end_date,
      location,
      status = 'draft'
    } = req.body;

    const created_by = req.user.id;

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (endDate < startDate) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Enddatum muss nach dem Startdatum liegen'
      });
    }

    // Create event
    const [result] = await connection.execute(
      `INSERT INTO events (name, description, start_date, end_date, location, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, start_date, end_date, location, status, created_by]
    );

    const eventId = result.insertId;

    await connection.commit();

    // Get created event
    const [newEvent] = await db.execute(
      'SELECT * FROM events WHERE id = ?',
      [eventId]
    );

    res.status(201).json({
      message: 'Veranstaltung erfolgreich erstellt',
      event: newEvent[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create event error:', error);
    res.status(500).json({
      message: 'Fehler beim Erstellen der Veranstaltung'
    });
  } finally {
    connection.release();
  }
};

// Update event
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if event exists
    const [existing] = await db.execute(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Veranstaltung nicht gefunden' });
    }

    // Build update query
    const allowedFields = ['name', 'description', 'start_date', 'end_date', 'location', 'status'];
    const updateFields = [];
    const values = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Keine Änderungen angegeben' });
    }

    // Validate dates if provided
    if (updates.start_date && updates.end_date) {
      const startDate = new Date(updates.start_date);
      const endDate = new Date(updates.end_date);

      if (endDate < startDate) {
        return res.status(400).json({
          message: 'Enddatum muss nach dem Startdatum liegen'
        });
      }
    }

    values.push(id);

    await db.execute(
      `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated event
    const [updatedEvent] = await db.execute(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Veranstaltung erfolgreich aktualisiert',
      event: updatedEvent[0]
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      message: 'Fehler beim Aktualisieren der Veranstaltung'
    });
  }
};

// Delete event
const deleteEvent = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Check if event exists
    const [existing] = await connection.execute(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Veranstaltung nicht gefunden' });
    }

    // Check if event has started
    const event = existing[0];
    if (new Date(event.start_date) < new Date()) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Vergangene oder laufende Veranstaltungen können nicht gelöscht werden'
      });
    }

    // Delete event (cascades to shifts, invitations, etc.)
    await connection.execute('DELETE FROM events WHERE id = ?', [id]);

    await connection.commit();

    res.json({ message: 'Veranstaltung erfolgreich gelöscht' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete event error:', error);
    res.status(500).json({
      message: 'Fehler beim Löschen der Veranstaltung'
    });
  } finally {
    connection.release();
  }
};

// Invite staff to event
const inviteStaff = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { staff_ids, send_email = true } = req.body;

    if (!Array.isArray(staff_ids) || staff_ids.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Keine Mitarbeiter ausgewählt'
      });
    }

    // Check if event exists
    const [event] = await connection.execute(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );

    if (event.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Veranstaltung nicht gefunden' });
    }

    // Prepare invitation data
    const invitations = staff_ids.map(staff_id => [id, staff_id, 'pending']);

    // Insert invitations (ignore duplicates)
    await connection.query(
      'INSERT IGNORE INTO event_invitations (event_id, staff_id, status) VALUES ?',
      [invitations]
    );

    // Get invited staff details for email
    if (send_email) {
      const [invitedStaff] = await connection.execute(
        `SELECT 
          sp.first_name, sp.last_name, u.email
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.id IN (?)`,
        [staff_ids]
      );

      // Send invitation emails
      for (const staff of invitedStaff) {
        await emailService.sendEventInvitationEmail(
          staff.email,
          staff.first_name,
          event[0].name,
          event[0].start_date,
          event[0].location,
          event[0].description
        );
      }
    }

    await connection.commit();

    res.json({
      message: `${staff_ids.length} Mitarbeiter erfolgreich eingeladen`,
      invited_count: staff_ids.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('Invite staff error:', error);
    res.status(500).json({
      message: 'Fehler beim Einladen der Mitarbeiter'
    });
  } finally {
    connection.release();
  }
};

// Get event shifts (for staff)
const getEventShifts = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get staff profile
    const [staffProfile] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );

    if (staffProfile.length === 0) {
      return res.status(403).json({ message: 'Kein Mitarbeiterprofil gefunden' });
    }

    const staffId = staffProfile[0].id;

    // Check if invited to event
    const [invitation] = await db.execute(
      'SELECT * FROM event_invitations WHERE event_id = ? AND staff_id = ?',
      [id, staffId]
    );

    if (invitation.length === 0) {
      return res.status(403).json({ message: 'Nicht zu dieser Veranstaltung eingeladen' });
    }

    // Get shifts with registration status
    const [shifts] = await db.execute(
      `SELECT 
        s.*,
        sr.status as my_status,
        sr.assignment_type,
        (SELECT COUNT(*) FROM shift_registrations WHERE shift_id = s.id) as registered_count
      FROM shifts s
      LEFT JOIN shift_registrations sr ON s.id = sr.shift_id AND sr.staff_id = ?
      WHERE s.event_id = ?
      ORDER BY s.start_time`,
      [staffId, id]
    );

    res.json({ shifts });
  } catch (error) {
    console.error('Get event shifts error:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Schichten'
    });
  }
};

// Register for shift
const registerForShift = async (req, res) => {
  try {
    const { eventId, shiftId } = req.params;
    const { action = 'register' } = req.body; // register or unregister
    const userId = req.user.id;

    // Get staff profile
    const [staffProfile] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );

    if (staffProfile.length === 0) {
      return res.status(403).json({ message: 'Kein Mitarbeiterprofil gefunden' });
    }

    const staffId = staffProfile[0].id;

    // Check if invited to event
    const [invitation] = await db.execute(
      'SELECT * FROM event_invitations WHERE event_id = ? AND staff_id = ? AND status = "accepted"',
      [eventId, staffId]
    );

    if (invitation.length === 0) {
      return res.status(403).json({ 
        message: 'Sie müssen die Einladung erst annehmen' 
      });
    }

    // Check if shift belongs to event
    const [shift] = await db.execute(
      'SELECT * FROM shifts WHERE id = ? AND event_id = ?',
      [shiftId, eventId]
    );

    if (shift.length === 0) {
      return res.status(404).json({ message: 'Schicht nicht gefunden' });
    }

    if (action === 'register') {
      // Register for shift
      await db.execute(
        'INSERT INTO shift_registrations (shift_id, staff_id, status) VALUES (?, ?, "interested") ON DUPLICATE KEY UPDATE status = "interested"',
        [shiftId, staffId]
      );
      
      res.json({ message: 'Erfolgreich für Schicht angemeldet' });
    } else {
      // Unregister from shift (only if not assigned)
      const [existing] = await db.execute(
        'SELECT * FROM shift_registrations WHERE shift_id = ? AND staff_id = ?',
        [shiftId, staffId]
      );

      if (existing.length > 0 && existing[0].status !== 'interested') {
        return res.status(400).json({
          message: 'Sie können sich nicht abmelden, da Sie bereits eingeteilt sind'
        });
      }

      await db.execute(
        'DELETE FROM shift_registrations WHERE shift_id = ? AND staff_id = ? AND status = "interested"',
        [shiftId, staffId]
      );

      res.json({ message: 'Erfolgreich von Schicht abgemeldet' });
    }
  } catch (error) {
    console.error('Register for shift error:', error);
    res.status(500).json({
      message: 'Fehler bei der Schichtanmeldung'
    });
  }
};

// Respond to event invitation (for staff)
const respondToInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body; // 'accept' or 'decline'
    const userId = req.user.id;

    if (!['accept', 'decline'].includes(response)) {
      return res.status(400).json({ message: 'Ungültige Antwort' });
    }

    // Get staff profile
    const [staffProfile] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );

    if (staffProfile.length === 0) {
      return res.status(403).json({ message: 'Kein Mitarbeiterprofil gefunden' });
    }

    const staffId = staffProfile[0].id;

    // Update invitation
    const status = response === 'accept' ? 'accepted' : 'declined';

    const [result] = await db.execute(
      'UPDATE event_invitations SET status = ?, responded_at = NOW() WHERE event_id = ? AND staff_id = ?',
      [status, id, staffId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Einladung nicht gefunden' });
    }

    res.json({
      message: response === 'accept' ? 'Einladung angenommen' : 'Einladung abgelehnt'
    });
  } catch (error) {
    console.error('Respond to invitation error:', error);
    res.status(500).json({
      message: 'Fehler beim Beantworten der Einladung'
    });
  }
};

module.exports = {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  inviteStaff,
  getEventShifts,
  registerForShift,
  respondToInvitation
};
