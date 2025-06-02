// backend/src/controllers/timeStampController.js
const db = require('../config/database');

// Einstempeln
const clockIn = async (req, res) => {
  try {
    const { position_id } = req.body;
    const userId = req.user.id;
    
    if (!position_id) {
      return res.status(400).json({ message: 'Position ist erforderlich' });
    }
    
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
      'INSERT INTO time_stamps (staff_id, stamp_type, position_id, device_info) VALUES (?, "in", ?, ?)',
      [staffId, position_id, req.headers['user-agent'] || 'Unknown']
    );
    
    res.json({ 
      message: 'Erfolgreich eingestempelt',
      stamp_type: 'in',
      position_id,
      time: new Date()
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ message: 'Fehler beim Einstempeln' });
  }
};

// Ausstempeln
const clockOut = async (req, res) => {
  try {
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
    
    // Prüfe ob eingestempelt
    const [lastStamp] = await db.execute(
      'SELECT * FROM time_stamps WHERE staff_id = ? ORDER BY stamp_time DESC LIMIT 1',
      [staffId]
    );
    
    if (lastStamp.length === 0 || lastStamp[0].stamp_type === 'out') {
      return res.status(400).json({ message: 'Sie sind nicht eingestempelt' });
    }
    
    // Ausstempeln
    await db.execute(
      'INSERT INTO time_stamps (staff_id, stamp_type, device_info) VALUES (?, "out", ?)',
      [staffId, req.headers['user-agent'] || 'Unknown']
    );
    
    // Berechne Arbeitszeit
    const workTime = new Date() - new Date(lastStamp[0].stamp_time);
    const hours = Math.floor(workTime / (1000 * 60 * 60));
    const minutes = Math.floor((workTime % (1000 * 60 * 60)) / (1000 * 60));
    
    res.json({ 
      message: 'Erfolgreich ausgestempelt',
      stamp_type: 'out',
      work_duration: `${hours}h ${minutes}m`,
      time: new Date()
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ message: 'Fehler beim Ausstempeln' });
  }
};

// Meine Stempelzeiten abrufen
const getMyStamps = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    // Hole Staff ID
    const [staff] = await db.execute(
      'SELECT id FROM staff_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (staff.length === 0) {
      return res.status(404).json({ message: 'Mitarbeiterprofil nicht gefunden' });
    }
    
    const staffId = staff[0].id;
    
    // Build query
    let query = `
      SELECT 
        ts.*,
        sp.name as position_name,
        sp.color as position_color
      FROM time_stamps ts
      LEFT JOIN stamp_positions sp ON ts.position_id = sp.id
      WHERE ts.staff_id = ?
    `;
    
    const params = [staffId];
    
    if (start_date) {
      query += ' AND ts.stamp_time >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND ts.stamp_time <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY ts.stamp_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [stamps] = await db.execute(query, params);
    
    // Berechne Arbeitszeiten
    const stampsWithDuration = [];
    for (let i = 0; i < stamps.length; i++) {
      const stamp = stamps[i];
      
      if (stamp.stamp_type === 'out') {
        // Finde den zugehörigen 'in' Stempel
        const inStamp = stamps.find((s, idx) => 
          idx > i && s.stamp_type === 'in' && 
          new Date(s.stamp_time) < new Date(stamp.stamp_time)
        );
        
        if (inStamp) {
          const duration = new Date(stamp.stamp_time) - new Date(inStamp.stamp_time);
          stamp.duration_minutes = Math.floor(duration / (1000 * 60));
          stamp.paired_with = inStamp.id;
        }
      }
      
      stampsWithDuration.push(stamp);
    }
    
    res.json({
      stamps: stampsWithDuration,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: stamps.length
      }
    });
  } catch (error) {
    console.error('Get stamps error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Stempelzeiten' });
  }
};

