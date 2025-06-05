// backend/src/controllers/timeclockController.js
const db = require('../config/database');
const { validationResult } = require('express-validator');
const { format, differenceInMinutes, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO } = require('date-fns');
const { de } = require('date-fns/locale');

// Hilfsfunktion für Zeitberechnung mit automatischer Pause
const calculateWorkingTime = async (clockIn, clockOut, manualBreakMinutes = null) => {
  if (!clockIn || !clockOut) {
    return {
      grossMinutes: 0,
      breakMinutes: 0,
      netMinutes: 0,
      grossHours: '0.00',
      netHours: '0.00'
    };
  }
  
  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);
  
  // Bruttoarbeitszeit in Minuten
  const grossMinutes = differenceInMinutes(clockOutDate, clockInDate);
  
  let breakMinutes = 0;
  
  // Wenn manuelle Pause angegeben, diese verwenden
  if (manualBreakMinutes !== null && manualBreakMinutes !== undefined) {
    breakMinutes = parseInt(manualBreakMinutes) || 0;
  } else {
    // Automatische Pausenberechnung aus Settings
    try {
      const [settings] = await db.execute(
        `SELECT setting_key, setting_value 
         FROM settings 
         WHERE setting_key IN ('auto_break_enabled', 'auto_break_after_hours', 'auto_break_duration', 
                              'auto_break_after_hours_2', 'auto_break_duration_2')`
      );
      
      const settingsMap = {};
      settings.forEach(s => settingsMap[s.setting_key] = s.setting_value);
      
      const autoBreakEnabled = settingsMap.auto_break_enabled === '1' || settingsMap.auto_break_enabled === 'true';
      
      if (autoBreakEnabled) {
        const threshold1 = parseInt(settingsMap.auto_break_after_hours || '6') * 60;
        const threshold2 = parseInt(settingsMap.auto_break_after_hours_2 || '9') * 60;
        const break1 = parseInt(settingsMap.auto_break_duration || '30');
        const break2 = parseInt(settingsMap.auto_break_duration_2 || '45');
        
        if (grossMinutes > threshold2) {
          breakMinutes = break2;
        } else if (grossMinutes > threshold1) {
          breakMinutes = break1;
        }
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Pauseneinstellungen:', error);
      // Keine automatische Pause bei Fehler
    }
  }
  
  // Nettoarbeitszeit
  const netMinutes = Math.max(0, grossMinutes - breakMinutes);
  
  return {
    grossMinutes,
    breakMinutes,
    netMinutes,
    grossHours: (grossMinutes / 60).toFixed(2),
    netHours: (netMinutes / 60).toFixed(2)
  };
};

