// backend/src/controllers/timeStampController.js
const db = require('../config/database');

const clockIn = async (req, res) => {
  try {
    const { position_id } = req.body;
    const userId = req.user.id;
    
    // Hole Staff ID
    const [staff] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (staff.length === 0) {
      return res.status(404).json({ message: 'Mitarbeiterprofil nicht gefunden' });
    }
    
    const staffId = staff[0].id;
    
    // Prüfe ob bereits eingestempelt
    const [lastStamp] = await db.execute(
      'SELECT * FROM time_stamps WHERE staff_id = ? ORDER BY stamp_time DESC LIMIT 1',
      [staffId]
    );
    
    if (lastStamp.length > 0 && lastStamp[0].stamp_type === 'in') {
      return res.status(400).json({ message: 'Sie sind bereits eingestempelt' });
    }
    
    // Einstempeln
    await db.execute(
      'INSERT INTO time_stamps (staff_id, stamp_type, position_id) VALUES (?, "in", ?)',
      [staffId, position_id]
    );
    
    res.json({ message: 'Erfolgreich eingestempelt' });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ message: 'Fehler beim Einstempeln' });
  }
};

// Weitere Funktionen: clockOut, getMyStamps, etc.
