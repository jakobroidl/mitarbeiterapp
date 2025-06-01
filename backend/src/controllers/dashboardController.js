const db = require('../config/database');

// Get dashboard overview
const getOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = null;
    let upcomingEvents = [];
    let recentMessages = [];

    if (userRole === 'admin') {
      // Admin statistics
      const [staffCount] = await db.execute(
        'SELECT COUNT(*) as count FROM users WHERE role IN ("staff", "admin") AND is_active = true'
      );
      
      const [applicationCount] = await db.execute(
        'SELECT COUNT(*) as count FROM applications WHERE status = "pending"'
      );
      
      const [eventCount] = await db.execute(
        'SELECT COUNT(*) as count FROM events WHERE start_date > NOW() AND status = "published"'
      );
      
      const [todayStamps] = await db.execute(
        'SELECT COUNT(*) as count FROM time_stamps WHERE DATE(stamp_time) = CURDATE()'
      );

      stats = {
        activeStaff: staffCount[0].count,
        pendingApplications: applicationCount[0].count,
        upcomingEvents: eventCount[0].count,
        todayStamps: todayStamps[0].count,
      };

      // Admin upcoming events
      const [events] = await db.execute(`
        SELECT 
          e.id, e.name, e.location, e.start_date, e.end_date,
          (SELECT COUNT(*) FROM shift_registrations sr 
           JOIN shifts s ON sr.shift_id = s.id 
           WHERE s.event_id = e.id) as registrations
        FROM events e
        WHERE e.start_date > NOW() 
        ORDER BY e.start_date ASC
        LIMIT 5
      `);
      upcomingEvents = events;
    } else {
      // Staff upcoming events
      const [staffProfile] = await db.execute(
        'SELECT id FROM staff_profiles WHERE user_id = ?',
        [userId]
      );

      if (staffProfile.length > 0) {
        const staffId = staffProfile[0].id;

        const [events] = await db.execute(`
          SELECT DISTINCT
            e.id, e.name, e.location, e.start_date, e.end_date,
            ei.status as invitation_status,
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM shift_registrations sr 
                JOIN shifts s ON sr.shift_id = s.id 
                WHERE s.event_id = e.id AND sr.staff_id = ? AND sr.status = 'confirmed'
              ) THEN 'confirmed'
              WHEN EXISTS (
                SELECT 1 FROM shift_registrations sr 
                JOIN shifts s ON sr.shift_id = s.id 
                WHERE s.event_id = e.id AND sr.staff_id = ? AND sr.status = 'assigned'
              ) THEN 'assigned'
              ELSE 'pending'
            END as status
          FROM events e
          JOIN event_invitations ei ON e.id = ei.event_id
          WHERE ei.staff_id = ? 
            AND ei.status = 'accepted'
            AND e.start_date > NOW()
            AND e.status = 'published'
          ORDER BY e.start_date ASC
          LIMIT 5
        `, [staffId, staffId, staffId]);
        
        upcomingEvents = events;
      }
    }

    // Recent messages
    const [messages] = await db.execute(`
      SELECT 
        m.id, m.content, m.created_at,
        CONCAT(sp.first_name, ' ', sp.last_name) as sender_name,
        u.role as sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE m.is_announcement = true 
        OR (m.event_id IN (
          SELECT e.id FROM events e
          JOIN event_invitations ei ON e.id = ei.event_id
          JOIN staff_profiles sp2 ON ei.staff_id = sp2.id
          WHERE sp2.user_id = ?
        ))
      ORDER BY m.created_at DESC
      LIMIT 5
    `, [userId]);
    
    recentMessages = messages;

    res.json({
      stats,
      upcomingEvents,
      recentMessages,
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Dashboard-Daten',
    });
  }
};

