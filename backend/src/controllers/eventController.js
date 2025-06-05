// backend/src/controllers/eventController.js
const db = require('../config/database');
const { validationResult } = require('express-validator');
const { sendEventInvitationEmail, sendShiftAssignmentEmail } = require('../services/emailService');
const { format, parseISO } = require('date-fns');
const { de } = require('date-fns/locale');

// Alle Events abrufen
const getAllEvents = async (req, res) => {
  try {
    const {
      status,
      upcoming,
      search,
      from,
      to,
      page = 1,
      limit = 20,
      sort = 'date'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        e.id,
        e.name,
        e.description,
        e.location,
        e.start_date,
        e.end_date,
        e.status,
        e.max_staff,
        e.created_at,
        u.email as creator_email,
        CONCAT(sp.first_name, ' ', sp.last_name) as creator_name,
        COUNT(DISTINCT s.id) as shift_count,
        COUNT(DISTINCT sa.id) as assigned_staff,
        COUNT(DISTINCT ei.id) as invited_staff,
        COUNT(DISTINCT CASE WHEN ei.status = 'accepted' THEN ei.id END) as accepted_staff
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      LEFT JOIN shifts s ON e.id = s.event_id
      LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
      LEFT JOIN event_invitations ei ON e.id = ei.event_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Status Filter
    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }
    
    // Upcoming Filter
    if (upcoming === 'true') {
      query += ' AND e.start_date > NOW()';
    }
    
    // Datumsbereich
    if (from) {
      query += ' AND e.start_date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND e.end_date <= ?';
      params.push(to);
    }
    
    // Suchfilter
    if (search) {
      query += ' AND (e.name LIKE ? OR e.location LIKE ? OR e.description LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    query += ' GROUP BY e.id';
    
    // Sortierung
    switch (sort) {
      case 'date':
        query += ' ORDER BY e.start_date DESC';
        break;
      case 'name':
        query += ' ORDER BY e.name';
        break;
      case 'created':
        query += ' ORDER BY e.created_at DESC';
        break;
      default:
        query += ' ORDER BY e.start_date DESC';
    }
    
    // Zähle Gesamtanzahl
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM events e/,
      'SELECT COUNT(DISTINCT e.id) as total FROM events e'
    ).replace(/GROUP BY e.id[\s\S]*$/, '');
    
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;
    
    // Pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [events] = await db.execute(query, params);
    
    // Füge zusätzliche Informationen hinzu
    for (const event of events) {
      // Berechne Event-Status
      const now = new Date();
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      
      if (event.status === 'cancelled') {
        event.display_status = 'Abgesagt';
        event.status_color = 'ios-red';
      } else if (now > endDate) {
        event.display_status = 'Beendet';
        event.status_color = 'ios-gray';
      } else if (now >= startDate && now <= endDate) {
        event.display_status = 'Läuft';
        event.status_color = 'ios-green';
      } else {
        event.display_status = 'Geplant';
        event.status_color = 'ios-blue';
      }
    }
    
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
    console.error('Fehler beim Abrufen der Events:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Veranstaltungen' 
    });
  }
};

