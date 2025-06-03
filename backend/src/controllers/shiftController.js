const db = require('../config/database');
const emailService = require('../services/emailService');

// Get single shift details
const getShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    const [shifts] = await db.execute(
      `SELECT 
        s.*,
        e.name as event_name,
        e.location as event_location,
        (SELECT COUNT(*) FROM shift_registrations WHERE shift_id = s.id) as registered_count,
        (SELECT COUNT(*) FROM shift_registrations WHERE shift_id = s.id AND status = 'confirmed') as confirmed_count
      FROM shifts s
      JOIN events e ON s.event_id = e.id
      WHERE s.id = ?`,
      [shiftId]
    );
    
    if (shifts.length === 0) {
      return res.status(404).json({ message: 'Schicht nicht gefunden' });
    }
    
    res.json(shifts[0]);
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Schicht' });
  }
};

// Update shift (direct update without event context)
const updateShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { name, start_time, end_time, required_staff, notes } = req.body;
    
    // Check if shift exists
    const [existing] = await db.execute(
      'SELECT id FROM shifts WHERE id = ?',
      [shiftId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Schicht nicht gefunden' });
    }
    
    // Build update query
    const updateFields = [];
    const values = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }
    if (start_time !== undefined) {
      updateFields.push('start_time = ?');
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updateFields.push('end_time = ?');
      values.push(end_time);
    }
    if (required_staff !== undefined) {
      updateFields.push('required_staff = ?');
      values.push(required_staff);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      values.push(notes);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Keine Änderungen angegeben' });
    }
    
    values.push(shiftId);
    
    await db.execute(
      `UPDATE shifts SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
    
    res.json({ message: 'Schicht erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Schicht' });
  }
};

// Delete shift (direct delete without event context)
const deleteShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    // Check if shift has registrations
    const [registrations] = await db.execute(
      'SELECT COUNT(*) as count FROM shift_registrations WHERE shift_id = ?',
      [shiftId]
    );
    
    if (registrations[0].count > 0) {
      return res.status(400).json({
        message: 'Schicht kann nicht gelöscht werden, da bereits Anmeldungen vorhanden sind'
      });
    }
    
    await db.execute('DELETE FROM shifts WHERE id = ?', [shiftId]);
    
    res.json({ message: 'Schicht erfolgreich gelöscht' });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ message: 'Fehler beim Löschen der Schicht' });
  }
};

// Get shift registrations
const getShiftRegistrations = async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    const [registrations] = await db.execute(
      `SELECT 
        sr.*,
        sp.first_name,
        sp.last_name,
        sp.personal_code,
        sp.phone,
        u.email
      FROM shift_registrations sr
      JOIN staff_profiles sp ON sr.staff_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE sr.shift_id = ?
      ORDER BY sr.status DESC, sp.last_name, sp.first_name`,
      [shiftId]
    );
    
    res.json(registrations);
  } catch (error) {
    console.error('Get shift registrations error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Anmeldungen' });
  }
};

// Assign staff to shift (Admin only)
const assignStaffToShift = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId } = req.params;
    const { staff_id, action = 'assign', assignment_type = 'preliminary' } = req.body;
    const assignedBy = req.user.id;
    
    // Verify shift exists
    const [shift] = await connection.execute(
      'SELECT s.*, e.name as event_name FROM shifts s JOIN events e ON s.event_id = e.id WHERE s.id = ?',
      [shiftId]
    );
    
    if (shift.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Schicht nicht gefunden' });
    }
    
    if (action === 'assign') {
      // Check if staff is invited to the event
      const [invitation] = await connection.execute(
        `SELECT ei.* FROM event_invitations ei 
         WHERE ei.event_id = ? AND ei.staff_id = ? AND ei.status = 'accepted'`,
        [shift[0].event_id, staff_id]
      );
      
      if (invitation.length === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          message: 'Mitarbeiter muss erst die Einladung zur Veranstaltung annehmen' 
        });
      }
      
      // Insert or update shift registration
      await connection.execute(
        `INSERT INTO shift_registrations (shift_id, staff_id, status, assignment_type, assigned_by) 
         VALUES (?, ?, 'assigned', ?, ?)
         ON DUPLICATE KEY UPDATE 
         status = 'assigned', 
         assignment_type = VALUES(assignment_type), 
         assigned_by = VALUES(assigned_by),
         updated_at = NOW()`,
        [shiftId, staff_id, assignment_type, assignedBy]
      );
      
      // If final assignment, send email
      if (assignment_type === 'final') {
        const [staffData] = await connection.execute(
          `SELECT u.email, sp.first_name 
           FROM staff_profiles sp 
           JOIN users u ON sp.user_id = u.id 
           WHERE sp.id = ?`,
          [staff_id]
        );
        
        if (staffData.length > 0) {
          const shiftDetails = `${shift[0].name} - ${new Date(shift[0].start_time).toLocaleString('de-DE')} bis ${new Date(shift[0].end_time).toLocaleTimeString('de-DE')}`;
          
          await emailService.sendShiftAssignmentEmail(
            staffData[0].email,
            staffData[0].first_name,
            shift[0].event_name,
            shiftDetails,
            'final',
            new Date(shift[0].start_time).toLocaleDateString('de-DE')
          );
        }
      }
      
      await connection.commit();
      res.json({ message: 'Mitarbeiter erfolgreich zugeteilt' });
      
    } else if (action === 'unassign') {
      // Remove assignment (only if not confirmed)
      const [result] = await connection.execute(
        'DELETE FROM shift_registrations WHERE shift_id = ? AND staff_id = ? AND status != "confirmed"',
        [shiftId, staff_id]
      );
      
      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          message: 'Zuteilung kann nicht entfernt werden (bereits bestätigt oder nicht vorhanden)' 
        });
      }
      
      await connection.commit();
      res.json({ message: 'Zuteilung erfolgreich entfernt' });
    }
    
  } catch (error) {
    await connection.rollback();
    console.error('Assign staff error:', error);
    res.status(500).json({ message: 'Fehler bei der Zuteilung' });
  } finally {
    connection.release();
  }
};

// Bulk assign staff to shift
const bulkAssignStaff = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId } = req.params;
    const { staff_ids, assignment_type = 'preliminary' } = req.body;
    const assignedBy = req.user.id;
    
    if (!Array.isArray(staff_ids) || staff_ids.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Keine Mitarbeiter ausgewählt' });
    }
    
    // Verify shift
    const [shift] = await connection.execute(
      'SELECT s.*, e.name as event_name FROM shifts s JOIN events e ON s.event_id = e.id WHERE s.id = ?',
      [shiftId]
    );
    
    if (shift.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Schicht nicht gefunden' });
    }
    
    // Prepare bulk insert data
    const values = staff_ids.map(staffId => [
      shiftId, 
      staffId, 
      'assigned', 
      assignment_type, 
      assignedBy
    ]);
    
    // Bulk insert/update
    await connection.query(
      `INSERT INTO shift_registrations (shift_id, staff_id, status, assignment_type, assigned_by) 
       VALUES ? 
       ON DUPLICATE KEY UPDATE 
       status = 'assigned', 
       assignment_type = VALUES(assignment_type), 
       assigned_by = VALUES(assigned_by),
       updated_at = NOW()`,
      [values]
    );
    
    // Send emails if final assignment
    if (assignment_type === 'final') {
      const [staffData] = await connection.execute(
        `SELECT u.email, sp.first_name 
         FROM staff_profiles sp 
         JOIN users u ON sp.user_id = u.id 
         WHERE sp.id IN (?)`,
        [staff_ids]
      );
      
      const shiftDetails = `${shift[0].name} - ${new Date(shift[0].start_time).toLocaleString('de-DE')} bis ${new Date(shift[0].end_time).toLocaleTimeString('de-DE')}`;
      
      for (const staff of staffData) {
        await emailService.sendShiftAssignmentEmail(
          staff.email,
          staff.first_name,
          shift[0].event_name,
          shiftDetails,
          'final',
          new Date(shift[0].start_time).toLocaleDateString('de-DE')
        );
      }
    }
    
    await connection.commit();
    res.json({ 
      message: `${staff_ids.length} Mitarbeiter erfolgreich zugeteilt`,
      assigned_count: staff_ids.length 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Bulk assign error:', error);
    res.status(500).json({ message: 'Fehler bei der Massenzuteilung' });
  } finally {
    connection.release();
  }
};

// Confirm shift assignment (mark as confirmed by staff)
const confirmShiftAssignment = async (req, res) => {
  try {
    const { registrationId } = req.params;
    
    const [result] = await db.execute(
      `UPDATE shift_registrations 
       SET status = 'confirmed', confirmed_at = NOW() 
       WHERE id = ? AND status = 'assigned' AND assignment_type = 'final'`,
      [registrationId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ 
        message: 'Zuteilung konnte nicht bestätigt werden' 
      });
    }
    
    res.json({ message: 'Zuteilung erfolgreich bestätigt' });
  } catch (error) {
    console.error('Confirm assignment error:', error);
    res.status(500).json({ message: 'Fehler beim Bestätigen' });
  }
};

// Get event invitations (for shift assignment modal)
const getEventInvitations = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const [invitations] = await db.execute(
      `SELECT 
        ei.*,
        sp.id as staff_id,
        CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
        sp.personal_code,
        sp.phone,
        u.email
      FROM event_invitations ei
      JOIN staff_profiles sp ON ei.staff_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE ei.event_id = ?
      ORDER BY ei.status DESC, sp.last_name, sp.first_name`,
      [eventId]
    );
    
    res.json(invitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Einladungen' });
  }
};

module.exports = {
  getShift,
  updateShift,
  deleteShift,
  getShiftRegistrations,
  assignStaffToShift,
  bulkAssignStaff,
  confirmShiftAssignment,
  getEventInvitations
};