// Get activity feed
const getActivityFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    let query = `
      SELECT 
        'application' as type,
        a.id,
        CONCAT('Neue Bewerbung von ', a.first_name, ' ', a.last_name) as title,
        a.created_at,
        NULL as related_id
      FROM applications a
      WHERE a.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    if (req.user.role !== 'admin') {
      // For staff, show only their related activities
      query = `
        SELECT * FROM (
          SELECT 
            'shift_assignment' as type,
            sr.id,
            CONCAT('Neue Schichtzuteilung für ', e.name) as title,
            sr.created_at,
            e.id as related_id
          FROM shift_registrations sr
          JOIN shifts s ON sr.shift_id = s.id
          JOIN events e ON s.event_id = e.id
          JOIN staff_profiles sp ON sr.staff_id = sp.id
          WHERE sp.user_id = ? AND sr.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
          
          UNION ALL
          
          SELECT 
            'event_invitation' as type,
            ei.id,
            CONCAT('Einladung zu ', e.name) as title,
            ei.invited_at as created_at,
            e.id as related_id
          FROM event_invitations ei
          JOIN events e ON ei.event_id = e.id
          JOIN staff_profiles sp ON ei.staff_id = sp.id
          WHERE sp.user_id = ? AND ei.invited_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        ) as activities
      `;
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const params = req.user.role === 'admin' 
      ? [parseInt(limit), parseInt(offset)]
      : [userId, userId, parseInt(limit), parseInt(offset)];

    const [activities] = await db.execute(query, params);

    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Aktivitäten',
    });
  }
};

// Get quick stats
const getQuickStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'admin') {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // This month's statistics
      const [newApplications] = await db.execute(
        'SELECT COUNT(*) as count FROM applications WHERE created_at >= ?',
        [firstDayOfMonth]
      );
      
      const [completedEvents] = await db.execute(
        'SELECT COUNT(*) as count FROM events WHERE status = "completed" AND end_date >= ?',
        [firstDayOfMonth]
      );
      
      const [totalHours] = await db.execute(`
        SELECT 
          COALESCE(SUM(
            TIMESTAMPDIFF(MINUTE, 
              (SELECT stamp_time FROM time_stamps t2 
               WHERE t2.staff_id = t1.staff_id 
                 AND t2.stamp_type = 'in' 
                 AND t2.stamp_time <= t1.stamp_time 
               ORDER BY t2.stamp_time DESC LIMIT 1),
              t1.stamp_time
            ) / 60
          ), 0) as hours
        FROM time_stamps t1
        WHERE t1.stamp_type = 'out' 
          AND t1.stamp_time >= ?
      `, [firstDayOfMonth]);

      res.json({
        newApplications: newApplications[0].count,
        completedEvents: completedEvents[0].count,
        totalHoursThisMonth: Math.round(totalHours[0].hours || 0),
        month: today.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      });
    } else {
      // Staff stats
      const [staffProfile] = await db.execute(
        'SELECT id FROM staff_profiles WHERE user_id = ?',
        [userId]
      );

      if (staffProfile.length === 0) {
        return res.json({
          upcomingShifts: 0,
          hoursThisMonth: 0,
          completedShifts: 0,
        });
      }

      const staffId = staffProfile[0].id;
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [upcomingShifts] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM shift_registrations sr
        JOIN shifts s ON sr.shift_id = s.id
        WHERE sr.staff_id = ? 
          AND s.start_time > NOW()
          AND sr.status IN ('assigned', 'confirmed')
      `, [staffId]);

      const [monthHours] = await db.execute(`
        SELECT 
          COALESCE(SUM(
            TIMESTAMPDIFF(MINUTE, 
              (SELECT stamp_time FROM time_stamps t2 
               WHERE t2.staff_id = t1.staff_id 
                 AND t2.stamp_type = 'in' 
                 AND t2.stamp_time <= t1.stamp_time 
               ORDER BY t2.stamp_time DESC LIMIT 1),
              t1.stamp_time
            ) / 60
          ), 0) as hours
        FROM time_stamps t1
        WHERE t1.stamp_type = 'out' 
          AND t1.staff_id = ?
          AND t1.stamp_time >= ?
      `, [staffId, firstDayOfMonth]);

      const [completedShifts] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM shift_registrations sr
        JOIN shifts s ON sr.shift_id = s.id
        WHERE sr.staff_id = ? 
          AND s.end_time < NOW()
          AND sr.status = 'confirmed'
          AND s.start_time >= ?
      `, [staffId, firstDayOfMonth]);

      res.json({
        upcomingShifts: upcomingShifts[0].count,
        hoursThisMonth: Math.round(monthHours[0].hours || 0),
        completedShifts: completedShifts[0].count,
        month: today.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      });
    }
  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Statistiken',
    });
  }
};

module.exports = {
  getOverview,
  getActivityFeed,
  getQuickStats,
}