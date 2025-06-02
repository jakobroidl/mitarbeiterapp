const db = require('../config/database');

const getEventShifts = async (req, res) => {
  try {
    const { eventId } = req.params;
    const [shifts] = await db.execute(
      'SELECT * FROM shifts WHERE event_id = ?',
      [eventId]
    );
    res.json(shifts);
  } catch (error) {
    console.error('Fehler beim Laden der Schichten:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Schichten' });
  }
};

const createShift = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, startTime, endTime, requiredStaff, notes } = req.body;
    const [result] = await db.execute(
      'INSERT INTO shifts (event_id, name, start_time, end_time, required_staff, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [eventId, name, startTime, endTime, requiredStaff, notes]
    );
    res.status(201).json({ 
      message: 'Schicht erstellt',
      shiftId: result.insertId
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Schicht:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen der Schicht' });
  }
};

const updateShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { name, startTime, endTime, requiredStaff, notes } = req.body;
    await db.execute(
      'UPDATE shifts SET name = ?, start_time = ?, end_time = ?, required_staff = ?, notes = ? WHERE id = ?',
      [name, startTime, endTime, requiredStaff, notes, shiftId]
    );
    res.json({ message: 'Schicht aktualisiert' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Schicht:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Schicht' });
  }
};

const deleteShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    await db.execute('DELETE FROM shifts WHERE id = ?', [shiftId]);
    res.json({ message: 'Schicht gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Schicht:', error);
    res.status(500).json({ message: 'Fehler beim Löschen der Schicht' });
  }
};
module.exports = {
  getEventShifts,
  createShift,
  updateShift,
  deleteShift,
};

module.exports = {
  // ...
  createShift: async (req, res) => {
    // ...
  },
  // ...
};