// Einzelnes Event abrufen
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Hole Event-Details
    const [events] = await db.execute(`
      SELECT 
        e.*,
        u.email as creator_email,
        CONCAT(sp.first_name, ' ', sp.last_name) as creator_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE e.id = ?
    `, [id]);
    
    if (events.length === 0) {
      return res.status(404).json({ 
        message: 'Veranstaltung nicht gefunden' 
      });
    }
    
    const event = events[0];
    
    // Hole Schichten
    const [shifts] = await db.execute(`
      SELECT 
        s.*,
        p.name as position_name,
        COUNT(DISTINCT sa.staff_id) as assigned_count
      FROM shifts s
      LEFT JOIN positions p ON s.position_id = p.id
      LEFT JOIN shift_assignments sa ON s.id = sa.shift_id AND sa.status != 'cancelled'
      WHERE s.event_id = ?
      GROUP BY s.id
      ORDER BY s.start_time
    `, [id]);
    
    // Hole eingeladene Mitarbeiter
    const [invitations] = await db.execute(`
      SELECT 
        ei.*,
        sp.id as staff_id,
        CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
        sp.personal_code,
        sp.profile_image,
        u.email as staff_email
      FROM event_invitations ei
      JOIN staff_profiles sp ON ei.staff_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE ei.event_id = ?
      ORDER BY sp.last_name, sp.first_name
    `, [id]);
    
    // Hole Schichteinteilungen
    const [assignments] = await db.execute(`
      SELECT 
        sa.*,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        sp.id as staff_id,
        CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
        sp.personal_code,
        p.name as position_name
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN staff_profiles sp ON sa.staff_id = sp.id
      LEFT JOIN positions p ON sa.position_id = p.id
      WHERE s.event_id = ?
      ORDER BY s.start_time, sp.last_name
    `, [id]);
    
    // Event-Statistiken
    const stats = {
      total_shifts: shifts.length,
      total_positions_needed: shifts.reduce((sum, shift) => sum + shift.required_staff, 0),
      total_assigned: assignments.filter(a => a.status !== 'cancelled').length,
      confirmed_assignments: assignments.filter(a => a.status === 'confirmed').length,
      invited_staff: invitations.length,
      accepted_invitations: invitations.filter(i => i.status === 'accepted').length
    };
    
    res.json({
      ...event,
      shifts,
      invitations,
      assignments,
      stats
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen des Events:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Veranstaltung' 
    });
  }
};

// Neues Event erstellen
const createEvent = async (req, res) => {
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
    
    const {
      name,
      description,
      location,
      start_date,
      end_date,
      max_staff,
      shifts = []
    } = req.body;
    
    const adminId = req.user.id;
    
    // Erstelle Event
    const [result] = await connection.execute(
      `INSERT INTO events (
        name, description, location, start_date, end_date, 
        max_staff, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [name, description, location, start_date, end_date, max_staff || 0, adminId]
    );
    
    const eventId = result.insertId;
    
    // Erstelle Schichten wenn vorhanden
    if (shifts.length > 0) {
      for (const shift of shifts) {
        await connection.execute(
          `INSERT INTO shifts (
            event_id, name, start_time, end_time, 
            required_staff, position_id, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            eventId,
            shift.name,
            shift.start_time,
            shift.end_time,
            shift.required_staff || 1,
            shift.position_id || null,
            shift.description || null
          ]
        );
      }
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'event_created', 'event', ?, ?)`,
      [
        adminId,
        eventId,
        JSON.stringify({
          eventName: name,
          location,
          startDate: start_date
        })
      ]
    );
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Veranstaltung erfolgreich erstellt',
      eventId
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Erstellen des Events:', error);
    res.status(500).json({ 
      message: 'Fehler beim Erstellen der Veranstaltung' 
    });
  } finally {
    connection.release();
  }
};

// Event aktualisieren
const updateEvent = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const updates = req.body;
    const adminId = req.user.id;
    
    // Prüfe ob Event existiert
    const [existing] = await connection.execute(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Veranstaltung nicht gefunden' 
      });
    }
    
    // Update Event
    const allowedFields = [
      'name', 'description', 'location', 
      'start_date', 'end_date', 'max_staff', 'notes'
    ];
    
    const updateFields = [];
    const updateParams = [];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateParams.push(updates[field]);
      }
    });
    
    if (updateFields.length > 0) {
      updateParams.push(id);
      await connection.execute(
        `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'event_updated', 'event', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          eventName: updates.name || existing[0].name,
          updatedFields: Object.keys(updates)
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Veranstaltung erfolgreich aktualisiert'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Aktualisieren des Events:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren der Veranstaltung' 
    });
  } finally {
    connection.release();
  }
};