// Alle Stempelzeiten abrufen (Admin)
const getAllStamps = async (req, res) => {
  try {
    const { staff_id, start_date, end_date, limit = 100, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        ts.*,
        sp.name as position_name,
        sp.color as position_color,
        CONCAT(stp.first_name, ' ', stp.last_name) as staff_name,
        stp.personal_code
      FROM time_stamps ts
      LEFT JOIN stamp_positions sp ON ts.position_id = sp.id
      JOIN staff_profiles stp ON ts.staff_id = stp.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (staff_id) {
      query += ' AND ts.staff_id = ?';
      params.push(staff_id);
    }
    
    if (start_date) {
      query += ' AND ts.stamp_time >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND ts.stamp_time <= ?';
      params.push(end_date);
    }
    
    // Count total
    const countQuery = query.replace(
      'SELECT ts.*, sp.name as position_name, sp.color as position_color, CONCAT(stp.first_name, \' \', stp.last_name) as staff_name, stp.personal_code',
      'SELECT COUNT(*) as total'
    );
    
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;
    
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

// Export Stempelzeiten (Admin)
const exportStamps = async (req, res) => {
  try {
    const { staff_id, start_date, end_date, format = 'json' } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'Start- und Enddatum sind erforderlich' 
      });
    }
    
    let query = `
      SELECT 
        ts.stamp_time,
        ts.stamp_type,
        sp.name as position_name,
        CONCAT(stp.first_name, ' ', stp.last_name) as staff_name,
        stp.personal_code
      FROM time_stamps ts
      LEFT JOIN stamp_positions sp ON ts.position_id = sp.id
      JOIN staff_profiles stp ON ts.staff_id = stp.id
      WHERE ts.stamp_time >= ? AND ts.stamp_time <= ?
    `;
    
    const params = [start_date, end_date];
    
    if (staff_id) {
      query += ' AND ts.staff_id = ?';
      params.push(staff_id);
    }
    
    query += ' ORDER BY stp.last_name, stp.first_name, ts.stamp_time';
    
    const [stamps] = await db.execute(query, params);
    
    // Gruppiere nach Mitarbeiter und berechne Arbeitszeiten
    const staffData = {};
    
    stamps.forEach(stamp => {
      const key = stamp.personal_code;
      if (!staffData[key]) {
        staffData[key] = {
          name: stamp.staff_name,
          personal_code: stamp.personal_code,
          stamps: [],
          total_minutes: 0
        };
      }
      staffData[key].stamps.push(stamp);
    });
    
    // Berechne Arbeitszeiten pro Mitarbeiter
    Object.values(staffData).forEach(staff => {
      let lastInTime = null;
      
      staff.stamps.forEach(stamp => {
        if (stamp.stamp_type === 'in') {
          lastInTime = new Date(stamp.stamp_time);
        } else if (stamp.stamp_type === 'out' && lastInTime) {
          const duration = new Date(stamp.stamp_time) - lastInTime;
          staff.total_minutes += Math.floor(duration / (1000 * 60));
          lastInTime = null;
        }
      });
      
      staff.total_hours = (staff.total_minutes / 60).toFixed(2);
    });
    
    if (format === 'csv') {
      // CSV Export
      let csv = 'Mitarbeiter,Personal-Code,Datum,Uhrzeit,Typ,Position,Stunden\n';
      
      Object.values(staffData).forEach(staff => {
        staff.stamps.forEach(stamp => {
          const date = new Date(stamp.stamp_time);
          csv += `"${staff.name}","${staff.personal_code}","${date.toLocaleDateString('de-DE')}","${date.toLocaleTimeString('de-DE')}","${stamp.stamp_type}","${stamp.position_name || '-'}",""\n`;
        });
        csv += `"${staff.name}","${staff.personal_code}","GESAMT","","","","${staff.total_hours}"\n\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="stempelzeiten_${start_date}_${end_date}.csv"`);
      res.send(csv);
    } else {
      // JSON Export
      res.json({
        period: { start_date, end_date },
        data: staffData
      });
    }
  } catch (error) {
    console.error('Export stamps error:', error);
    res.status(500).json({ message: 'Fehler beim Exportieren' });
  }
};

// Kiosk Mode - Ein-/Ausstempeln mit Personal-Code
const kioskClockIn = async (req, res) => {
  try {
    const { personal_code, position_id } = req.body;
    
    if (!personal_code) {
      return res.status(400).json({ message: 'Personal-Code ist erforderlich' });
    }
    
    // Finde Mitarbeiter mit Personal-Code
    const [staff] = await db.execute(
      'SELECT id, first_name, last_name FROM staff_profiles WHERE personal_code = ?',
      [personal_code]
    );
    
    if (staff.length === 0) {
      return res.status(404).json({ message: 'Ungültiger Personal-Code' });
    }
    
    const staffId = staff[0].id;
    const staffName = `${staff[0].first_name} ${staff[0].last_name}`;
    
    // Prüfe letzten Stempel
    const [lastStamp] = await db.execute(
      'SELECT * FROM time_stamps WHERE staff_id = ? ORDER BY stamp_time DESC LIMIT 1',
      [staffId]
    );
    
    let stampType = 'in';
    let requiresPosition = true;
    
    if (lastStamp.length > 0 && lastStamp[0].stamp_type === 'in') {
      stampType = 'out';
      requiresPosition = false;
    }
    
    // Bei Einstempeln: Position erforderlich
    if (stampType === 'in' && !position_id) {
      return res.status(400).json({ 
        message: 'Bitte Position auswählen',
        requires_position: true,
        stamp_type: stampType
      });
    }
    
    // Stempel erstellen
    await db.execute(
      'INSERT INTO time_stamps (staff_id, stamp_type, position_id, device_info) VALUES (?, ?, ?, ?)',
      [staffId, stampType, stampType === 'in' ? position_id : null, 'Kiosk Mode']
    );
    
    // Arbeitszeit berechnen bei Ausstempeln
    let workDuration = null;
    if (stampType === 'out') {
      const duration = new Date() - new Date(lastStamp[0].stamp_time);
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      workDuration = `${hours}h ${minutes}m`;
    }
    
    res.json({
      success: true,
      message: stampType === 'in' 
        ? `${staffName} erfolgreich eingestempelt` 
        : `${staffName} erfolgreich ausgestempelt`,
      stamp_type: stampType,
      staff_name: staffName,
      time: new Date(),
      work_duration: workDuration
    });
  } catch (error) {
    console.error('Kiosk clock in error:', error);
    res.status(500).json({ message: 'Fehler beim Stempeln' });
  }
};

// Stempel-Positionen abrufen
const getPositions = async (req, res) => {
  try {
    const [positions] = await db.execute(
      'SELECT * FROM stamp_positions WHERE is_active = true ORDER BY name'
    );
    
    res.json(positions);
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Positionen' });
  }
};

module.exports = {
  clockIn,
  clockOut,
  getMyStamps,
  getAllStamps,
  exportStamps,
  kioskClockIn,
  getPositions
};
