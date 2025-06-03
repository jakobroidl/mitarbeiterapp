// backend/src/controllers/dashboardController.js
const db = require('../config/database');
const { startOfMonth, endOfMonth, startOfDay, endOfDay } = require('date-fns');

// Admin Dashboard Stats
const getAdminDashboardStats = async (req, res) => {
  try {
    const connection = await db.getConnection();
    
    try {
      // Bewerbungen Statistik
      const [applications] = await connection.execute(`
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(*) as total
        FROM applications
      `);

      // Personal Statistik
      const [staff] = await connection.execute(`
        SELECT 
          COUNT(CASE WHEN u.is_active = 1 THEN 1 END) as active,
          COUNT(*) as total
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE u.role IN ('staff', 'admin')
      `);

      // Events Statistik
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      const [events] = await connection.execute(`
        SELECT 
          COUNT(CASE WHEN DATE(start_date) = CURDATE() THEN 1 END) as today,
          COUNT(CASE WHEN start_date > NOW() AND status = 'published' THEN 1 END) as upcoming
        FROM events
        WHERE status != 'cancelled'
      `);

      // Stempeluhr Statistik
      const [timeclock] = await connection.execute(`
        SELECT 
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(DISTINCT staff_id) as today
        FROM timeclock_entries
        WHERE DATE(clock_in) = CURDATE()
      `);

      res.json({
        applications: {
          pending: applications[0].pending,
          total: applications[0].total
        },
        staff: {
          active: staff[0].active,
          total: staff[0].total
        },
        events: {
          today: events[0].today,
          upcoming: events[0].upcoming
        },
        timeclock: {
          active: timeclock[0].active,
          today: timeclock[0].today
        }
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Fehler beim Abrufen der Admin Dashboard Stats:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Dashboard-Daten' 
    });
  }
};

// Staff Dashboard Stats
const getStaffDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await db.getConnection();
    
    try {
      // Hole Staff ID
      const [staffResult] = await connection.execute(
        'SELECT id FROM staff_profiles WHERE user_id = ?',
        [userId]
      );

      if (staffResult.length === 0) {
        return res.status(404).json({ 
          message: 'Mitarbeiterprofil nicht gefunden' 
        });
      }

      const staffId = staffResult[0].id;

      // Anstehende Schichten
      const [upcomingShifts] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM shift_assignments sa
        JOIN shifts s ON sa.shift_id = s.id
        JOIN events e ON s.event_id = e.id
        WHERE sa.staff_id = ?
          AND sa.status IN ('final', 'confirmed')
          AND s.start_time > NOW()
          AND e.status = 'published'
      `, [staffId]);

      // Offene Einladungen
      const [pendingInvitations] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM event_invitations
        WHERE staff_id = ? AND status = 'pending'
      `, [staffId]);

      // Ungelesene Nachrichten
      const [unreadMessages] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM message_recipients mr
        JOIN messages m ON mr.message_id = m.id
        WHERE mr.recipient_id = ? 
          AND mr.is_read = 0 
          AND mr.is_deleted = 0
      `, [userId]);

      // Arbeitsstunden diesen Monat
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const [monthlyHours] = await connection.execute(`
        SELECT 
          COALESCE(SUM(total_minutes), 0) / 60 as hours
        FROM timeclock_entries
        WHERE staff_id = ?
          AND status = 'completed'
          AND clock_in >= ?
          AND clock_in <= ?
      `, [staffId, monthStart, monthEnd]);

      // Letzter Clock-In
      const [lastClockIn] = await connection.execute(`
        SELECT clock_in
        FROM timeclock_entries
        WHERE staff_id = ?
          AND status = 'completed'
        ORDER BY clock_in DESC
        LIMIT 1
      `, [staffId]);

      res.json({
        upcomingShifts: upcomingShifts[0].count,
        pendingInvitations: pendingInvitations[0].count,
        unreadMessages: unreadMessages[0].count,
        hoursThisMonth: Math.round(monthlyHours[0].hours),
        lastClockIn: lastClockIn[0]?.clock_in || null
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Fehler beim Abrufen der Staff Dashboard Stats:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Dashboard-Daten' 
    });
  }
};

// Aktuelle Stempeluhr-Einträge (für Admin)
const getActiveTimeclockEntries = async (req, res) => {
  try {
    const [entries] = await db.execute(`
      SELECT 
        te.id,
        te.clock_in,
        te.position_id,
        p.name as position_name,
        sp.id as staff_id,
        CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
        sp.personal_code,
        sp.profile_image,
        e.name as event_name
      FROM timeclock_entries te
      JOIN staff_profiles sp ON te.staff_id = sp.id
      JOIN positions p ON te.position_id = p.id
      LEFT JOIN events e ON te.event_id = e.id
      WHERE te.status = 'active'
      ORDER BY te.clock_in DESC
    `);

    res.json({ entries });

  } catch (error) {
    console.error('Fehler beim Abrufen aktiver Stempeluhr-Einträge:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Stempeluhr-Daten' 
    });
  }
};

// Letzte Aktivitäten (für Admin)
const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const [activities] = await db.execute(`
      SELECT 
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.created_at,
        al.details,
        u.email as user_email,
        COALESCE(sp.first_name, 'System') as user_first_name,
        COALESCE(sp.last_name, '') as user_last_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [limit]);

    // Formatiere Aktivitäten für bessere Lesbarkeit
    const formattedActivities = activities.map(activity => {
      let description = '';
      const details = activity.details ? JSON.parse(activity.details) : {};
      const userName = activity.user_first_name !== 'System' 
        ? `${activity.user_first_name} ${activity.user_last_name}`.trim()
        : 'System';

      switch (activity.action) {
        case 'application_submitted':
          description = `Neue Bewerbung von ${details.name || 'Unbekannt'}`;
          break;
        case 'application_accepted':
          description = `${userName} hat Bewerbung von ${details.applicant} angenommen`;
          break;
        case 'application_rejected':
          description = `${userName} hat Bewerbung von ${details.applicant} abgelehnt`;
          break;
        case 'event_created':
          description = `${userName} hat Event "${details.eventName}" erstellt`;
          break;
        case 'shift_assigned':
          description = `${userName} hat ${details.staffName} zu Schicht eingeteilt`;
          break;
        case 'clock_in':
          description = `${details.staffName} hat sich eingestempelt`;
          break;
        case 'clock_out':
          description = `${details.staffName} hat sich ausgestempelt`;
          break;
        case 'message_sent':
          description = `${userName} hat Nachricht "${details.subject}" gesendet`;
          break;
        case 'login_success':
          description = `${userName} hat sich angemeldet`;
          break;
        case 'password_changed':
          description = `${userName} hat Passwort geändert`;
          break;
        default:
          description = `${userName} - ${activity.action}`;
      }

      return {
        id: activity.id,
        action: activity.action,
        description,
        created_at: activity.created_at,
        details: activity.details
      };
    });

    res.json({ activities: formattedActivities });

  } catch (error) {
    console.error('Fehler beim Abrufen der Aktivitäten:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Aktivitäten' 
    });
  }
};

