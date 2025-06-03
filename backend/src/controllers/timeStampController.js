const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Clock in (regular mode)
const clockIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { position_id } = req.body;

    // Get staff profile
    const [staffProfile] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );

    if (staffProfile.length === 0) {
      return res.status(404).json({ message: 'Mitarbeiterprofil nicht gefunden' });
    }

    const staffId = staffProfile[0].id;

    // Check if already clocked in
    const [lastStamp] = await db.execute(
      `SELECT * FROM time_stamps 
       WHERE staff_id = ? 
       ORDER BY stamp_time DESC 
       LIMIT 1`,
      [staffId]
    );

    if (lastStamp.length > 0 && lastStamp[0].stamp_type === 'in') {
      return res.status(400).json({ 
        message: 'Sie sind bereits eingestempelt. Bitte stempeln Sie zuerst aus.' 
      });
    }

    // Create clock in stamp
    await db.execute(
      `INSERT INTO time_stamps (staff_id, stamp_type, stamp_time, position_id) 
       VALUES (?, 'in', NOW(), ?)`,
      [staffId, position_id]
    );

    res.json({ 
      message: 'Erfolgreich eingestempelt',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ message: 'Fehler beim Einstempeln' });
  }
};

// Clock out
const clockOut = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get staff profile
    const [staffProfile] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );

    if (staffProfile.length === 0) {
      return res.status(404).json({ message: 'Mitarbeiterprofil nicht gefunden' });
    }

    const staffId = staffProfile[0].id;

    // Check last stamp
    const [lastStamp] = await db.execute(
      `SELECT * FROM time_stamps 
       WHERE staff_id = ? 
       ORDER BY stamp_time DESC 
       LIMIT 1`,
      [staffId]
    );

    if (lastStamp.length === 0 || lastStamp[0].stamp_type === 'out') {
      return res.status(400).json({ 
        message: 'Sie sind nicht eingestempelt.' 
      });
    }

    // Create clock out stamp
    const [result] = await db.execute(
      `INSERT INTO time_stamps (staff_id, stamp_type, stamp_time, position_id) 
       VALUES (?, 'out', NOW(), ?)`,
      [staffId, lastStamp[0].position_id]
    );

    // Calculate worked hours
    const inTime = new Date(lastStamp[0].stamp_time);
    const outTime = new Date();
    const hoursWorked = (outTime - inTime) / (1000 * 60 * 60);

    res.json({ 
      message: 'Erfolgreich ausgestempelt',
      timestamp: outTime,
      hoursWorked: hoursWorked.toFixed(2)
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ message: 'Fehler beim Ausstempeln' });
  }
};

// Get my stamps
const getMyStamps = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get staff profile
    const [staffProfile] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );

    if (staffProfile.length === 0) {
      return res.status(404).json({ message: 'Mitarbeiterprofil nicht gefunden' });
    }

    const staffId = staffProfile[0].id;

    // Build query
    let query = `
      SELECT 
        ts.*,
        p.name as position_name
      FROM time_stamps ts
      LEFT JOIN positions p ON ts.position_id = p.id
      WHERE ts.staff_id = ?
    `;
    
    const params = [staffId];

    if (startDate) {
      query += ' AND DATE(ts.stamp_time) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(ts.stamp_time) <= ?';
      params.push(endDate);
    }

    // Count total
    const countQuery = query.replace(
      'SELECT ts.*, p.name as position_name',
      'SELECT COUNT(*) as total'
    );
    
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;

    // Add pagination
    query += ' ORDER BY ts.stamp_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [stamps] = await db.execute(query, params);

    // Calculate daily hours
    const dailyHours = await calculateDailyHours(stamps);

    res.json({
      stamps,
      dailyHours,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get my stamps error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Stempelzeiten' });
  }
};

