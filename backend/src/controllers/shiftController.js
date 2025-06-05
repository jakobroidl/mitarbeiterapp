// backend/src/controllers/shiftController.js
const db = require('../config/database');
const { validationResult } = require('express-validator');
const { sendShiftAssignmentEmail } = require('../services/emailService');
const { format, parseISO, isWithinInterval, areIntervalsOverlapping } = require('date-fns');

// Helper: Prüft ob Mitarbeiter für Schicht qualifiziert ist
const checkStaffQualifications = async (connection, staffId, shiftId) => {
  const [result] = await connection.execute(`
    SELECT 
      COUNT(DISTINCT sq.qualification_id) as has_qualifications,
      COUNT(DISTINCT shq.qualification_id) as required_qualifications
    FROM shift_qualifications shq
    LEFT JOIN staff_qualifications sq ON shq.qualification_id = sq.qualification_id 
      AND sq.staff_id = ?
    WHERE shq.shift_id = ?
  `, [staffId, shiftId]);
  
  const check = result[0];
  
  // Wenn keine Qualifikationen erforderlich sind, ist jeder qualifiziert
  if (check.required_qualifications === 0) {
    return { qualified: true, hasAll: true };
  }
  
  return {
    qualified: check.has_qualifications > 0,
    hasAll: check.has_qualifications === check.required_qualifications,
    has: check.has_qualifications,
    required: check.required_qualifications
  };
};

// Helper: Prüft Zeitüberschneidungen
const checkTimeConflicts = async (connection, staffId, shiftId, excludeAssignmentId = null) => {
  let query = `
    SELECT 
      s1.id as shift_id,
      s1.name as shift_name,
      s1.start_time,
      s1.end_time,
      e.name as event_name,
      sa.status
    FROM shift_assignments sa
    JOIN shifts s1 ON sa.shift_id = s1.id
    JOIN shifts s2 ON s2.id = ?
    JOIN events e ON s1.event_id = e.id
    WHERE sa.staff_id = ?
      AND sa.status IN ('preliminary', 'final', 'confirmed')
      AND (
        (s1.start_time < s2.end_time AND s1.end_time > s2.start_time)
      )
  `;
  
  const params = [shiftId, staffId];
  
  if (excludeAssignmentId) {
    query += ' AND sa.id != ?';
    params.push(excludeAssignmentId);
  }
  
  const [conflicts] = await connection.execute(query, params);
  
  return conflicts;
};

// Schichtbewerber abrufen (für Admin) - AKTUALISIERT
const getShiftApplications = async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    // Hole Schicht-Details mit Qualifikationen
    const [shifts] = await db.execute(
      `SELECT 
        s.*, 
        e.name as event_name,
        GROUP_CONCAT(DISTINCT q.name ORDER BY q.name SEPARATOR ', ') as required_qualifications,
        GROUP_CONCAT(DISTINCT q.id) as qualification_ids
       FROM shifts s 
       JOIN events e ON s.event_id = e.id 
       LEFT JOIN shift_qualifications sq ON s.id = sq.shift_id
       LEFT JOIN qualifications q ON sq.qualification_id = q.id
       WHERE s.id = ?
       GROUP BY s.id`,
      [shiftId]
    );
    
    if (shifts.length === 0) {
      return res.status(404).json({ 
        message: 'Schicht nicht gefunden' 
      });
    }
    
    const shift = shifts[0];
    
    // Hole alle Bewerbungen mit Qualifikations-Check
    const [applications] = await db.execute(`
      SELECT 
        sa.id,
        sa.status,
        sa.applied_at,
        sp.id as staff_id,
        CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
        sp.personal_code,
        sp.profile_image,
        u.email,
        GROUP_CONCAT(DISTINCT q.name ORDER BY q.name SEPARATOR ', ') as staff_qualifications,
        GROUP_CONCAT(DISTINCT q.id) as staff_qualification_ids,
        (
          SELECT COUNT(DISTINCT sq2.qualification_id)
          FROM shift_qualifications shq
          JOIN staff_qualifications sq2 ON shq.qualification_id = sq2.qualification_id
          WHERE shq.shift_id = ? AND sq2.staff_id = sp.id
        ) as matching_qualifications,
        (
          SELECT COUNT(DISTINCT qualification_id)
          FROM shift_qualifications
          WHERE shift_id = ?
        ) as required_qualification_count
      FROM shift_applications sa
      JOIN staff_profiles sp ON sa.staff_id = sp.id
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN staff_qualifications sq ON sp.id = sq.staff_id
      LEFT JOIN qualifications q ON sq.qualification_id = q.id
      WHERE sa.shift_id = ?
      GROUP BY sa.id
      ORDER BY 
        CASE WHEN sa.status = 'pending' THEN 0 ELSE 1 END,
        matching_qualifications DESC,
        sa.applied_at
    `, [shiftId, shiftId, shiftId]);
    
    // Prüfe Zeitkonflikte für jeden Bewerber
    for (let app of applications) {
      const conflicts = await checkTimeConflicts(db, app.staff_id, shiftId);
      app.has_conflicts = conflicts.length > 0;
      app.conflicts = conflicts;
      app.fully_qualified = app.matching_qualifications === app.required_qualification_count;
    }
    
    res.json({
      shift,
      applications,
      stats: {
        total: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        fully_qualified: applications.filter(a => a.fully_qualified).length,
        with_conflicts: applications.filter(a => a.has_conflicts).length
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Schichtbewerbungen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Bewerbungen' 
    });
  }
};

