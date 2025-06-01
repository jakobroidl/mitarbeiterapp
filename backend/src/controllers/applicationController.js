// Ersetze die getApplications Funktion in applicationController.js mit dieser:

const getApplications = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Build the main query
    let query = `
      SELECT 
        a.*,
        u.email as reviewer_email,
        CONCAT(sp.first_name, ' ', sp.last_name) as reviewer_name
      FROM applications a
      LEFT JOIN users u ON a.reviewed_by = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE 1=1
    `;
    
    const params = [];

    // Add filters
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Count total results (separate query to avoid SQL syntax issues)
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM applications a
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (status) {
      countQuery += ' AND a.status = ?';
      countParams.push(status);
    }
    
    if (search) {
      countQuery += ' AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ?)';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Add pagination to main query
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    // Execute main query
    const [applications] = await db.execute(query, params);

    // Add file URLs - mit Fehlerbehandlung
    applications.forEach(app => {
      try {
        app.profile_image_url = app.profile_image ? `/uploads/profiles/${app.profile_image}` : null;
      } catch (err) {
        console.error('Error setting profile image URL:', err);
        app.profile_image_url = null;
      }
    });

    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get applications error:', error);
    console.error('SQL:', error.sql);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Bewerbungen',
    });
  }
};
