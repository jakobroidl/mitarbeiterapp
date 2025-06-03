// backend/src/controllers/timeclockController.js
const db = require('../config/database');
const { validationResult } = require('express-validator');
const { format, differenceInMinutes, startOfDay, endOfDay, startOfMonth, endOfMonth } = require('date-fns');
const { de } = require('date-fns/locale');

// Kiosk Mode - Einstempeln
const kioskClockIn = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { personal_code, position_id, event_id, kiosk_token } = req.body;
    
    // Validiere Kiosk Token
    const [settings] = await connection.execute(
      'SELECT setting_value FROM settings WHERE setting_key = "kiosk_token"',
      []
    );
    
    if (!settings.length || settings[0].setting_value !== kiosk_token) {
      await connection.rollback();
      return res.status(401).json({ 
        message: 'Ungültiger Kiosk-Token' 
      });
    }
    
    // Hole Mitarbeiter anhand Personal-Code
    const [staff] = await connection.execute(
      `SELECT sp.id, sp.first_name, sp.last_name, u.is_active
       FROM staff_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.personal_code = ?`,
      [personal_code]
    );
    
    if (staff.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Ungültiger Personal-Code' 
      });
    }
    
    if (!staff[0].is_active) {
      await connection.rollback();
      return res.status(403).json({ 
        message: 'Mitarbeiter ist deaktiviert' 
      });
    }
    
    const staffId = staff[0].id;
    const staffName = `${staff[0].first_name} ${staff[0].last_name}`;
    
    // Prüfe ob bereits eingestempelt
    const [activeEntries] = await connection.execute(
      'SELECT id, clock_in FROM timeclock_entries WHERE staff_id = ? AND status = "active"',
      [staffId]
    );
    
    if (activeEntries.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Sie sind bereits eingestempelt seit ' + format(new Date(activeEntries[0].clock_in), 'HH:mm') + ' Uhr',
        type: 'already_clocked_in'
      });
    }
    
    // Prüfe Position
    const [positions] = await connection.execute(
      'SELECT name FROM positions WHERE id = ? AND is_active = 1',
      [position_id]
    );
    
    if (positions.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Ungültige Position' 
      });
    }
    
    // Wenn Event angegeben, prüfe ob Mitarbeiter zugeteilt ist
    let eventName = null;
    let shiftId = null;
    
    if (event_id) {
      const [events] = await connection.execute(
        `SELECT e.name 
         FROM events e
         JOIN event_invitations ei ON e.id = ei.event_id
         WHERE e.id = ? AND ei.staff_id = ? AND ei.status = 'accepted'`,
        [event_id, staffId]
      );
      
      if (events.length === 0) {
        await connection.rollback();
        return res.status(403).json({ 
          message: 'Sie sind nicht zu dieser Veranstaltung eingeladen' 
        });
      }
      
      eventName = events[0].name;
      
      // Finde aktuelle Schicht
      const [shifts] = await connection.execute(
        `SELECT s.id 
         FROM shifts s
         JOIN shift_assignments sa ON s.id = sa.shift_id
         WHERE s.event_id = ? 
           AND sa.staff_id = ?
           AND NOW() BETWEEN DATE_SUB(s.start_time, INTERVAL 30 MINUTE) 
                         AND DATE_ADD(s.end_time, INTERVAL 30 MINUTE)
         LIMIT 1`,
        [event_id, staffId]
      );
      
      if (shifts.length > 0) {
        shiftId = shifts[0].id;
      }
    }
    
    // Erstelle Eintrag
    const [result] = await connection.execute(
      `INSERT INTO timeclock_entries 
       (staff_id, event_id, shift_id, position_id, clock_in, status)
       VALUES (?, ?, ?, ?, NOW(), 'active')`,
      [staffId, event_id || null, shiftId, position_id]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (action, entity_type, entity_id, details)
       VALUES ('clock_in', 'timeclock', ?, ?)`,
      [
        result.insertId,
        JSON.stringify({
          staffId,
          staffName,
          position: positions[0].name,
          event: eventName
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: `Willkommen ${staffName}! Eingestempelt um ${format(new Date(), 'HH:mm')} Uhr`,
      entry: {
        id: result.insertId,
        staff_name: staffName,
        position: positions[0].name,
        event: eventName,
        clock_in: new Date()
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Einstempeln:', error);
    res.status(500).json({ 
      message: 'Fehler beim Einstempeln' 
    });
  } finally {
    connection.release();
  }
};

// Kiosk Mode - Ausstempeln
const kioskClockOut = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { personal_code, kiosk_token } = req.body;
    
    // Validiere Kiosk Token
    const [settings] = await connection.execute(
      'SELECT setting_value FROM settings WHERE setting_key = "kiosk_token"',
      []
    );
    
    if (!settings.length || settings[0].setting_value !== kiosk_token) {
      await connection.rollback();
      return res.status(401).json({ 
        message: 'Ungültiger Kiosk-Token' 
      });
    }
    
    // Hole Mitarbeiter
    const [staff] = await connection.execute(
      `SELECT sp.id, sp.first_name, sp.last_name
       FROM staff_profiles sp
       WHERE sp.personal_code = ?`,
      [personal_code]
    );
    
    if (staff.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Ungültiger Personal-Code' 
      });
    }
    
    const staffId = staff[0].id;
    const staffName = `${staff[0].first_name} ${staff[0].last_name}`;
    
    // Hole aktiven Eintrag
    const [activeEntries] = await connection.execute(
      `SELECT te.*, p.name as position_name, e.name as event_name
       FROM timeclock_entries te
       LEFT JOIN positions p ON te.position_id = p.id
       LEFT JOIN events e ON te.event_id = e.id
       WHERE te.staff_id = ? AND te.status = 'active'
       ORDER BY te.clock_in DESC
       LIMIT 1`,
      [staffId]
    );
    
    if (activeEntries.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Sie sind nicht eingestempelt',
        type: 'not_clocked_in'
      });
    }
    
    const entry = activeEntries[0];
    const clockIn = new Date(entry.clock_in);
    const clockOut = new Date();
    const totalMinutes = differenceInMinutes(clockOut, clockIn);
    
    // Prüfe auf automatische Pause
    const [pauseSettings] = await connection.execute(
      'SELECT setting_value FROM settings WHERE setting_key = "auto_break_minutes"',
      []
    );
    
    let breakMinutes = 0;
    const autoBreakThreshold = pauseSettings.length ? parseInt(pauseSettings[0].setting_value) : 360; // 6 Stunden
    
    if (totalMinutes > autoBreakThreshold) {
      breakMinutes = 30; // 30 Minuten Pause
    }
    
    const netMinutes = totalMinutes - breakMinutes;
    
    // Update Eintrag
    await connection.execute(
      `UPDATE timeclock_entries 
       SET clock_out = NOW(), 
           break_minutes = ?, 
           total_minutes = ?,
           status = 'completed'
       WHERE id = ?`,
      [breakMinutes, netMinutes, entry.id]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (action, entity_type, entity_id, details)
       VALUES ('clock_out', 'timeclock', ?, ?)`,
      [
        entry.id,
        JSON.stringify({
          staffId,
          staffName,
          totalHours: (netMinutes / 60).toFixed(2),
          breakMinutes
        })
      ]
    );
    
    await connection.commit();
    
    const hours = Math.floor(netMinutes / 60);
    const minutes = netMinutes % 60;
    
    res.json({
      success: true,
      message: `Auf Wiedersehen ${staffName}! Arbeitszeit: ${hours}h ${minutes}min`,
      summary: {
        clock_in: clockIn,
        clock_out: clockOut,
        total_hours: (netMinutes / 60).toFixed(2),
        break_minutes: breakMinutes,
        position: entry.position_name,
        event: entry.event_name
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Ausstempeln:', error);
    res.status(500).json({ 
      message: 'Fehler beim Ausstempeln' 
    });
  } finally {
    connection.release();
  }
};

// Status prüfen (für Kiosk Mode)
const checkClockStatus = async (req, res) => {
  try {
    const { personal_code } = req.params;
    
    // Hole Mitarbeiter
    const [staff] = await db.execute(
      `SELECT sp.id, sp.first_name, sp.last_name, sp.profile_image
       FROM staff_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.personal_code = ? AND u.is_active = 1`,
      [personal_code]
    );
    
    if (staff.length === 0) {
      return res.status(404).json({ 
        message: 'Ungültiger Personal-Code' 
      });
    }
    
    const staffData = staff[0];
    
    // Prüfe ob eingestempelt
    const [activeEntries] = await db.execute(
      `SELECT te.*, p.name as position_name, e.name as event_name
       FROM timeclock_entries te
       LEFT JOIN positions p ON te.position_id = p.id
       LEFT JOIN events e ON te.event_id = e.id
       WHERE te.staff_id = ? AND te.status = 'active'`,
      [staffData.id]
    );
    
    // Hole heutige Events
    const [todayEvents] = await db.execute(
      `SELECT DISTINCT e.id, e.name
       FROM events e
       JOIN event_invitations ei ON e.id = ei.event_id
       WHERE ei.staff_id = ? 
         AND ei.status = 'accepted'
         AND e.status = 'published'
         AND DATE(e.start_date) <= CURDATE()
         AND DATE(e.end_date) >= CURDATE()`,
      [staffData.id]
    );
    
    res.json({
      staff: {
        id: staffData.id,
        name: `${staffData.first_name} ${staffData.last_name}`,
        profile_image: staffData.profile_image
      },
      is_clocked_in: activeEntries.length > 0,
      current_entry: activeEntries[0] || null,
      today_events: todayEvents
    });
    
  } catch (error) {
    console.error('Fehler beim Prüfen des Status:', error);
    res.status(500).json({ 
      message: 'Fehler beim Prüfen des Status' 
    });
  }
};

// Admin: Alle Zeiteinträge abrufen
const getAllTimeEntries = async (req, res) => {
  try {
    const { 
      staff_id,
      event_id,
      from,
      to,
      status,
      page = 1,
      limit = 50
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        te.*,
        sp.first_name,
        sp.last_name,
        sp.personal_code,
        p.name as position_name,
        e.name as event_name,
        s.name as shift_name
      FROM timeclock_entries te
      JOIN staff_profiles sp ON te.staff_id = sp.id
      LEFT JOIN positions p ON te.position_id = p.id
      LEFT JOIN events e ON te.event_id = e.id
      LEFT JOIN shifts s ON te.shift_id = s.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (staff_id) {
      query += ' AND te.staff_id = ?';
      params.push(staff_id);
    }
    
    if (event_id) {
      query += ' AND te.event_id = ?';
      params.push(event_id);
    }
    
    if (from) {
      query += ' AND te.clock_in >= ?';
      params.push(from);
    }
    
    if (to) {
      query += ' AND te.clock_in <= ?';
      params.push(to);
    }
    
    if (status) {
      query += ' AND te.status = ?';
      params.push(status);
    }
    
    // Count total
    const countQuery = query.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;
    
    // Add ordering and pagination
    query += ' ORDER BY te.clock_in DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [entries] = await db.execute(query, params);
    
    res.json({
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Zeiteinträge:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Zeiteinträge' 
    });
  }
};

// Admin: Zeiteintrag bearbeiten
const updateTimeEntry = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { clock_in, clock_out, break_minutes, notes } = req.body;
    const adminId = req.user.id;
    
    // Hole bestehenden Eintrag
    const [entries] = await connection.execute(
      'SELECT * FROM timeclock_entries WHERE id = ?',
      [id]
    );
    
    if (entries.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Zeiteintrag nicht gefunden' 
      });
    }
    
    const entry = entries[0];
    
    // Berechne neue Gesamtzeit
    let totalMinutes = entry.total_minutes;
    if (clock_in && clock_out) {
      const newClockIn = new Date(clock_in);
      const newClockOut = new Date(clock_out);
      const grossMinutes = differenceInMinutes(newClockOut, newClockIn);
      totalMinutes = grossMinutes - (break_minutes || 0);
    }
    
    // Update
    const updates = [];
    const updateParams = [];
    
    if (clock_in) {
      updates.push('clock_in = ?');
      updateParams.push(clock_in);
    }
    
    if (clock_out) {
      updates.push('clock_out = ?');
      updateParams.push(clock_out);
    }
    
    if (break_minutes !== undefined) {
      updates.push('break_minutes = ?');
      updateParams.push(break_minutes);
    }
    
    if (notes !== undefined) {
      updates.push('notes = ?');
      updateParams.push(notes);
    }
    
    updates.push('total_minutes = ?');
    updateParams.push(totalMinutes);
    
    updateParams.push(id);
    
    await connection.execute(
      `UPDATE timeclock_entries SET ${updates.join(', ')} WHERE id = ?`,
      updateParams
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'timeclock_entry_updated', 'timeclock', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          changes: Object.keys(req.body),
          oldValues: {
            clock_in: entry.clock_in,
            clock_out: entry.clock_out,
            break_minutes: entry.break_minutes
          }
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Zeiteintrag erfolgreich aktualisiert'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Aktualisieren des Zeiteintrags:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren' 
    });
  } finally {
    connection.release();
  }
};