// Event Status ändern
const updateEventStatus = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.id;
    
    if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ 
        message: 'Ungültiger Status' 
      });
    }
    
    // Hole Event
    const [events] = await connection.execute(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );
    
    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Veranstaltung nicht gefunden' 
      });
    }
    
    const event = events[0];
    
    // Update Status
    await connection.execute(
      'UPDATE events SET status = ? WHERE id = ?',
      [status, id]
    );
    
    // Bei Veröffentlichung: Sende E-Mails an eingeladene Mitarbeiter
    if (status === 'published' && event.status === 'draft') {
      const [invitations] = await connection.execute(`
        SELECT 
          ei.staff_id,
          sp.first_name,
          u.email
        FROM event_invitations ei
        JOIN staff_profiles sp ON ei.staff_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE ei.event_id = ? AND ei.status = 'pending'
      `, [id]);
      
      // Sende E-Mails asynchron
      for (const invitation of invitations) {
        sendEventInvitationEmail(
          invitation.email,
          invitation.first_name,
          event.name,
          event.start_date,
          event.location
        ).catch(err => console.error('E-Mail Fehler:', err));
      }
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'event_status_changed', 'event', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          eventName: event.name,
          oldStatus: event.status,
          newStatus: status
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: `Veranstaltungsstatus erfolgreich auf '${status}' geändert`
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Ändern des Event-Status:', error);
    res.status(500).json({ 
      message: 'Fehler beim Ändern des Status' 
    });
  } finally {
    connection.release();
  }
};

// Mitarbeiter zu Event einladen
const inviteStaffToEvent = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { staff_ids } = req.body;
    const adminId = req.user.id;
    
    if (!Array.isArray(staff_ids) || staff_ids.length === 0) {
      return res.status(400).json({ 
        message: 'Keine Mitarbeiter ausgewählt' 
      });
    }
    
    // Hole Event
    const [events] = await connection.execute(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );
    
    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Veranstaltung nicht gefunden' 
      });
    }
    
    const event = events[0];
    let invitedCount = 0;
    let alreadyInvited = 0;
    
    // Erstelle Einladungen
    for (const staffId of staff_ids) {
      try {
        await connection.execute(
          `INSERT INTO event_invitations (event_id, staff_id, status)
           VALUES (?, ?, 'pending')`,
          [id, staffId]
        );
        invitedCount++;
        
        // Sende E-Mail wenn Event bereits veröffentlicht
        if (event.status === 'published') {
          const [staffData] = await connection.execute(`
            SELECT sp.first_name, u.email
            FROM staff_profiles sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.id = ?
          `, [staffId]);
          
          if (staffData.length > 0) {
            sendEventInvitationEmail(
              staffData[0].email,
              staffData[0].first_name,
              event.name,
              event.start_date,
              event.location
            ).catch(err => console.error('E-Mail Fehler:', err));
          }
        }
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          alreadyInvited++;
        } else {
          throw err;
        }
      }
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'staff_invited_to_event', 'event', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          eventName: event.name,
          invitedCount,
          alreadyInvited
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: `${invitedCount} Mitarbeiter erfolgreich eingeladen`,
      invitedCount,
      alreadyInvited
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Einladen der Mitarbeiter:', error);
    res.status(500).json({ 
      message: 'Fehler beim Einladen der Mitarbeiter' 
    });
  } finally {
    connection.release();
  }
};

// Einladung zurückziehen
const removeInvitation = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id, staffId } = req.params;
    const adminId = req.user.id;
    
    // Lösche Einladung
    const [result] = await connection.execute(
      'DELETE FROM event_invitations WHERE event_id = ? AND staff_id = ?',
      [id, staffId]
    );
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Einladung nicht gefunden' 
      });
    }
    
    // Lösche auch alle Schichtzuweisungen für diesen Mitarbeiter
    await connection.execute(
      `DELETE sa FROM shift_assignments sa
       JOIN shifts s ON sa.shift_id = s.id
       WHERE s.event_id = ? AND sa.staff_id = ?`,
      [id, staffId]
    );
    
    // Aktivitätslog
    const [eventData] = await connection.execute(
      'SELECT name FROM events WHERE id = ?',
      [id]
    );
    
    const [staffData] = await connection.execute(
      'SELECT first_name, last_name FROM staff_profiles WHERE id = ?',
      [staffId]
    );
    
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'invitation_removed', 'event', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          eventName: eventData[0]?.name,
          staffName: `${staffData[0]?.first_name} ${staffData[0]?.last_name}`
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Einladung erfolgreich zurückgezogen'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Zurückziehen der Einladung:', error);
    res.status(500).json({ 
      message: 'Fehler beim Zurückziehen der Einladung' 
    });
  } finally {
    connection.release();
  }
};
// Fügen Sie diese Funktionen zu Ihrem eventController.js hinzu

