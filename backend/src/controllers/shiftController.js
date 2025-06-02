const db = require('../config/database');
const emailService = require('../services/emailService');

// Get all shifts for an event
const getEventShifts = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const [shifts] = await db.execute(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM shift_registrations WHERE shift_id = s.id) as total_registrations,
        (SELECT COUNT(*) FROM shift_registrations WHERE shift_id = s.id AND status = 'confirmed') as confirmed_count,
        (SELECT COUNT(*) FROM shift_registrations WHERE shift_id = s.id AND status = 'assigned') as assigned_count,
        (SELECT COUNT(*) FROM shift_registrations WHERE shift_id = s.id AND status = 'interested') as interested_count
      FROM shifts s
      WHERE s.event_id = ?
      ORDER BY s.start_time
    `, [eventId]);

    // Get registrations for each shift
    for (let shift of shifts) {
      const [registrations] = await db.execute(`
        SELECT 
          sr.*,
          sp.first_name, sp.last_name, sp.personal_code,
          u.email
        FROM shift_registrations sr
        JOIN staff_profiles sp ON sr.staff_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE sr.shift_id = ?
        ORDER BY sr.status, sp.last_name
      `, [shift.id]);
      
      shift.registrations = registrations;
    }

    res.json({ shifts });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Schichten' });
  }
};

// Create shift
const createShift = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, start_time, end_time, required_staff, required_qualifications, notes } = req.body;

    // Validate times
    if (new Date(end_time) <= new Date(start_time)) {
      return res.status(400).json({ message: 'Endzeit muss nach Startzeit liegen' });
    }

    const [result] = await db.execute(
      `INSERT INTO shifts (event_id, name, start_time, end_time, required_staff, required_qualifications, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId, 
        name, 
        start_time, 
        end_time, 
        required_staff || 1, 
        required_qualifications ? JSON.stringify(required_qualifications) : null,
        notes
      ]
    );

    res.status(201).json({
      message: 'Schicht erfolgreich erstellt',
      shiftId: result.insertId
    });
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen der Schicht' });
  }
};