// Kiosk Clock In
const kioskClockIn = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { personal_code, position_id, event_id, kiosk_token } = req.body;
    
    // Optional: Validate kiosk token if configured
    const expectedToken = process.env.KIOSK_TOKEN;
    if (expectedToken && expectedToken !== 'your-secure-kiosk-token-here-change-this') {
      if (kiosk_token !== expectedToken) {
        await connection.rollback();
        return res.status(401).json({ 
          message: 'Ungültiger Kiosk-Token' 
        });
      }
    }
    
    // Hole Mitarbeiter anhand Personal-Code
    const [staff] = await connection.execute(
      `SELECT sp.id, sp.first_name, sp.last_name, sp.personal_code, u.is_active
       FROM staff_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.personal_code = ?`,
      [personal_code.toUpperCase()]
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
    
    // Prüfe ob bereits eingestempelt
    const [activeEntries] = await connection.execute(
      'SELECT id FROM timeclock_entries WHERE staff_id = ? AND status = "active"',
      [staffId]
    );
    
    if (activeEntries.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Sie sind bereits eingestempelt' 
      });
    }
    
    // Erstelle Eintrag
    const [result] = await connection.execute(
      `INSERT INTO timeclock_entries (staff_id, position_id, event_id, clock_in, status) 
       VALUES (?, ?, ?, NOW(), 'active')`,
      [staffId, position_id, event_id || null]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (NULL, 'clock_in', 'timeclock', ?, ?)`,
      [
        result.insertId,
        JSON.stringify({
          staffName: `${staff[0].first_name} ${staff[0].last_name}`,
          personalCode: personal_code,
          method: 'kiosk'
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: `Erfolgreich eingestempelt - ${staff[0].first_name} ${staff[0].last_name}`,
      entry_id: result.insertId
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Kiosk Clock-In:', error);
    res.status(500).json({ 
      message: 'Fehler beim Einstempeln' 
    });
  } finally {
    connection.release();
  }
};

// Kiosk Clock Out
const kioskClockOut = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { personal_code, kiosk_token } = req.body;
    
    // Optional: Validate kiosk token if configured
    const expectedToken = process.env.KIOSK_TOKEN;
    if (expectedToken && expectedToken !== 'your-secure-kiosk-token-here-change-this') {
      if (kiosk_token !== expectedToken) {
        await connection.rollback();
        return res.status(401).json({ 
          message: 'Ungültiger Kiosk-Token' 
        });
      }
    }
    
    // Hole Mitarbeiter
    const [staff] = await connection.execute(
      `SELECT sp.id, sp.first_name, sp.last_name
       FROM staff_profiles sp
       WHERE sp.personal_code = ?`,
      [personal_code.toUpperCase()]
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
    
    // Berechne Arbeitszeit
    const timeCalc = await calculateWorkingTime(clockIn, clockOut);
    
    // Update Eintrag
    await connection.execute(
      `UPDATE timeclock_entries 
       SET clock_out = ?, 
           break_minutes = ?, 
           total_minutes = ?,
           status = 'completed'
       WHERE id = ?`,
      [clockOut, timeCalc.breakMinutes, timeCalc.netMinutes, entry.id]
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
          grossHours: timeCalc.grossHours,
          netHours: timeCalc.netHours,
          breakMinutes: timeCalc.breakMinutes,
          clockIn: clockIn.toISOString(),
          clockOut: clockOut.toISOString()
        })
      ]
    );
    
    await connection.commit();
    
    const hours = Math.floor(timeCalc.netMinutes / 60);
    const minutes = timeCalc.netMinutes % 60;
    
    res.json({
      success: true,
      message: `Auf Wiedersehen ${staffName}! Arbeitszeit: ${hours}h ${minutes}min`,
      summary: {
        clock_in: clockIn,
        clock_out: clockOut,
        gross_minutes: timeCalc.grossMinutes,
        gross_hours: timeCalc.grossHours,
        break_minutes: timeCalc.breakMinutes,
        net_minutes: timeCalc.netMinutes,
        net_hours: timeCalc.netHours,
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
      [personal_code.toUpperCase()]
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
    
    // Neue Zeiten für Berechnung
    const newClockIn = clock_in ? new Date(clock_in) : new Date(entry.clock_in);
    const newClockOut = clock_out ? new Date(clock_out) : (entry.clock_out ? new Date(entry.clock_out) : null);
    
    // Berechne neue Gesamtzeit
    let totalMinutes = entry.total_minutes;
    if (newClockOut) {
      const timeCalc = await calculateWorkingTime(
        newClockIn, 
        newClockOut, 
        break_minutes !== undefined ? break_minutes : entry.break_minutes
      );
      totalMinutes = timeCalc.netMinutes;
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
    
    // Wenn clock_out gesetzt wird, Status auf 'completed' setzen
    if (clock_out && entry.status === 'active') {
      updates.push('status = ?');
      updateParams.push('completed');
    }
    
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
            break_minutes: entry.break_minutes,
            total_minutes: entry.total_minutes
          },
          newValues: {
            clock_in: clock_in || entry.clock_in,
            clock_out: clock_out || entry.clock_out,
            break_minutes: break_minutes !== undefined ? break_minutes : entry.break_minutes,
            total_minutes: totalMinutes
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
      break_minutes = null,
      notes,
      disable_auto_break = false
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
    let finalBreakMinutes = 0;
    let status = 'active';
    let timeCalc = null;
    
    if (clockOutDate) {
      // Berechne mit automatischer Pause wenn nicht deaktiviert
      timeCalc = await calculateWorkingTime(
        clockInDate, 
        clockOutDate, 
        disable_auto_break ? 0 : break_minutes
      );
      
      totalMinutes = timeCalc.netMinutes;
      finalBreakMinutes = timeCalc.breakMinutes;
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
        finalBreakMinutes,
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
          grossHours: timeCalc ? timeCalc.grossHours : null,
          netHours: timeCalc ? timeCalc.netHours : null,
          breakMinutes: finalBreakMinutes
        })
      ]
    );
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Zeiteintrag erfolgreich erstellt',
      entryId: result.insertId,
      summary: timeCalc ? {
        gross_minutes: timeCalc.grossMinutes,
        break_minutes: timeCalc.breakMinutes,
        net_minutes: timeCalc.netMinutes,
        gross_hours: timeCalc.grossHours,
        net_hours: timeCalc.netHours
      } : null
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

// Export von Zeiteinträgen
const exportTimeEntries = async (req, res) => {
  try {
    const { 
      staff_id,
      event_id,
      from,
      to,
      format: exportFormat = 'csv'
    } = req.query;
    
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
    
    if (staff_id && staff_id !== 'self') {
      query += ' AND te.staff_id = ?';
      params.push(staff_id);
    } else if (staff_id === 'self' && req.user) {
      // Für Staff-User: Eigene Daten
      const [staffResult] = await db.execute(
        'SELECT id FROM staff_profiles WHERE user_id = ?',
        [req.user.id]
      );
      if (staffResult.length > 0) {
        query += ' AND te.staff_id = ?';
        params.push(staffResult[0].id);
      }
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
    
    query += ' ORDER BY te.clock_in DESC';
    
    const [entries] = await db.execute(query, params);
    
    if (exportFormat === 'csv') {
      // CSV Format
      let csv = 'Mitarbeiter,Personal-Code,Datum,Einstempelzeit,Ausstempelzeit,Brutto (Minuten),Pause (Minuten),Netto (Minuten),Position,Veranstaltung,Notizen\n';
      
      for (const entry of entries) {
        const dateStr = format(new Date(entry.clock_in), 'dd.MM.yyyy');
        const clockInTime = format(new Date(entry.clock_in), 'HH:mm');
        const clockOutTime = entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm') : '';
        
        // Berechne Bruttozeit
        let grossMinutes = 0;
        if (entry.clock_out) {
          grossMinutes = differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in));
        }
        
        csv += `"${entry.first_name} ${entry.last_name}",`;
        csv += `"${entry.personal_code}",`;
        csv += `"${dateStr}",`;
        csv += `"${clockInTime}",`;
        csv += `"${clockOutTime}",`;
        csv += `"${grossMinutes}",`;
        csv += `"${entry.break_minutes || 0}",`;
        csv += `"${entry.total_minutes || 0}",`;
        csv += `"${entry.position_name || ''}",`;
        csv += `"${entry.event_name || ''}",`;
        csv += `"${entry.notes || ''}"\n`;
      }
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=arbeitszeiten_${from || 'alle'}_${to || 'alle'}.csv`);
      res.send('\ufeff' + csv); // UTF-8 BOM für Excel
    } else {
      res.status(501).json({ message: 'Excel Export noch nicht implementiert' });
    }
    
  } catch (error) {
    console.error('Fehler beim Exportieren der Zeiteinträge:', error);
    res.status(500).json({ 
      message: 'Fehler beim Exportieren der Zeiteinträge' 
    });
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
  exportTimeEntries,
  
  // Staff
  getMyTimeEntries,
  
  // Shared
  getAvailablePositions
};


