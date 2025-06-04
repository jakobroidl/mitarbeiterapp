// backend/src/controllers/shiftController.js
const db = require('../config/database');
const { validationResult } = require('express-validator');
const { sendShiftAssignmentEmail } = require('../services/emailService');

// Schichtbewerber abrufen (für Admin)
const getShiftApplications = async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    // Prüfe ob Schicht existiert
    const [shifts] = await db.execute(
      `SELECT s.*, e.name as event_name 
       FROM shifts s 
       JOIN events e ON s.event_id = e.id 
       WHERE s.id = ?`,
      [shiftId]
    );
    
    if (shifts.length === 0) {
      return res.status(404).json({ 
        message: 'Schicht nicht gefunden' 
      });
    }
    
    const shift = shifts[0];
    
    // Hole alle Bewerbungen für diese Schicht
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
        GROUP_CONCAT(q.name SEPARATOR ', ') as qualifications
      FROM shift_applications sa
      JOIN staff_profiles sp ON sa.staff_id = sp.id
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN staff_qualifications sq ON sp.id = sq.staff_id
      LEFT JOIN qualifications q ON sq.qualification_id = q.id
      WHERE sa.shift_id = ?
      GROUP BY sa.id
      ORDER BY sa.applied_at
    `, [shiftId]);
    
    res.json({
      shift,
      applications
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Schichtbewerbungen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Bewerbungen' 
    });
  }
};

// Mitarbeiter zu Schicht einteilen (Admin)
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
    
    // Prüfe ob Mitarbeiter zu Event eingeladen ist
    const [invitations] = await connection.execute(
      `SELECT * FROM event_invitations 
       WHERE event_id = ? AND staff_id = ? AND status = 'accepted'`,
      [shift.event_id, staff_id]
    );
    
    if (invitations.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Mitarbeiter muss erst die Event-Einladung annehmen' 
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
          status
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Mitarbeiter erfolgreich eingeteilt',
      assignmentId
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

// Mehrere Mitarbeiter gleichzeitig einteilen
const bulkAssignStaff = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId } = req.params;
    const { assignments } = req.body; // Array von {staff_id, position_id}
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
        // Prüfe Event-Einladung
        const [invitations] = await connection.execute(
          `SELECT * FROM event_invitations 
           WHERE event_id = ? AND staff_id = ? AND status = 'accepted'`,
          [shift.event_id, assignment.staff_id]
        );
        
        if (invitations.length === 0) {
          errors.push(`Mitarbeiter ${assignment.staff_id} hat Einladung nicht angenommen`);
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
};

// Schichteinteilung entfernen
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

// Schichtstatus ändern (vorläufig -> endgültig)

const updateShiftAssignmentStatus = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { shiftId } = req.params;
    const { status } = req.body;
    const adminId = req.user.id;
    
    console.log('=== UPDATE SHIFT STATUS ===');
    console.log('Shift ID:', shiftId);
    console.log('New Status:', status);
    console.log('Admin ID:', adminId);
    
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
    console.log('Found shift:', shift.name);
    
    // Hole aktuelle Assignments vor dem Update
    const [currentAssignments] = await connection.execute(
      'SELECT id, staff_id, status FROM shift_assignments WHERE shift_id = ?',
      [shiftId]
    );
    console.log('Current assignments:', currentAssignments.length);
    console.log('Current statuses:', currentAssignments.map(a => a.status));
    
    // Update alle Zuweisungen dieser Schicht (außer bereits bestätigte)
    const [result] = await connection.execute(
      `UPDATE shift_assignments 
       SET status = ?
       WHERE shift_id = ? AND status != 'confirmed'`,
      [status, shiftId]
    );
    
    console.log('Update result:', {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows
    });
    
    // Hole aktualisierte Assignments
    const [updatedAssignments] = await connection.execute(
      'SELECT id, staff_id, status FROM shift_assignments WHERE shift_id = ?',
      [shiftId]
    );
    console.log('Updated statuses:', updatedAssignments.map(a => a.status));
    
   /* // Hole betroffene Mitarbeiter für E-Mails
    if (status === 'final' && result.affectedRows > 0) {
      const [staffList] = await connection.execute(
       `SELECT sp.first_name, u.email
         FROM shift_assignments sa
         JOIN staff_profiles sp ON sa.staff_id = sp.id
         JOIN users u ON sp.user_id = u.id
         WHERE sa.shift_id = ? AND sa.status = 'final'`,
        [shiftId]
      );
    
      console.log(`Sending emails to ${staffList.length} staff members`);
      
      // Sende E-Mails asynchron
      for (const staff of staffList) {
        sendShiftAssignmentEmail(
          staff.email,
          staff.first_name,
          shift.event_name,
          'finalisiert'
        ).catch(err => console.error('E-Mail Fehler:', err));
      }
    }
    */
    //Aktivitätslog
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
    console.log('=== SHIFT STATUS UPDATE COMPLETE ===');
    
    res.json({
      message: `Schichtstatus erfolgreich auf '${status === 'final' ? 'Endgültig' : 'Vorläufig'}' geändert`,
      affectedAssignments: result.affectedRows,
      changedAssignments: result.changedRows,
      newStatus: status
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Ändern des Schichtstatus:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Fehler beim Ändern des Status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};



// Schichtplan für Event abrufen
const getEventShiftPlan = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Hole alle Schichten mit Zuweisungen
    const [shifts] = await db.execute(`
      SELECT 
        s.*,
        p.name as position_name,
        p.color as position_color
      FROM shifts s
      LEFT JOIN positions p ON s.position_id = p.id
      WHERE s.event_id = ?
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
        GROUP_CONCAT(q.name SEPARATOR ', ') as qualifications
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN staff_profiles sp ON sa.staff_id = sp.id
      LEFT JOIN positions p ON sa.position_id = p.id
      LEFT JOIN staff_qualifications sq ON sp.id = sq.staff_id
      LEFT JOIN qualifications q ON sq.qualification_id = q.id
      WHERE s.event_id = ?
      GROUP BY sa.id
    `, [eventId]);
    
    // Strukturiere Daten
    const shiftPlan = shifts.map(shift => ({
      ...shift,
      assignments: assignments.filter(a => a.shift_id === shift.id),
      coverage: {
        required: shift.required_staff,
        assigned: assignments.filter(a => a.shift_id === shift.id && a.status !== 'cancelled').length,
        confirmed: assignments.filter(a => a.shift_id === shift.id && a.status === 'confirmed').length
      }
    }));
    
    // Hole verfügbare Mitarbeiter (eingeladen und akzeptiert)
    const [availableStaff] = await db.execute(`
      SELECT 
        sp.id,
        CONCAT(sp.first_name, ' ', sp.last_name) as name,
        sp.personal_code,
        sp.profile_image,
        GROUP_CONCAT(q.name SEPARATOR ', ') as qualifications
      FROM event_invitations ei
      JOIN staff_profiles sp ON ei.staff_id = sp.id
      LEFT JOIN staff_qualifications sq ON sp.id = sq.staff_id
      LEFT JOIN qualifications q ON sq.qualification_id = q.id
      WHERE ei.event_id = ? AND ei.status = 'accepted'
      GROUP BY sp.id
      ORDER BY sp.last_name, sp.first_name
    `, [eventId]);
    
    res.json({
      shifts: shiftPlan,
      availableStaff
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen des Schichtplans:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen des Schichtplans' 
    });
  }
};

// Staff: Für Schicht bewerben
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
    
    // Prüfe ob Schicht existiert und zu akzeptiertem Event gehört
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
          eventName: shift.event_name
        })
      ]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Bewerbung für Schicht erfolgreich eingereicht'
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

// Staff: Bewerbung zurückziehen
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

// Staff: Schichteinteilung bestätigen
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

// Staff: Eigene Schichten abrufen
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
        s.name as shift_name,
        s.start_time,
        s.end_time,
        s.description as shift_description,
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
    
    // Gruppiere nach Status
    const grouped = {
      preliminary: shifts.filter(s => s.status === 'preliminary'),
      final: shifts.filter(s => s.status === 'final'),
      confirmed: shifts.filter(s => s.status === 'confirmed')
    };
    
    res.json({
      shifts,
      grouped,
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

// Verfügbare Schichten für Bewerbung (Staff)
const getAvailableShifts = async (req, res) => {
  try {
    const userId = req.user.id;
    
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
    
    // Hole Schichten von Events, zu denen der Mitarbeiter eingeladen ist
    const [shifts] = await db.execute(`
      SELECT 
        s.*,
        e.name as event_name,
        e.location,
        e.start_date as event_date,
        p.name as position_name,
        COUNT(DISTINCT sa.staff_id) as current_staff,
        CASE 
          WHEN sapp.id IS NOT NULL THEN 'applied'
          WHEN sass.id IS NOT NULL THEN 'assigned'
          ELSE 'available'
        END as my_status
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
    `, [staffId, staffId, staffId]);
    
    res.json({ shifts });
    
  } catch (error) {
    console.error('Fehler beim Abrufen verfügbarer Schichten:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Schichten' 
    });
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