// Get all stamps (admin)
const getAllStamps = async (req, res) => {
  try {
    const { staffId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        ts.*,
        p.name as position_name,
        CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
        sp.personal_code
      FROM time_stamps ts
      LEFT JOIN positions p ON ts.position_id = p.id
      JOIN staff_profiles sp ON ts.staff_id = sp.id
      WHERE 1=1
    `;
    
    const params = [];

    if (staffId) {
      query += ' AND ts.staff_id = ?';
      params.push(staffId);
    }

    if (startDate) {
      query += ' AND DATE(ts.stamp_time) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(ts.stamp_time) <= ?';
      params.push(endDate);
    }

    // Count total
    const countQuery = query.replace(
      'SELECT ts.*, p.name as position_name, CONCAT(sp.first_name, \' \', sp.last_name) as staff_name, sp.personal_code',
      'SELECT COUNT(*) as total'
    );
    
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;

    // Add pagination
    query += ' ORDER BY ts.stamp_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [stamps] = await db.execute(query, params);

    res.json({
      stamps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all stamps error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Stempelzeiten' });
  }
};

// Export stamps (admin)
const exportStamps = async (req, res) => {
  try {
    const { staffId, startDate, endDate, format = 'json' } = req.query;

    let query = `
      SELECT 
        ts.stamp_time,
        ts.stamp_type,
        p.name as position_name,
        sp.first_name,
        sp.last_name,
        sp.personal_code,
        u.email
      FROM time_stamps ts
      LEFT JOIN positions p ON ts.position_id = p.id
      JOIN staff_profiles sp ON ts.staff_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    if (staffId) {
      query += ' AND ts.staff_id = ?';
      params.push(staffId);
    }

    if (startDate) {
      query += ' AND DATE(ts.stamp_time) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(ts.stamp_time) <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY sp.last_name, sp.first_name, ts.stamp_time';

    const [stamps] = await db.execute(query, params);

    // Calculate hours per staff member
    const staffHours = await calculateStaffHours(stamps);

    if (format === 'excel') {
      // TODO: Implement Excel export
      return res.status(501).json({ 
        message: 'Excel-Export wird noch implementiert',
        data: staffHours 
      });
    }

    res.json({
      stamps,
      summary: staffHours,
      period: {
        start: startDate || 'Alle',
        end: endDate || 'Alle'
      }
    });
  } catch (error) {
    console.error('Export stamps error:', error);
    res.status(500).json({ message: 'Fehler beim Exportieren der Stempelzeiten' });
  }
};

// Kiosk clock in/out
const kioskClock = async (req, res) => {
  try {
    const { personal_code, pin, position_id, action } = req.body;

    // Validate kiosk token (could be a special token or session)
    const kioskToken = req.headers['x-kiosk-token'];
    if (!kioskToken || kioskToken !== process.env.KIOSK_TOKEN) {
      return res.status(401).json({ message: 'Ungültiger Kiosk-Token' });
    }

    // Find staff by personal code
    const [staff] = await db.execute(
      `SELECT sp.id, sp.first_name, sp.last_name, u.pin_hash 
       FROM staff_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.personal_code = ? AND u.is_active = true`,
      [personal_code]
    );

    if (staff.length === 0) {
      return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
    }

    // Verify PIN
    const bcrypt = require('bcryptjs');
    const isPinValid = await bcrypt.compare(pin, staff[0].pin_hash);
    
    if (!isPinValid) {
      return res.status(401).json({ message: 'Ungültiger PIN' });
    }

    const staffId = staff[0].id;
    const staffName = `${staff[0].first_name} ${staff[0].last_name}`;

    // Check last stamp
    const [lastStamp] = await db.execute(
      `SELECT * FROM time_stamps 
       WHERE staff_id = ? 
       ORDER BY stamp_time DESC 
       LIMIT 1`,
      [staffId]
    );

    let stampType;
    let message;

    if (action === 'auto') {
      // Auto-detect based on last stamp
      stampType = (lastStamp.length === 0 || lastStamp[0].stamp_type === 'out') ? 'in' : 'out';
    } else {
      stampType = action;
    }

    // Validate stamp type
    if (stampType === 'in' && lastStamp.length > 0 && lastStamp[0].stamp_type === 'in') {
      return res.status(400).json({ 
        message: 'Sie sind bereits eingestempelt',
        lastStamp: lastStamp[0].stamp_time
      });
    }

    if (stampType === 'out' && (lastStamp.length === 0 || lastStamp[0].stamp_type === 'out')) {
      return res.status(400).json({ 
        message: 'Sie sind nicht eingestempelt'
      });
    }

    // For clock out, use the same position as clock in
    const actualPositionId = stampType === 'out' 
      ? lastStamp[0].position_id 
      : position_id;

    // Create stamp
    await db.execute(
      `INSERT INTO time_stamps (staff_id, stamp_type, stamp_time, position_id, kiosk_mode) 
       VALUES (?, ?, NOW(), ?, true)`,
      [staffId, stampType, actualPositionId]
    );

    if (stampType === 'in') {
      message = `Willkommen ${staffName}! Erfolgreich eingestempelt.`;
    } else {
      // Calculate worked hours
      const inTime = new Date(lastStamp[0].stamp_time);
      const outTime = new Date();
      const hoursWorked = ((outTime - inTime) / (1000 * 60 * 60)).toFixed(2);
      message = `Auf Wiedersehen ${staffName}! Arbeitszeit: ${hoursWorked} Stunden.`;
    }

    res.json({ 
      message,
      staffName,
      stampType,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Kiosk clock error:', error);
    res.status(500).json({ message: 'Fehler beim Stempeln' });
  }
};

// Get positions
const getPositions = async (req, res) => {
  try {
    const [positions] = await db.execute(
      'SELECT * FROM positions WHERE is_active = true ORDER BY sort_order, name'
    );
    
    res.json(positions);
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Positionen' });
  }
};

// Helper function to calculate daily hours
async function calculateDailyHours(stamps) {
  const dailyData = {};
  
  for (let i = 0; i < stamps.length; i++) {
    const stamp = stamps[i];
    const date = new Date(stamp.stamp_time).toLocaleDateString('de-DE');
    
    if (!dailyData[date]) {
      dailyData[date] = {
        date,
        stamps: [],
        totalHours: 0
      };
    }
    
    dailyData[date].stamps.push(stamp);
  }

  // Calculate hours for each day
  for (const date in dailyData) {
    const dayStamps = dailyData[date].stamps.sort((a, b) => 
      new Date(a.stamp_time) - new Date(b.stamp_time)
    );
    
    let totalMinutes = 0;
    
    for (let i = 0; i < dayStamps.length - 1; i++) {
      if (dayStamps[i].stamp_type === 'in' && dayStamps[i + 1].stamp_type === 'out') {
        const inTime = new Date(dayStamps[i].stamp_time);
        const outTime = new Date(dayStamps[i + 1].stamp_time);
        totalMinutes += (outTime - inTime) / (1000 * 60);
      }
    }
    
    dailyData[date].totalHours = (totalMinutes / 60).toFixed(2);
  }

  return Object.values(dailyData);
}

// Helper function to calculate hours per staff member
async function calculateStaffHours(stamps) {
  const staffData = {};
  
  stamps.forEach(stamp => {
    const key = stamp.personal_code;
    
    if (!staffData[key]) {
      staffData[key] = {
        name: `${stamp.first_name} ${stamp.last_name}`,
        personal_code: stamp.personal_code,
        email: stamp.email,
        stamps: [],
        totalHours: 0,
        days: {}
      };
    }
    
    staffData[key].stamps.push(stamp);
  });

  // Calculate hours for each staff member
  for (const key in staffData) {
    const staffStamps = staffData[key].stamps.sort((a, b) => 
      new Date(a.stamp_time) - new Date(b.stamp_time)
    );
    
    let totalMinutes = 0;
    
    for (let i = 0; i < staffStamps.length - 1; i++) {
      if (staffStamps[i].stamp_type === 'in' && staffStamps[i + 1].stamp_type === 'out') {
        const inTime = new Date(staffStamps[i].stamp_time);
        const outTime = new Date(staffStamps[i + 1].stamp_time);
        const minutes = (outTime - inTime) / (1000 * 60);
        totalMinutes += minutes;
        
        // Track daily hours
        const date = inTime.toLocaleDateString('de-DE');
        if (!staffData[key].days[date]) {
          staffData[key].days[date] = 0;
        }
        staffData[key].days[date] += minutes / 60;
      }
    }
    
    staffData[key].totalHours = (totalMinutes / 60).toFixed(2);
    delete staffData[key].stamps; // Remove raw stamps from summary
  }

  return Object.values(staffData);
}

// Admin: Create/Update positions
const createPosition = async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;

    const [result] = await db.execute(
      'INSERT INTO positions (name, description, sort_order) VALUES (?, ?, ?)',
      [name, description || null, sort_order || 0]
    );

    res.status(201).json({
      message: 'Position erfolgreich erstellt',
      id: result.insertId
    });
  } catch (error) {
    console.error('Create position error:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen der Position' });
  }
};

const updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sort_order, is_active } = req.body;

    const updateFields = [];
    const values = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      values.push(description);
    }
    if (sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      values.push(sort_order);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      values.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Keine Änderungen angegeben' });
    }

    values.push(id);

    await db.execute(
      `UPDATE positions SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Position erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Update position error:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Position' });
  }
};

// Generate PIN for user
const generatePin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pin } = req.body;

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        message: 'PIN muss genau 4 Ziffern haben' 
      });
    }

    const bcrypt = require('bcryptjs');
    const pinHash = await bcrypt.hash(pin, 10);

    await db.execute(
      'UPDATE users SET pin_hash = ? WHERE id = ?',
      [pinHash, userId]
    );

    res.json({ message: 'PIN erfolgreich gesetzt' });
  } catch (error) {
    console.error('Generate PIN error:', error);
    res.status(500).json({ message: 'Fehler beim Setzen des PINs' });
  }
};

module.exports = {
  clockIn,
  clockOut,
  getMyStamps,
  getAllStamps,
  exportStamps,
  kioskClock,
  getPositions,
  createPosition,
  updatePosition,
  generatePin
};