// Schicht hinzufügen - AKTUALISIERT
const addShift = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id: eventId } = req.params;
    const { 
      name, 
      start_time, 
      end_time, 
      required_staff, 
      min_staff,
      max_staff,
      position_id, 
      description,
      qualification_ids = [] // Neue Qualifikations-IDs
    } = req.body;
    const adminId = req.user.id;
    
    // Prüfe ob Event existiert
    const [events] = await connection.execute(
      'SELECT id, name FROM events WHERE id = ?',
      [eventId]
    );
    
    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Veranstaltung nicht gefunden' 
      });
    }
    
    // Erstelle Schicht
    const [result] = await connection.execute(
      `INSERT INTO shifts (
        event_id, name, start_time, end_time, 
        required_staff, min_staff, max_staff, 
        position_id, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId, name, start_time, end_time, 
        required_staff || 1, 
        min_staff || 0,
        max_staff || 0,
        position_id || null, 
        description || null
      ]
    );
    
    const shiftId = result.insertId;
    
    // Füge Qualifikationen hinzu
    if (qualification_ids.length > 0) {
      const qualificationValues = qualification_ids.map(qId => [shiftId, qId]);
      await connection.query(
        'INSERT INTO shift_qualifications (shift_id, qualification_id) VALUES ?',
        [qualificationValues]
      );
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'shift_created', 'shift', ?, ?)`,
      [
        adminId,
        shiftId,
        JSON.stringify({
          eventName: events[0].name,
          shiftName: name,
          qualificationCount: qualification_ids.length
        })
      ]
    );
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Schicht erfolgreich erstellt',
      shiftId
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Erstellen der Schicht:', error);
    res.status(500).json({ 
      message: 'Fehler beim Erstellen der Schicht' 
    });
  } finally {
    connection.release();
  }
};