// Admin: Zeiteintrag löschen
const deleteTimeEntry = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const adminId = req.user.id;
    
    // Hole Eintrag für Log
    const [entries] = await connection.execute(
      `SELECT te.*, sp.first_name, sp.last_name
       FROM timeclock_entries te
       JOIN staff_profiles sp ON te.staff_id = sp.id
       WHERE te.id = ?`,
      [id]
    );
    
    if (entries.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Zeiteintrag nicht gefunden' 
      });
    }
    
    const entry = entries[0];
    
    // Lösche Eintrag
    await connection.execute(
      'DELETE FROM timeclock_entries WHERE id = ?',
      [id]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'timeclock_entry_deleted', 'timeclock', ?, ?)`,
      [
        adminId,
        id,
        JSON.stringify({
          staffName: `${entry.first_name} ${entry.last_name}`,
          clockIn: entry.clock_in,
          clockOut: entry.clock_out,
          totalMinutes: entry.total_minutes
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Zeiteintrag erfolgreich gelöscht'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Löschen des Zeiteintrags:', error);
    res.status(500).json({ 
      message: 'Fehler beim Löschen' 
    });
  } finally {
    connection.release();
  }
};

// Arbeitszeitbericht erstellen
const generateTimeReport = async (req, res) => {
  try {
    const { staff_id, event_id, month, year } = req.query;
    
    const startDate = month && year 
      ? startOfMonth(new Date(year, month - 1))
      : startOfMonth(new Date());
    
    const endDate = month && year
      ? endOfMonth(new Date(year, month - 1))
      : endOfMonth(new Date());
    
    let query = `
      SELECT 
        te.*,
        sp.first_name,
        sp.last_name,
        sp.personal_code,
        p.name as position_name,
        e.name as event_name
      FROM timeclock_entries te
      JOIN staff_profiles sp ON te.staff_id = sp.id
      LEFT JOIN positions p ON te.position_id = p.id
      LEFT JOIN events e ON te.event_id = e.id
      WHERE te.status = 'completed'
        AND te.clock_in >= ?
        AND te.clock_in <= ?
    `;
    
    const params = [startDate, endDate];
    
    if (staff_id) {
      query += ' AND te.staff_id = ?';
      params.push(staff_id);
    }
    
    if (event_id) {
      query += ' AND te.event_id = ?';
      params.push(event_id);
    }
    
    query += ' ORDER BY te.clock_in';
    
    const [entries] = await db.execute(query, params);
    
    // Gruppiere nach Mitarbeiter
    const byStaff = {};
    let totalHours = 0;
    let totalBreakMinutes = 0;
    
    entries.forEach(entry => {
      const staffKey = `${entry.staff_id}`;
      if (!byStaff[staffKey]) {
        byStaff[staffKey] = {
          staff_id: entry.staff_id,
          name: `${entry.first_name} ${entry.last_name}`,
          personal_code: entry.personal_code,
          entries: [],
          total_minutes: 0,
          total_break_minutes: 0,
          days_worked: new Set()
        };
      }
      
      byStaff[staffKey].entries.push(entry);
      byStaff[staffKey].total_minutes += entry.total_minutes || 0;
      byStaff[staffKey].total_break_minutes += entry.break_minutes || 0;
      byStaff[staffKey].days_worked.add(format(new Date(entry.clock_in), 'yyyy-MM-dd'));
      
      totalHours += (entry.total_minutes || 0) / 60;
      totalBreakMinutes += entry.break_minutes || 0;
    });
    
    // Konvertiere zu Array und berechne Durchschnitte
    const staffReports = Object.values(byStaff).map(staff => ({
      ...staff,
      total_hours: (staff.total_minutes / 60).toFixed(2),
      days_worked: staff.days_worked.size,
      avg_hours_per_day: (staff.total_minutes / 60 / staff.days_worked.size).toFixed(2)
    }));
    
    res.json({
      period: {
        start: startDate,
        end: endDate,
        month: format(startDate, 'MMMM yyyy', { locale: de })
      },
      summary: {
        total_entries: entries.length,
        total_staff: staffReports.length,
        total_hours: totalHours.toFixed(2),
        total_break_hours: (totalBreakMinutes / 60).toFixed(2)
      },
      staff_reports: staffReports,
      entries
    });
    
  } catch (error) {
    console.error('Fehler beim Erstellen des Berichts:', error);
    res.status(500).json({ 
      message: 'Fehler beim Erstellen des Berichts' 
    });
  }
};

// Staff: Eigene Zeiteinträge abrufen
const getMyTimeEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to, limit = 50 } = req.query;
    
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
        te.*,
        p.name as position_name,
        e.name as event_name,
        s.name as shift_name
      FROM timeclock_entries te
      LEFT JOIN positions p ON te.position_id = p.id
      LEFT JOIN events e ON te.event_id = e.id
      LEFT JOIN shifts s ON te.shift_id = s.id
      WHERE te.staff_id = ?
    `;
    
    const params = [staffId];
    
    if (from) {
      query += ' AND te.clock_in >= ?';
      params.push(from);
    }
    
    if (to) {
      query += ' AND te.clock_in <= ?';
      params.push(to);
    }
    
    query += ' ORDER BY te.clock_in DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [entries] = await db.execute(query, params);
    
    // Berechne Statistiken für aktuellen Monat
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    
    const [monthStats] = await db.execute(
      `SELECT 
        COUNT(*) as entries_count,
        SUM(total_minutes) as total_minutes,
        COUNT(DISTINCT DATE(clock_in)) as days_worked
       FROM timeclock_entries
       WHERE staff_id = ?
         AND status = 'completed'
         AND clock_in >= ?
         AND clock_in <= ?`,
      [staffId, monthStart, monthEnd]
    );
    
    res.json({
      entries,
      current_month_stats: {
        total_hours: ((monthStats[0].total_minutes || 0) / 60).toFixed(2),
        days_worked: monthStats[0].days_worked || 0,
        entries_count: monthStats[0].entries_count || 0
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der eigenen Zeiteinträge:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Zeiteinträge' 
    });
  }
};