// Update shift
const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, required_staff, required_qualifications, notes } = req.body;

    // Check if shift exists
    const [existing] = await db.execute('SELECT * FROM shifts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Schicht nicht gefunden' });
    }

    // Validate times if provided
    if (start_time && end_time && new Date(end_time) <= new Date(start_time)) {
      return res.status(400).json({ message: 'Endzeit muss nach Startzeit liegen' });
    }

    // Build update query
    const updates = [];
    const values = [];
    
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (start_time !== undefined) { updates.push('start_time = ?'); values.push(start_time); }
    if (end_time !== undefined) { updates.push('end_time = ?'); values.push(end_time); }
    if (required_staff !== undefined) { updates.push('required_staff = ?'); values.push(required_staff); }
    if (required_qualifications !== undefined) { 
      updates.push('required_qualifications = ?'); 
      values.push(JSON.stringify(required_qualifications)); 
    }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Keine Änderungen angegeben' });
    }

    values.push(id);
    await db.execute(`UPDATE shifts SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Schicht erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Schicht' });
  }
};

// Delete shift
const deleteShift = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if shift has confirmed assignments
    const [assignments] = await db.execute(
      'SELECT COUNT(*) as count FROM shift_registrations WHERE shift_id = ? AND status = "confirmed"',
      [id]
    );

    if (assignments[0].count > 0) {
      return res.status(400).json({ 
        message: 'Schicht kann nicht gelöscht werden, da bereits bestätigte Einteilungen existieren' 
      });
    }

    await db.execute('DELETE FROM shifts WHERE id = ?', [id]);

    res.json({ message: 'Schicht erfolgreich gelöscht' });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ message: 'Fehler beim Löschen der Schicht' });
  }
};

// Assign staff to shift
const assignStaff = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { staff_ids, assignment_type = 'preliminary' } = req.body;

    if (!Array.isArray(staff_ids) || staff_ids.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Keine Mitarbeiter ausgewählt' });
    }

    // Get shift details
    const [shift] = await connection.execute(
      'SELECT s.*, e.name as event_name FROM shifts s JOIN events e ON s.event_id = e.id WHERE s.id = ?',
      [id]
    );

    if (shift.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Schicht nicht gefunden' });
    }

    const shiftData = shift[0];
    const assignedBy = req.user.id;

    // Update or insert assignments
    for (const staff_id of staff_ids) {
      await connection.execute(
        `INSERT INTO shift_registrations (shift_id, staff_id, status, assignment_type, assigned_by)
         VALUES (?, ?, 'assigned', ?, ?)
         ON DUPLICATE KEY UPDATE 
         status = 'assigned', 
         assignment_type = ?, 
         assigned_by = ?,
         updated_at = NOW()`,
        [id, staff_id, assignment_type, assignedBy, assignment_type, assignedBy]
      );

      // Send notification email if final assignment
      if (assignment_type === 'final') {
        const [staffInfo] = await connection.execute(
          'SELECT u.email, sp.first_name FROM staff_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.id = ?',
          [staff_id]
        );

        if (staffInfo.length > 0) {
          const confirmDeadline = new Date(shiftData.start_time);
          confirmDeadline.setDate(confirmDeadline.getDate() - 2); // 2 days before shift

          await emailService.sendShiftAssignmentEmail(
            staffInfo[0].email,
            staffInfo[0].first_name,
            shiftData.event_name,
            `${shiftData.name} - ${new Date(shiftData.start_time).toLocaleString('de-DE')}`,
            assignment_type,
            confirmDeadline
          );
        }
      }
    }

    await connection.commit();

    res.json({
      message: `${staff_ids.length} Mitarbeiter ${assignment_type === 'final' ? 'endgültig' : 'vorläufig'} eingeteilt`
    });
  } catch (error) {
    await connection.rollback();
    console.error('Assign staff error:', error);
    res.status(500).json({ message: 'Fehler bei der Mitarbeitereinteilung' });
  } finally {
    connection.release();
  }
};

// Remove staff from shift
const removeStaff = async (req, res) => {
  try {
    const { id, staffId } = req.params;

    const [result] = await db.execute(
      'DELETE FROM shift_registrations WHERE shift_id = ? AND staff_id = ? AND status != "confirmed"',
      [id, staffId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ 
        message: 'Mitarbeiter kann nicht entfernt werden (nicht gefunden oder bereits bestätigt)' 
      });
    }

    res.json({ message: 'Mitarbeiter erfolgreich von Schicht entfernt' });
  } catch (error) {
    console.error('Remove staff error:', error);
    res.status(500).json({ message: 'Fehler beim Entfernen des Mitarbeiters' });
  }
};

// Confirm shift assignment (for staff)
const confirmAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get staff ID from user ID
    const [staff] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );

    if (staff.length === 0) {
      return res.status(404).json({ message: 'Mitarbeiterprofil nicht gefunden' });
    }

    const staffId = staff[0].id;

    // Update registration
    const [result] = await db.execute(
      `UPDATE shift_registrations 
       SET status = 'confirmed', confirmed_at = NOW() 
       WHERE shift_id = ? AND staff_id = ? AND status = 'assigned' AND assignment_type = 'final'`,
      [id, staffId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ 
        message: 'Keine endgültige Einteilung gefunden oder bereits bestätigt' 
      });
    }

    res.json({ message: 'Schichteinteilung erfolgreich bestätigt' });
  } catch (error) {
    console.error('Confirm assignment error:', error);
    res.status(500).json({ message: 'Fehler beim Bestätigen der Einteilung' });
  }
};

module.exports = {
  getEventShifts,
  createShift,
  updateShift,
  deleteShift,
  assignStaff,
  removeStaff,
  confirmAssignment
};

