// backend/src/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const db = require('../config/database');
const { testEmailConfiguration, updateEmailTemplate, getEmailTemplates } = require('../services/emailService');
const emailService = require('../config/emailConfig');

// Alle Settings Routes benötigen Admin-Rechte
router.use(authenticateToken, requireAdmin);

// Allgemeine Einstellungen abrufen - KORRIGIERT
router.get('/general', async (req, res) => {
  try {
    const [settings] = await db.execute(
      `SELECT setting_key, setting_value, setting_type 
       FROM settings 
       WHERE setting_key IN ('company_name', 'admin_email', 'default_shift_duration', 
                            'break_threshold', 'break_duration')`
    );
    
    // Konvertiere zu flachem Object für Frontend
    const settingsObject = {
      company_name: '',
      admin_email: '',
      default_shift_duration: 8,
      break_threshold: 6,
      break_duration: 30
    };
    
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Type conversion
      if (setting.setting_type === 'number') {
        value = parseInt(value);
      } else if (setting.setting_type === 'boolean') {
        value = value === '1' || value === 'true';
      }
      
      settingsObject[setting.setting_key] = value;
    });
    
    res.json(settingsObject);
    
  } catch (error) {
    console.error('Fehler beim Abrufen der allgemeinen Einstellungen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Einstellungen' 
    });
  }
});

// Allgemeine Einstellungen aktualisieren - NEU
router.put('/general', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      // Prüfe ob Einstellung existiert
      const [existing] = await connection.execute(
        'SELECT id FROM settings WHERE setting_key = ?',
        [key]
      );
      
      let settingValue = String(value);
      
      if (existing.length > 0) {
        // Update
        await connection.execute(
          'UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
          [settingValue, key]
        );
      } else {
        // Insert
        const settingType = typeof value === 'number' ? 'number' : 'string';
        await connection.execute(
          'INSERT INTO settings (setting_key, setting_value, setting_type) VALUES (?, ?, ?)',
          [key, settingValue, settingType]
        );
      }
    }
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, details)
       VALUES (?, 'settings_updated', 'settings', ?)`,
      [req.user.id, JSON.stringify({ updated: Object.keys(settings) })]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Einstellungen erfolgreich aktualisiert' 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Aktualisieren der Einstellungen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren der Einstellungen' 
    });
  } finally {
    connection.release();
  }
});

// Qualifikationen verwalten
router.get('/qualifications', async (req, res) => {
  try {
    const [qualifications] = await db.execute(
      `SELECT q.*, COUNT(sq.staff_id) as staff_count
       FROM qualifications q
       LEFT JOIN staff_qualifications sq ON q.id = sq.qualification_id
       GROUP BY q.id
       ORDER BY q.name`
    );
    
    res.json({ qualifications });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Qualifikationen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Qualifikationen' 
    });
  }
});

router.post('/qualifications',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name ist erforderlich')
      .isLength({ max: 100 }).withMessage('Name darf maximal 100 Zeichen lang sein'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Beschreibung darf maximal 500 Zeichen lang sein'),
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i).withMessage('Ungültiger Hex-Farbcode')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, description, color } = req.body;
      
      const [result] = await db.execute(
        'INSERT INTO qualifications (name, description, color) VALUES (?, ?, ?)',
        [name, description || null, color || '#007AFF']
      );
      
      res.status(201).json({
        message: 'Qualifikation erfolgreich erstellt',
        id: result.insertId
      });
      
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ 
          message: 'Eine Qualifikation mit diesem Namen existiert bereits' 
        });
      }
      console.error('Fehler beim Erstellen der Qualifikation:', error);
      res.status(500).json({ 
        message: 'Fehler beim Erstellen der Qualifikation' 
      });
    }
  }
);

router.put('/qualifications/:id',
  [
    param('id').isInt().withMessage('Ungültige Qualifikations ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name darf nicht leer sein')
      .isLength({ max: 100 }).withMessage('Name darf maximal 100 Zeichen lang sein'),
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i).withMessage('Ungültiger Hex-Farbcode'),
    body('is_active')
      .optional()
      .isBoolean().withMessage('is_active muss ein Boolean sein')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updateFields = [];
      const updateParams = [];
      
      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        updateParams.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateParams.push(updates.description);
      }
      if (updates.color !== undefined) {
        updateFields.push('color = ?');
        updateParams.push(updates.color);
      }
      if (updates.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateParams.push(updates.is_active ? 1 : 0);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ 
          message: 'Keine Änderungen angegeben' 
        });
      }
      
      updateParams.push(id);
      
      const [result] = await db.execute(
        `UPDATE qualifications SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          message: 'Qualifikation nicht gefunden' 
        });
      }
      
      res.json({ 
        message: 'Qualifikation erfolgreich aktualisiert' 
      });
      
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Qualifikation:', error);
      res.status(500).json({ 
        message: 'Fehler beim Aktualisieren der Qualifikation' 
      });
    }
  }
);

// DELETE Route für Qualifikationen - NEU
router.delete('/qualifications/:id',
  [
    param('id').isInt().withMessage('Ungültige Qualifikations ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      
      // Prüfe ob Qualifikation verwendet wird
      const [usage] = await connection.execute(
        'SELECT COUNT(*) as count FROM staff_qualifications WHERE qualification_id = ?',
        [id]
      );
      
      if (usage[0].count > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          message: 'Qualifikation kann nicht gelöscht werden, da sie noch verwendet wird' 
        });
      }
      
      const [result] = await connection.execute(
        'DELETE FROM qualifications WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          message: 'Qualifikation nicht gefunden' 
        });
      }
      
      await connection.commit();
      
      res.json({ 
        message: 'Qualifikation erfolgreich gelöscht' 
      });
      
    } catch (error) {
      await connection.rollback();
      console.error('Fehler beim Löschen der Qualifikation:', error);
      res.status(500).json({ 
        message: 'Fehler beim Löschen der Qualifikation' 
      });
    } finally {
      connection.release();
    }
  }
);