// Anstehende Schichten für Staff
const getUpcomingShifts = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
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

    const [shifts] = await db.execute(`
      SELECT 
        s.id,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        e.id as event_id,
        e.name as event_name,
        e.location,
        sa.status as assignment_status,
        sa.confirmed_at,
        p.name as position_name
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN events e ON s.event_id = e.id
      LEFT JOIN positions p ON sa.position_id = p.id
      WHERE sa.staff_id = ?
        AND sa.status IN ('final', 'confirmed')
        AND s.start_time > NOW()
        AND e.status = 'published'
      ORDER BY s.start_time ASC
      LIMIT ?
    `, [staffId, limit]);

    res.json({ shifts });

  } catch (error) {
    console.error('Fehler beim Abrufen der Schichten:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Schichten' 
    });
  }
};

// Offene Einladungen für Staff
const getPendingInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
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

    const [invitations] = await db.execute(`
      SELECT 
        ei.id,
        ei.invited_at,
        e.id as event_id,
        e.name as event_name,
        e.location,
        e.start_date as event_date,
        e.description
      FROM event_invitations ei
      JOIN events e ON ei.event_id = e.id
      WHERE ei.staff_id = ?
        AND ei.status = 'pending'
        AND e.status = 'published'
        AND e.start_date > NOW()
      ORDER BY e.start_date ASC
      LIMIT ?
    `, [staffId, limit]);

    res.json({ invitations });

  } catch (error) {
    console.error('Fehler beim Abrufen der Einladungen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Einladungen' 
    });
  }
};

// Ungelesene Nachrichten für Staff
const getUnreadMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const [messages] = await db.execute(`
      SELECT 
        m.id,
        m.subject,
        m.priority,
        m.created_at,
        u.email as sender_email,
        COALESCE(sp.first_name, 'System') as sender_first_name,
        COALESCE(sp.last_name, '') as sender_last_name,
        CONCAT(COALESCE(sp.first_name, 'System'), ' ', COALESCE(sp.last_name, '')) as sender_name
      FROM message_recipients mr
      JOIN messages m ON mr.message_id = m.id
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE mr.recipient_id = ?
        AND mr.is_read = 0
        AND mr.is_deleted = 0
      ORDER BY m.created_at DESC
      LIMIT ?
    `, [userId, limit]);

    res.json({ messages });

  } catch (error) {
    console.error('Fehler beim Abrufen der Nachrichten:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Nachrichten' 
    });
  }
};

// Aktuelle Stempeluhr für Staff
const getCurrentTimeclockEntry = async (req, res) => {
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

    const [entries] = await db.execute(`
      SELECT 
        te.id,
        te.clock_in,
        te.position_id,
        p.name as position_name,
        e.name as event_name
      FROM timeclock_entries te
      JOIN positions p ON te.position_id = p.id
      LEFT JOIN events e ON te.event_id = e.id
      WHERE te.staff_id = ?
        AND te.status = 'active'
      ORDER BY te.clock_in DESC
      LIMIT 1
    `, [staffId]);

    res.json({ 
      entry: entries[0] || null 
    });

  } catch (error) {
    console.error('Fehler beim Abrufen des aktuellen Stempeluhr-Eintrags:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Stempeluhr-Daten' 
    });
  }
};

module.exports = {
  // Admin
  getAdminDashboardStats,
  getActiveTimeclockEntries,
  getRecentActivities,
  
  // Staff
  getStaffDashboardStats,
  getUpcomingShifts,
  getPendingInvitations,
  getUnreadMessages,
  getCurrentTimeclockEntry
};