// Verfügbare Positionen abrufen
const getAvailablePositions = async (req, res) => {
  try {
    const [positions] = await db.execute(
      'SELECT id, name, color FROM positions WHERE is_active = 1 ORDER BY name'
    );
    
    res.json({ positions });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Positionen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Positionen' 
    });
  }
};

// Admin: Manueller Clock-In/Out
const manualClockEntry = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      staff_id,
      position_id,
      event_id,
      clock_in,
      clock_out,
      break_minutes = 0,
      notes
    } = req.body;
    
    const adminId = req.user.id;
    
    // Validiere Zeiten
    const clockInDate = new Date(clock_in);
    const clockOutDate = clock_out ? new Date(clock_out) : null;
    
    if (clockOutDate && clockOutDate <= clockInDate) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Ausstempelzeit muss nach Einstempelzeit liegen' 
      });
    }
    
    // Berechne Gesamtzeit
    let totalMinutes = null;
    let status = 'active';
    
    if (clockOutDate) {
      const grossMinutes = differenceInMinutes(clockOutDate, clockInDate);
      totalMinutes = grossMinutes - break_minutes;
      status = 'completed';
    }
    
    // Erstelle Eintrag
    const [result] = await connection.execute(
      `INSERT INTO timeclock_entries 
       (staff_id, event_id, position_id, clock_in, clock_out, 
        break_minutes, total_minutes, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        staff_id,
        event_id || null,
        position_id,
        clockInDate,
        clockOutDate,
        break_minutes,
        totalMinutes,
        status,
        notes || null
      ]
    );
    
    // Hole Mitarbeiter-Name für Log
    const [staff] = await connection.execute(
      'SELECT first_name, last_name FROM staff_profiles WHERE id = ?',
      [staff_id]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'manual_timeclock_entry', 'timeclock', ?, ?)`,
      [
        adminId,
        result.insertId,
        JSON.stringify({
          staffName: `${staff[0].first_name} ${staff[0].last_name}`,
          clockIn: clock_in,
          clockOut: clock_out,
          totalHours: totalMinutes ? (totalMinutes / 60).toFixed(2) : null
        })
      ]
    );
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Zeiteintrag erfolgreich erstellt',
      entryId: result.insertId
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim manuellen Eintrag:', error);
    res.status(500).json({ 
      message: 'Fehler beim Erstellen des Eintrags' 
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  // Kiosk Mode
  kioskClockIn,
  kioskClockOut,
  checkClockStatus,
  
  // Admin
  getAllTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  generateTimeReport,
  manualClockEntry,
  
  // Staff
  getMyTimeEntries,
  
  // Shared
  getAvailablePositions
};