// Schicht aktualisieren - AKTUALISIERT
const updateShift = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id: eventId, shiftId } = req.params;
    const updates = req.body;
    const adminId = req.user.id;
    
    // Prüfe ob Schicht zum Event gehört
    const [shifts] = await connection.execute(
      'SELECT id, name FROM shifts WHERE id = ? AND event_id = ?',
      [shiftId, eventId]
    );
    
    if (shifts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Schicht nicht gefunden' 
      });
    }
    
    // Update Schicht-Grunddaten
    const updateFields = [];
    const updateParams = [];
    
    const allowedFields = [
      'name', 'start_time', 'end_time', 
      'required_staff', 'min_staff', 'max_staff',
      'position_id', 'description'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateParams.push(updates[field]);
      }
    });
    
    if (updateFields.length > 0) {
      updateParams.push(shiftId);
      await connection.execute(
        `UPDATE shifts SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );
    }
    
    // Update Qualifikationen wenn vorhanden
    if (updates.qualification_ids && Array.isArray(updates.qualification_ids)) {
      // Lösche alte Qualifikationen
      await connection.execute(
        'DELETE FROM shift_qualifications WHERE shift_id = ?',
        [shiftId]
      );
      
      // Füge neue Qualifikationen hinzu
      if (updates.qualification_ids.length > 0) {
        const qualificationValues = updates.qualification_ids.map(qId => [shiftId, qId]);
        await connection.query(
          'INSERT INTO shift_qualifications (shift_id, qualification_id) VALUES ?',
          [qualificationValues]
        );
      }
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'shift_updated', 'shift', ?, ?)`,
      [
        adminId,
        shiftId,
        JSON.stringify({
          shiftName: shifts[0].name,
          updatedFields: Object.keys(updates)
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Schicht erfolgreich aktualisiert'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Aktualisieren der Schicht:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren der Schicht' 
    });
  } finally {
    connection.release();
  }
};


// Erweiterte Event-Detail Funktion mit Schicht-Qualifikationen
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Hole Event-Details
    const [events] = await db.execute(
      `SELECT e.*, u.email as creator_email, 
              CONCAT(sp.first_name, ' ', sp.last_name) as creator_name
       FROM events e
       JOIN users u ON e.created_by = u.id
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       WHERE e.id = ?`,
      [id]
    );
    
    if (events.length === 0) {
      return res.status(404).json({ 
        message: 'Veranstaltung nicht gefunden' 
      });
    }
    
    const event = events[0];
    
    // Hole Schichten mit Qualifikationen
    const [shifts] = await db.execute(`
      SELECT 
        s.*,
        p.name as position_name,
        GROUP_CONCAT(DISTINCT q.id) as qualification_ids,
        GROUP_CONCAT(DISTINCT q.name ORDER BY q.name SEPARATOR ', ') as required_qualifications,
        COUNT(DISTINCT sa.staff_id) as assigned_count,
        COUNT(DISTINCT sapp.staff_id) as applicant_count
      FROM shifts s
      LEFT JOIN positions p ON s.position_id = p.id
      LEFT JOIN shift_qualifications sq ON s.id = sq.shift_id
      LEFT JOIN qualifications q ON sq.qualification_id = q.id
      LEFT JOIN shift_assignments sa ON s.id = sa.shift_id AND sa.status != 'cancelled'
      LEFT JOIN shift_applications sapp ON s.id = sapp.shift_id AND sapp.status = 'pending'
      WHERE s.event_id = ?
      GROUP BY s.id
      ORDER BY s.start_time
    `, [id]);
    
    // Parse qualification_ids zurück zu Array
    shifts.forEach(shift => {
      shift.qualification_ids = shift.qualification_ids 
        ? shift.qualification_ids.split(',').map(id => parseInt(id))
        : [];
    });
    
    // Hole Einladungen
    const [invitations] = await db.execute(`
      SELECT 
        ei.*,
        sp.id as staff_id,
        CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
        sp.personal_code,
        sp.profile_image,
        u.email as staff_email
      FROM event_invitations ei
      JOIN staff_profiles sp ON ei.staff_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE ei.event_id = ?
      ORDER BY ei.invited_at DESC
    `, [id]);
    
    // Hole Event-Statistiken
    const [stats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT s.id) as total_shifts,
        COALESCE(SUM(s.required_staff), 0) as total_positions_needed,
        COUNT(DISTINCT ei.staff_id) as invited_staff,
        COUNT(DISTINCT CASE WHEN ei.status = 'accepted' THEN ei.staff_id END) as accepted_invitations,
        COUNT(DISTINCT sa.staff_id) as assigned_staff,
        COUNT(DISTINCT CASE WHEN sa.status = 'confirmed' THEN sa.staff_id END) as confirmed_staff
      FROM events e
      LEFT JOIN shifts s ON e.id = s.event_id
      LEFT JOIN event_invitations ei ON e.id = ei.event_id
      LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
      WHERE e.id = ?
    `, [id]);
    
    res.json({
      ...event,
      shifts,
      invitations,
      stats: stats[0]
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Veranstaltung:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Veranstaltung' 
    });
  }
};


// Schicht löschen
const deleteShift = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id, shiftId } = req.params;
    const adminId = req.user.id;
    
    // Prüfe ob Schicht zu Event gehört
    const [shifts] = await connection.execute(
      'SELECT name FROM shifts WHERE id = ? AND event_id = ?',
      [shiftId, id]
    );
    
    if (shifts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Schicht nicht gefunden' 
      });
    }
    
    // Lösche Schicht (CASCADE löscht auch Zuweisungen)
    await connection.execute(
      'DELETE FROM shifts WHERE id = ?',
      [shiftId]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'shift_deleted', 'shift', ?, ?)`,
      [
        adminId,
        shiftId,
        JSON.stringify({
          shiftName: shifts[0].name
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Schicht erfolgreich gelöscht'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Löschen der Schicht:', error);
    res.status(500).json({ 
      message: 'Fehler beim Löschen der Schicht' 
    });
  } finally {
    connection.release();
  }
};

// Event-Statistiken
const getEventStatistics = async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    
    // Monatliche Event-Statistiken
    const [monthlyStats] = await db.execute(`
      SELECT 
        MONTH(start_date) as month,
        COUNT(*) as event_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM events
      WHERE YEAR(start_date) = ?
      GROUP BY MONTH(start_date)
      ORDER BY month
    `, [year]);
    
    // Top Locations
    const [topLocations] = await db.execute(`
      SELECT 
        location,
        COUNT(*) as event_count,
        COUNT(DISTINCT MONTH(start_date)) as active_months
      FROM events
      WHERE status != 'cancelled'
      GROUP BY location
      ORDER BY event_count DESC
      LIMIT 10
    `);
    
    // Durchschnittliche Teilnehmerzahlen
    const [avgParticipation] = await db.execute(`
      SELECT 
        AVG(stats.invited) as avg_invited,
        AVG(stats.accepted) as avg_accepted,
        AVG(stats.assigned) as avg_assigned,
        AVG(stats.confirmed) as avg_confirmed
      FROM (
        SELECT 
          e.id,
          COUNT(DISTINCT ei.staff_id) as invited,
          COUNT(DISTINCT CASE WHEN ei.status = 'accepted' THEN ei.staff_id END) as accepted,
          COUNT(DISTINCT sa.staff_id) as assigned,
          COUNT(DISTINCT CASE WHEN sa.status = 'confirmed' THEN sa.staff_id END) as confirmed
        FROM events e
        LEFT JOIN event_invitations ei ON e.id = ei.event_id
        LEFT JOIN shifts s ON e.id = s.event_id
        LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
        WHERE e.status = 'completed'
        GROUP BY e.id
      ) as stats
    `);
    
    res.json({
      monthlyStats,
      topLocations,
      avgParticipation: avgParticipation[0]
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Event-Statistiken:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Statistiken' 
    });
  }
};