// Positionen verwalten
router.get('/positions', async (req, res) => {
  try {
    const [positions] = await db.execute(
      'SELECT * FROM positions ORDER BY name'
    );
    
    res.json({ positions });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Positionen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Positionen' 
    });
  }
});

router.post('/positions',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name ist erforderlich')
      .isLength({ max: 100 }).withMessage('Name darf maximal 100 Zeichen lang sein'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Beschreibung darf maximal 500 Zeichen lang sein'),
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i).withMessage('Ungültiger Hex-Farbcode')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, description, color } = req.body;
      
      const [result] = await db.execute(
        'INSERT INTO positions (name, description, color) VALUES (?, ?, ?)',
        [name, description || null, color || '#007AFF']
      );
      
      res.status(201).json({
        message: 'Position erfolgreich erstellt',
        id: result.insertId
      });
      
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ 
          message: 'Eine Position mit diesem Namen existiert bereits' 
        });
      }
      console.error('Fehler beim Erstellen der Position:', error);
      res.status(500).json({ 
        message: 'Fehler beim Erstellen der Position' 
      });
    }
  }
);

// PUT Route für Positionen - NEU
router.put('/positions/:id',
  [
    param('id').isInt().withMessage('Ungültige Positions ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name darf nicht leer sein')
      .isLength({ max: 100 }).withMessage('Name darf maximal 100 Zeichen lang sein'),
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i).withMessage('Ungültiger Hex-Farbcode'),
    body('is_active')
      .optional()
      .isBoolean().withMessage('is_active muss ein Boolean sein')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updateFields = [];
      const updateParams = [];
      
      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        updateParams.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateParams.push(updates.description);
      }
      if (updates.color !== undefined) {
        updateFields.push('color = ?');
        updateParams.push(updates.color);
      }
      if (updates.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateParams.push(updates.is_active ? 1 : 0);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ 
          message: 'Keine Änderungen angegeben' 
        });
      }
      
      updateParams.push(id);
      
      const [result] = await db.execute(
        `UPDATE positions SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          message: 'Position nicht gefunden' 
        });
      }
      
      res.json({ 
        message: 'Position erfolgreich aktualisiert' 
      });
      
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Position:', error);
      res.status(500).json({ 
        message: 'Fehler beim Aktualisieren der Position' 
      });
    }
  }
);

// DELETE Route für Positionen - NEU
router.delete('/positions/:id',
  [
    param('id').isInt().withMessage('Ungültige Positions ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      
      // Prüfe ob Position verwendet wird
      const [usage] = await connection.execute(
        `SELECT COUNT(*) as count FROM timeclock_entries WHERE position_id = ?
         UNION ALL
         SELECT COUNT(*) as count FROM shifts WHERE position_id = ?`,
        [id, id]
      );
      
      const totalUsage = usage.reduce((sum, row) => sum + row.count, 0);
      
      if (totalUsage > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          message: 'Position kann nicht gelöscht werden, da sie noch verwendet wird' 
        });
      }
      
      const [result] = await connection.execute(
        'DELETE FROM positions WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          message: 'Position nicht gefunden' 
        });
      }
      
      await connection.commit();
      
      res.json({ 
        message: 'Position erfolgreich gelöscht' 
      });
      
    } catch (error) {
      await connection.rollback();
      console.error('Fehler beim Löschen der Position:', error);
      res.status(500).json({ 
        message: 'Fehler beim Löschen der Position' 
      });
    } finally {
      connection.release();
    }
  }
);

// E-Mail Templates
router.get('/email-templates', async (req, res) => {
  try {
    const templates = await getEmailTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('Fehler beim Abrufen der E-Mail Templates:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Templates' 
    });
  }
});

router.put('/email-templates/:name',
  [
    param('name')
      .trim()
      .notEmpty().withMessage('Template Name ist erforderlich'),
    body('subject')
      .optional()
      .trim()
      .notEmpty().withMessage('Betreff darf nicht leer sein'),
    body('bodyText')
      .optional()
      .trim()
      .notEmpty().withMessage('Text-Inhalt darf nicht leer sein'),
    body('bodyHtml')
      .optional()
      .trim()
      .notEmpty().withMessage('HTML-Inhalt darf nicht leer sein')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name } = req.params;
      const success = await updateEmailTemplate(name, req.body);
      
      if (!success) {
        return res.status(404).json({ 
          message: 'Template nicht gefunden' 
        });
      }
      
      res.json({ 
        message: 'E-Mail Template erfolgreich aktualisiert' 
      });
      
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Templates:', error);
      res.status(500).json({ 
        message: 'Fehler beim Aktualisieren des Templates' 
      });
    }
  }
);

// E-Mail Konfiguration testen
router.post('/test-email', async (req, res) => {
  try {
    const result = await testEmailConfiguration();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
    
  } catch (error) {
    console.error('Fehler beim Testen der E-Mail Konfiguration:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Testen der E-Mail Konfiguration' 
    });
  }
});

module.exports = router;