// Mitarbeiter zu Schicht einteilen (Admin) - AKTUALISIERT
const assignStaffToShift = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId } = req.params;
    const { staff_id, position_id, status = 'preliminary', notes } = req.body;
    const adminId = req.user.id;
    
    // Prüfe ob Schicht existiert
    const [shifts] = await connection.execute(
      `SELECT s.*, e.name as event_name, e.id as event_id
       FROM shifts s 
       JOIN events e ON s.event_id = e.id 
       WHERE s.id = ?`,
      [shiftId]
    );
    
    if (shifts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Schicht nicht gefunden' 
      });
    }
    
    const shift = shifts[0];
    
    // Prüfe Qualifikationen
    const qualCheck = await checkStaffQualifications(connection, staff_id, shiftId);
    if (!qualCheck.qualified) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Mitarbeiter hat nicht die erforderlichen Qualifikationen für diese Schicht',
        details: {
          has: qualCheck.has,
          required: qualCheck.required
        }
      });
    }
    
    // Prüfe Zeitkonflikte
    const conflicts = await checkTimeConflicts(connection, staff_id, shiftId);
    if (conflicts.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Mitarbeiter hat Zeitkonflikte mit anderen Schichten',
        conflicts: conflicts.map(c => ({
          shift: c.shift_name,
          event: c.event_name,
          time: `${format(parseISO(c.start_time), 'dd.MM. HH:mm')} - ${format(parseISO(c.end_time), 'HH:mm')}`
        }))
      });
    }
    
    // Prüfe ob Mitarbeiter sich beworben hat
    const [application] = await connection.execute(
      'SELECT id FROM shift_applications WHERE shift_id = ? AND staff_id = ?',
      [shiftId, staff_id]
    );
    
    if (application.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Mitarbeiter hat sich nicht für diese Schicht beworben' 
      });
    }
    
    // Prüfe ob bereits eine Zuweisung existiert
    const [existing] = await connection.execute(
      'SELECT id FROM shift_assignments WHERE shift_id = ? AND staff_id = ?',
      [shiftId, staff_id]
    );
    
    let assignmentId;
    
    if (existing.length > 0) {
      // Update bestehende Zuweisung
      assignmentId = existing[0].id;
      await connection.execute(
        `UPDATE shift_assignments 
         SET status = ?, position_id = ?, notes = ?, assigned_by = ?, assigned_at = NOW()
         WHERE id = ?`,
        [status, position_id || null, notes || null, adminId, assignmentId]
      );
    } else {
      // Erstelle neue Zuweisung
      const [result] = await connection.execute(
        `INSERT INTO shift_assignments 
         (shift_id, staff_id, status, assigned_by, position_id, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [shiftId, staff_id, status, adminId, position_id || null, notes || null]
      );
      assignmentId = result.insertId;
    }
    
    // Update Bewerbungsstatus
    await connection.execute(
      'UPDATE shift_applications SET status = "approved" WHERE shift_id = ? AND staff_id = ?',
      [shiftId, staff_id]
    );
    
    // Hole Mitarbeiter-Details für E-Mail
    const [staffData] = await connection.execute(
      `SELECT sp.first_name, u.email
       FROM staff_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.id = ?`,
      [staff_id]
    );
    
    // Sende E-Mail wenn Status final ist
    if (status === 'final' && staffData.length > 0) {
      sendShiftAssignmentEmail(
        staffData[0].email,
        staffData[0].first_name,
        shift.event_name,
        'finalisiert'
      ).catch(err => console.error('E-Mail Fehler:', err));
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'shift_assigned', 'shift_assignment', ?, ?)`,
      [
        adminId,
        assignmentId,
        JSON.stringify({
          shiftName: shift.name,
          eventName: shift.event_name,
          staffName: staffData[0]?.first_name,
          status,
          fullyQualified: qualCheck.hasAll
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Mitarbeiter erfolgreich eingeteilt',
      assignmentId,
      qualificationStatus: qualCheck
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Einteilen des Mitarbeiters:', error);
    res.status(500).json({ 
      message: 'Fehler beim Einteilen des Mitarbeiters' 
    });
  } finally {
    connection.release();
  }
};

// Schichtplan für Event abrufen - AKTUALISIERT
const getEventShiftPlan = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Hole alle Schichten mit Qualifikationen
    const [shifts] = await db.execute(`
      SELECT 
        s.*,
        p.name as position_name,
        p.color as position_color,
        GROUP_CONCAT(DISTINCT q.id) as qualification_ids,
        GROUP_CONCAT(DISTINCT q.name ORDER BY q.name SEPARATOR ', ') as required_qualifications,
        DATE_FORMAT(s.start_time, '%Y-%m-%d') as shift_date,
        DATE_FORMAT(s.start_time, '%H:%i') as start_time_only,
        DATE_FORMAT(s.end_time, '%H:%i') as end_time_only
      FROM shifts s
      LEFT JOIN positions p ON s.position_id = p.id
      LEFT JOIN shift_qualifications sq ON s.id = sq.shift_id
      LEFT JOIN qualifications q ON sq.qualification_id = q.id
      WHERE s.event_id = ?
      GROUP BY s.id
      ORDER BY s.start_time
    `, [eventId]);
    
    // Hole alle Zuweisungen
    const [assignments] = await db.execute(`
      SELECT 
        sa.*,
        s.id as shift_id,
        sp.id as staff_id,
        CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
        sp.personal_code,
        sp.profile_image,
        p.name as assigned_position_name,
        GROUP_CONCAT(DISTINCT q.name ORDER BY q.name SEPARATOR ', ') as staff_qualifications
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN staff_profiles sp ON sa.staff_id = sp.id
      LEFT JOIN positions p ON sa.position_id = p.id
      LEFT JOIN staff_qualifications sq ON sp.id = sq.staff_id
      LEFT JOIN qualifications q ON sq.qualification_id = q.id
      WHERE s.event_id = ?
      GROUP BY sa.id
    `, [eventId]);
    
    // Hole Bewerbungen für diese Schichten
    const [applications] = await db.execute(`
      SELECT 
        sapp.*,
        sp.id as staff_id,
        CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
        sp.personal_code,
        sp.profile_image,
        GROUP_CONCAT(DISTINCT q.name ORDER BY q.name SEPARATOR ', ') as qualifications,
        GROUP_CONCAT(DISTINCT q.id) as qualification_ids
      FROM shift_applications sapp
      JOIN shifts s ON sapp.shift_id = s.id
      JOIN staff_profiles sp ON sapp.staff_id = sp.id
      LEFT JOIN staff_qualifications sq ON sp.id = sq.staff_id
      LEFT JOIN qualifications q ON sq.qualification_id = q.id
      WHERE s.event_id = ? AND sapp.status = 'pending'
      GROUP BY sapp.id
    `, [eventId]);
    
    // Hole verfügbare Mitarbeiter (die zur Veranstaltung eingeladen wurden)
    const [availableStaff] = await db.execute(`
      SELECT 
        sp.id,
        CONCAT(sp.first_name, ' ', sp.last_name) as name,
        sp.personal_code,
        sp.profile_image,
        u.email,
        GROUP_CONCAT(DISTINCT q.name ORDER BY q.name SEPARATOR ', ') as qualifications,
        GROUP_CONCAT(DISTINCT q.id) as qualification_ids
      FROM event_invitations ei
      JOIN staff_profiles sp ON ei.staff_id = sp.id
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN staff_qualifications sq ON sp.id = sq.staff_id
      LEFT JOIN qualifications q ON sq.qualification_id = q.id
      WHERE ei.event_id = ? 
        AND ei.status = 'accepted'
        AND u.is_active = 1
      GROUP BY sp.id
      ORDER BY sp.last_name, sp.first_name
    `, [eventId]);
    
    // Strukturiere Daten
    const shiftPlan = await Promise.all(shifts.map(async (shift) => {
      const shiftAssignments = assignments.filter(a => a.shift_id === shift.id);
      const shiftApplications = applications.filter(a => a.shift_id === shift.id);
      
      // Prüfe Qualifikationen und Konflikte für jeden Bewerber
      const applicantsWithCheck = await Promise.all(shiftApplications.map(async (app) => {
        const qualCheck = await checkStaffQualifications(db, app.staff_id, shift.id);
        const conflicts = await checkTimeConflicts(db, app.staff_id, shift.id);
        
        return {
          ...app,
          fully_qualified: qualCheck.hasAll,
          qualification_match: qualCheck,
          has_conflicts: conflicts.length > 0,
          conflicts
        };
      }));
      
      return {
        ...shift,
        assignments: shiftAssignments,
        applications: applicantsWithCheck,
        coverage: {
          required: shift.required_staff,
          assigned: shiftAssignments.filter(a => a.status !== 'cancelled').length,
          confirmed: shiftAssignments.filter(a => a.status === 'confirmed').length,
          applicants: applicantsWithCheck.length,
          qualified_applicants: applicantsWithCheck.filter(a => a.fully_qualified).length
        }
      };
    }));
    
    // Gruppiere Schichten nach Datum
    const shiftsByDate = {};
    shiftPlan.forEach(shift => {
      const date = shift.shift_date;
      if (!shiftsByDate[date]) {
        shiftsByDate[date] = [];
      }
      shiftsByDate[date].push(shift);
    });
    
    res.json({
      shifts: shiftPlan,
      shiftsByDate,
      availableStaff, // Jetzt enthalten!
      stats: {
        totalShifts: shiftPlan.length,
        totalPositionsNeeded: shiftPlan.reduce((sum, s) => sum + s.required_staff, 0),
        totalAssigned: shiftPlan.reduce((sum, s) => sum + s.coverage.assigned, 0),
        totalApplications: applications.length,
        availableStaffCount: availableStaff.length
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen des Schichtplans:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen des Schichtplans' 
    });
  }
};


// Staff: Für Schicht bewerben - AKTUALISIERT
const applyForShift = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId } = req.params;
    const userId = req.user.id;
    
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
    
    // Prüfe ob Schicht existiert
    const [shifts] = await connection.execute(
      `SELECT s.*, e.name as event_name, ei.status as invitation_status
       FROM shifts s
       JOIN events e ON s.event_id = e.id
       LEFT JOIN event_invitations ei ON e.id = ei.event_id AND ei.staff_id = ?
       WHERE s.id = ? AND e.status = 'published'`,
      [staffId, shiftId]
    );
    
    if (shifts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Schicht nicht gefunden' 
      });
    }
    
    const shift = shifts[0];
    
    if (shift.invitation_status !== 'accepted') {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Sie müssen erst die Event-Einladung annehmen' 
      });
    }
    
    // Prüfe Qualifikationen
    const qualCheck = await checkStaffQualifications(connection, staffId, shiftId);
    if (!qualCheck.qualified) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Sie haben nicht die erforderlichen Qualifikationen für diese Schicht',
        details: {
          message: `Sie haben ${qualCheck.has} von ${qualCheck.required} erforderlichen Qualifikationen`
        }
      });
    }
    
    // Prüfe Zeitkonflikte
    const conflicts = await checkTimeConflicts(connection, staffId, shiftId);
    if (conflicts.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Sie haben bereits andere Schichten in diesem Zeitraum',
        conflicts: conflicts.map(c => ({
          shift: c.shift_name,
          event: c.event_name,
          time: `${format(parseISO(c.start_time), 'dd.MM. HH:mm')} - ${format(parseISO(c.end_time), 'HH:mm')}`
        }))
      });
    }
    
    // Prüfe ob bereits beworben
    const [existing] = await connection.execute(
      'SELECT id FROM shift_applications WHERE shift_id = ? AND staff_id = ?',
      [shiftId, staffId]
    );
    
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Sie haben sich bereits für diese Schicht beworben' 
      });
    }
    
    // Erstelle Bewerbung
    await connection.execute(
      'INSERT INTO shift_applications (shift_id, staff_id) VALUES (?, ?)',
      [shiftId, staffId]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'shift_application_submitted', 'shift', ?, ?)`,
      [
        userId,
        shiftId,
        JSON.stringify({
          shiftName: shift.name,
          eventName: shift.event_name,
          fullyQualified: qualCheck.hasAll
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Bewerbung für Schicht erfolgreich eingereicht',
      qualificationStatus: {
        fullyQualified: qualCheck.hasAll,
        message: qualCheck.hasAll 
          ? 'Sie erfüllen alle Qualifikationsanforderungen' 
          : `Sie erfüllen ${qualCheck.has} von ${qualCheck.required} Qualifikationen`
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Bewerben für Schicht:', error);
    res.status(500).json({ 
      message: 'Fehler beim Einreichen der Bewerbung' 
    });
  } finally {
    connection.release();
  }
};

// Verfügbare Schichten für Bewerbung (Staff) - AKTUALISIERT
// Verfügbare Schichten für Bewerbung (Staff) - AKTUALISIERT
const getAvailableShifts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { showAll = 'false' } = req.query;
    
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
    
    // Vereinfachte Query ohne shift_qualifications
    const query = `
      SELECT 
        s.*,
        e.name as event_name,
        e.location,
        e.start_date as event_date,
        p.name as position_name,
        COUNT(DISTINCT sa.staff_id) as current_staff,
        DATE_FORMAT(s.start_time, '%Y-%m-%d') as shift_date,
        DATE_FORMAT(s.start_time, '%H:%i') as start_time_only,
        DATE_FORMAT(s.end_time, '%H:%i') as end_time_only,
        CASE 
          WHEN sapp.id IS NOT NULL THEN 'applied'
          WHEN sass.id IS NOT NULL THEN 'assigned'
          ELSE 'available'
        END as my_status,
        '' as required_qualifications,
        0 as matching_qualifications,
        0 as required_qualification_count
      FROM shifts s
      JOIN events e ON s.event_id = e.id
      JOIN event_invitations ei ON e.id = ei.event_id
      LEFT JOIN positions p ON s.position_id = p.id
      LEFT JOIN shift_assignments sa ON s.id = sa.shift_id AND sa.status != 'cancelled'
      LEFT JOIN shift_applications sapp ON s.id = sapp.shift_id AND sapp.staff_id = ?
      LEFT JOIN shift_assignments sass ON s.id = sass.shift_id AND sass.staff_id = ?
      WHERE ei.staff_id = ?
        AND ei.status = 'accepted'
        AND e.status = 'published'
        AND s.start_time > NOW()
      GROUP BY s.id 
      ORDER BY s.start_time
    `;
    
    const params = [staffId, staffId, staffId];
    const [shifts] = await db.execute(query, params);
    
    // Füge zusätzliche Informationen hinzu
    const shiftsWithDetails = await Promise.all(shifts.map(async (shift) => {
      // Prüfe Zeitkonflikte
      const conflicts = await checkTimeConflicts(db, staffId, shift.id);
      
      return {
        ...shift,
        fully_qualified: true, // Temporär immer true
        partially_qualified: false,
        has_conflicts: conflicts.length > 0,
        conflicts,
        can_apply: shift.my_status === 'available' && conflicts.length === 0
      };
    }));
    
    // Gruppiere nach Datum
    const shiftsByDate = {};
    shiftsWithDetails.forEach(shift => {
      const date = shift.shift_date;
      if (!shiftsByDate[date]) {
        shiftsByDate[date] = [];
      }
      shiftsByDate[date].push(shift);
    });
    
    res.json({ 
      shifts: shiftsWithDetails,
      shiftsByDate,
      stats: {
        total: shiftsWithDetails.length,
        available: shiftsWithDetails.filter(s => s.can_apply).length,
        applied: shiftsWithDetails.filter(s => s.my_status === 'applied').length,
        assigned: shiftsWithDetails.filter(s => s.my_status === 'assigned').length,
        qualified: shiftsWithDetails.length, // Temporär alle
        with_conflicts: shiftsWithDetails.filter(s => s.has_conflicts).length
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen verfügbarer Schichten:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Schichten' 
    });
  }
}; 



// Andere bestehende Funktionen bleiben unverändert...
const bulkAssignStaff = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId } = req.params;
    const { assignments } = req.body;
    const adminId = req.user.id;
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ 
        message: 'Keine Zuweisungen angegeben' 
      });
    }
    
    // Prüfe ob Schicht existiert
    const [shifts] = await connection.execute(
      `SELECT s.*, e.name as event_name, e.id as event_id
       FROM shifts s 
       JOIN events e ON s.event_id = e.id 
       WHERE s.id = ?`,
      [shiftId]
    );
    
    if (shifts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Schicht nicht gefunden' 
      });
    }
    
    const shift = shifts[0];
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const assignment of assignments) {
      try {
        // Prüfe Qualifikationen
        const qualCheck = await checkStaffQualifications(connection, assignment.staff_id, shiftId);
        if (!qualCheck.qualified) {
          errors.push(`Mitarbeiter ${assignment.staff_id} nicht qualifiziert`);
          errorCount++;
          continue;
        }
        
        // Prüfe Zeitkonflikte
        const conflicts = await checkTimeConflicts(connection, assignment.staff_id, shiftId);
        if (conflicts.length > 0) {
          errors.push(`Mitarbeiter ${assignment.staff_id} hat Zeitkonflikte`);
          errorCount++;
          continue;
        }
        
        // Prüfe Bewerbung
        const [application] = await connection.execute(
          'SELECT id FROM shift_applications WHERE shift_id = ? AND staff_id = ?',
          [shiftId, assignment.staff_id]
        );
        
        if (application.length === 0) {
          errors.push(`Mitarbeiter ${assignment.staff_id} hat sich nicht beworben`);
          errorCount++;
          continue;
        }
        
        // Prüfe ob bereits zugewiesen
        const [existing] = await connection.execute(
          'SELECT id FROM shift_assignments WHERE shift_id = ? AND staff_id = ?',
          [shiftId, assignment.staff_id]
        );
        
        if (existing.length > 0) {
          // Update
          await connection.execute(
            `UPDATE shift_assignments 
             SET position_id = ?, assigned_by = ?, assigned_at = NOW()
             WHERE id = ?`,
            [assignment.position_id || null, adminId, existing[0].id]
          );
        } else {
          // Insert
          await connection.execute(
            `INSERT INTO shift_assignments 
             (shift_id, staff_id, status, assigned_by, position_id)
             VALUES (?, ?, 'preliminary', ?, ?)`,
            [shiftId, assignment.staff_id, adminId, assignment.position_id || null]
          );
        }
        
        // Update Bewerbungsstatus
        await connection.execute(
          'UPDATE shift_applications SET status = "approved" WHERE shift_id = ? AND staff_id = ?',
          [shiftId, assignment.staff_id]
        );
        
        successCount++;
      } catch (err) {
        errors.push(`Fehler bei Mitarbeiter ${assignment.staff_id}: ${err.message}`);
        errorCount++;
      }
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'bulk_shift_assignment', 'shift', ?, ?)`,
      [
        adminId,
        shiftId,
        JSON.stringify({
          shiftName: shift.name,
          eventName: shift.event_name,
          successCount,
          errorCount
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: `${successCount} Mitarbeiter erfolgreich eingeteilt`,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Bulk-Assignment:', error);
    res.status(500).json({ 
      message: 'Fehler beim Einteilen der Mitarbeiter' 
    });
  } finally {
    connection.release();
  }
}

// Alle anderen bestehenden Funktionen bleiben wie sie sind...
const removeShiftAssignment = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId, staffId } = req.params;
    const adminId = req.user.id;
    
    // Hole Assignment Details für Log
    const [assignments] = await connection.execute(
      `SELECT sa.*, s.name as shift_name, sp.first_name, sp.last_name
       FROM shift_assignments sa
       JOIN shifts s ON sa.shift_id = s.id
       JOIN staff_profiles sp ON sa.staff_id = sp.id
       WHERE sa.shift_id = ? AND sa.staff_id = ?`,
      [shiftId, staffId]
    );
    
    if (assignments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Zuweisung nicht gefunden' 
      });
    }
    
    const assignment = assignments[0];
    
    // Lösche Zuweisung
    await connection.execute(
      'DELETE FROM shift_assignments WHERE shift_id = ? AND staff_id = ?',
      [shiftId, staffId]
    );
    
    // Setze Bewerbung zurück auf pending
    await connection.execute(
      'UPDATE shift_applications SET status = "pending" WHERE shift_id = ? AND staff_id = ?',
      [shiftId, staffId]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'shift_assignment_removed', 'shift', ?, ?)`,
      [
        adminId,
        shiftId,
        JSON.stringify({
          shiftName: assignment.shift_name,
          staffName: `${assignment.first_name} ${assignment.last_name}`
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Zuweisung erfolgreich entfernt'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Entfernen der Zuweisung:', error);
    res.status(500).json({ 
      message: 'Fehler beim Entfernen der Zuweisung' 
    });
  } finally {
    connection.release();
  }
};

const updateShiftAssignmentStatus = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId } = req.params;
    const { status } = req.body;
    const adminId = req.user.id;
    
    if (!['preliminary', 'final'].includes(status)) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Ungültiger Status. Erlaubt sind: preliminary, final' 
      });
    }
    
    // Prüfe ob Schicht existiert
    const [shifts] = await connection.execute(
      `SELECT s.*, e.name as event_name
       FROM shifts s 
       JOIN events e ON s.event_id = e.id 
       WHERE s.id = ?`,
      [shiftId]
    );
    
    if (shifts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Schicht nicht gefunden' 
      });
    }
    
    const shift = shifts[0];
    
    // Update alle Zuweisungen dieser Schicht (außer bereits bestätigte)
    const [result] = await connection.execute(
      `UPDATE shift_assignments 
       SET status = ?
       WHERE shift_id = ? AND status != 'confirmed'`,
      [status, shiftId]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'shift_status_changed', 'shift', ?, ?)`,
      [
        adminId,
        shiftId,
        JSON.stringify({
          shiftName: shift.name,
          eventName: shift.event_name,
          newStatus: status,
          affectedAssignments: result.affectedRows,
          changedAssignments: result.changedRows
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: `Schichtstatus erfolgreich auf '${status === 'final' ? 'Endgültig' : 'Vorläufig'}' geändert`,
      affectedAssignments: result.affectedRows,
      changedAssignments: result.changedRows,
      newStatus: status
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Ändern des Schichtstatus:', error);
    res.status(500).json({ 
      message: 'Fehler beim Ändern des Status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

const confirmShiftAssignment = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId } = req.params;
    const userId = req.user.id;
    
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
    
    // Prüfe ob Zuweisung existiert und final ist
    const [assignments] = await connection.execute(
      `SELECT sa.*, s.name as shift_name, e.name as event_name
       FROM shift_assignments sa
       JOIN shifts s ON sa.shift_id = s.id
       JOIN events e ON s.event_id = e.id
       WHERE sa.shift_id = ? AND sa.staff_id = ? AND sa.status = 'final'`,
      [shiftId, staffId]
    );
    
    if (assignments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Keine finale Schichteinteilung gefunden' 
      });
    }
    
    const assignment = assignments[0];
    
    // Update Status auf bestätigt
    await connection.execute(
      'UPDATE shift_assignments SET status = "confirmed", confirmed_at = NOW() WHERE shift_id = ? AND staff_id = ?',
      [shiftId, staffId]
    );
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'shift_assignment_confirmed', 'shift_assignment', ?, ?)`,
      [
        userId,
        assignment.id,
        JSON.stringify({
          shiftName: assignment.shift_name,
          eventName: assignment.event_name
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Schichteinteilung erfolgreich bestätigt'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Bestätigen der Schichteinteilung:', error);
    res.status(500).json({ 
      message: 'Fehler beim Bestätigen der Einteilung' 
    });
  } finally {
    connection.release();
  }
};

const getMyShifts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, from, to } = req.query;
    
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
        sa.*,
        s.id as shift_id,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        s.description as shift_description,
        DATE_FORMAT(s.start_time, '%Y-%m-%d') as shift_date,
        DATE_FORMAT(s.start_time, '%H:%i') as start_time_only,
        DATE_FORMAT(s.end_time, '%H:%i') as end_time_only,
        e.id as event_id,
        e.name as event_name,
        e.location,
        e.description as event_description,
        p.name as position_name
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN events e ON s.event_id = e.id
      LEFT JOIN positions p ON sa.position_id = p.id
      WHERE sa.staff_id = ?
        AND e.status != 'cancelled'
    `;
    
    const params = [staffId];
    
    // Status Filter
    if (status) {
      query += ' AND sa.status = ?';
      params.push(status);
    }
    
    // Datumsbereich
    if (from) {
      query += ' AND s.start_time >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND s.end_time <= ?';
      params.push(to);
    }
    
    query += ' ORDER BY s.start_time';
    
    const [shifts] = await db.execute(query, params);
    
    // Gruppiere nach Status und Datum
    const grouped = {
      preliminary: shifts.filter(s => s.status === 'preliminary'),
      final: shifts.filter(s => s.status === 'final'),
      confirmed: shifts.filter(s => s.status === 'confirmed')
    };
    
    const shiftsByDate = {};
    shifts.forEach(shift => {
      const date = shift.shift_date;
      if (!shiftsByDate[date]) {
        shiftsByDate[date] = [];
      }
      shiftsByDate[date].push(shift);
    });
    
    res.json({
      shifts,
      grouped,
      shiftsByDate,
      stats: {
        total: shifts.length,
        preliminary: grouped.preliminary.length,
        final: grouped.final.length,
        confirmed: grouped.confirmed.length
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der eigenen Schichten:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Schichten' 
    });
  }
};

const withdrawShiftApplication = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId } = req.params;
    const userId = req.user.id;
    
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
    
    // Lösche Bewerbung
    const [result] = await connection.execute(
      'DELETE FROM shift_applications WHERE shift_id = ? AND staff_id = ? AND status = "pending"',
      [shiftId, staffId]
    );
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Bewerbung nicht gefunden oder bereits bearbeitet' 
      });
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'shift_application_withdrawn', 'shift', ?, ?)`,
      [userId, shiftId, JSON.stringify({ shiftId })]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Bewerbung erfolgreich zurückgezogen'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Zurückziehen der Bewerbung:', error);
    res.status(500).json({ 
      message: 'Fehler beim Zurückziehen der Bewerbung' 
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  // Admin
  getShiftApplications,
  assignStaffToShift,
  bulkAssignStaff,
  removeShiftAssignment,
  updateShiftAssignmentStatus,
  getEventShiftPlan,
  
  // Staff
  applyForShift,
  withdrawShiftApplication,
  confirmShiftAssignment,
  getMyShifts,
  getAvailableShifts
};