// Staff: Event-Einladungen abrufen
const getMyInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    
    // Hole Staff ID
    const [staffResult] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (staffResult.length === 0) {
      return res.status(404).json({ 
        message: 'Mitarbeiterprofil nicht gefunden' 
      });
    }
    
    const staffId = staffResult[0].id;
    
    let query = `
      SELECT 
        ei.*,
        e.name as event_name,
        e.description as event_description,
        e.location,
        e.start_date,
        e.end_date,
        e.status as event_status,
        COUNT(DISTINCT s.id) as shift_count
      FROM event_invitations ei
      JOIN events e ON ei.event_id = e.id
      LEFT JOIN shifts s ON e.id = s.event_id
      WHERE ei.staff_id = ?
        AND e.status = 'published'
    `;
    
    const params = [staffId];
    
    if (status) {
      query += ' AND ei.status = ?';
      params.push(status);
    }
    
    query += ' GROUP BY ei.id ORDER BY e.start_date';
    
    const [invitations] = await db.execute(query, params);
    
    res.json({ invitations });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Einladungen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Einladungen' 
    });
  }
};

// Staff: Einladung annehmen/ablehnen
const respondToInvitation = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { invitationId } = req.params;
    const { response } = req.body; // 'accepted' oder 'declined'
    const userId = req.user.id;
    
    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ 
        message: 'Ungültige Antwort' 
      });
    }
    
    // Hole Staff ID
    const [staffResult] = await connection.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (staffResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Mitarbeiterprofil nicht gefunden' 
      });
    }
    
    const staffId = staffResult[0].id;
    
    // Prüfe ob Einladung existiert und zu diesem Mitarbeiter gehört
    const [invitations] = await connection.execute(
      `SELECT ei.*, e.name as event_name
       FROM event_invitations ei
       JOIN events e ON ei.event_id = e.id
       WHERE ei.id = ? AND ei.staff_id = ?`,
      [invitationId, staffId]
    );
    
    if (invitations.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Einladung nicht gefunden' 
      });
    }
    
    const invitation = invitations[0];
    
    // Update Einladungsstatus
    await connection.execute(
      'UPDATE event_invitations SET status = ?, responded_at = NOW() WHERE id = ?',
      [response, invitationId]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'event_invitation', ?, ?)`,
      [
        userId,
        response === 'accepted' ? 'invitation_accepted' : 'invitation_declined',
        invitationId,
        JSON.stringify({
          eventName: invitation.event_name,
          eventId: invitation.event_id
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: `Einladung erfolgreich ${response === 'accepted' ? 'angenommen' : 'abgelehnt'}`
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Beantworten der Einladung:', error);
    res.status(500).json({ 
      message: 'Fehler beim Beantworten der Einladung' 
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  // Admin
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
  inviteStaffToEvent,
  removeInvitation,
  addShift,
  updateShift,
  deleteShift,
  getEventStatistics,
  
  // Staff
  getMyInvitations,
  respondToInvitation
};

