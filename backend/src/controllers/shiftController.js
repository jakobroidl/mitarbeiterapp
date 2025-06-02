const db = require('../config/database');

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

module.exports = {
  getShift,
  updateShift,
  deleteShift,
  getShiftRegistrations
};
