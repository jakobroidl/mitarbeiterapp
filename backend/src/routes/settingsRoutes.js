// backend/src/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const db = require('../config/database');
const { testEmailConfiguration, updateEmailTemplate, getEmailTemplates } = require('../services/emailService');

// Alle Settings Routes benötigen Admin-Rechte
router.use(authenticateToken, requireAdmin);

// Allgemeine Einstellungen abrufen
router.get('/', async (req, res) => {
  try {
    const [settings] = await db.execute(
      'SELECT setting_key, setting_value, setting_type, description FROM settings'
    );
    
    // Konvertiere zu Object für einfachere Verwendung
    const settingsObject = {};
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Type conversion
      switch (setting.setting_type) {
        case 'number':
          value = parseInt(value);
          break;
        case 'boolean':
          value = value === '1' || value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch {
            value = null;
          }
          break;
      }
      
      settingsObject[setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description
      };
    });
    
    res.json(settingsObject);
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Einstellungen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Einstellungen' 
    });
  }
});

// Einstellung aktualisieren
router.put('/:key',
  [
    param('key')
      .trim()
      .notEmpty().withMessage('Setting Key ist erforderlich'),
    body('value')
      .notEmpty().withMessage('Wert ist erforderlich')
  ],
  handleValidationErrors,
  async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { key } = req.params;
      const { value } = req.body;
      
      // Prüfe ob Einstellung existiert
      const [existing] = await connection.execute(
        'SELECT setting_type FROM settings WHERE setting_key = ?',
        [key]
      );
      
      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          message: 'Einstellung nicht gefunden' 
        });
      }
      
      // Konvertiere Wert basierend auf Typ
      let settingValue = value;
      if (typeof value === 'object') {
        settingValue = JSON.stringify(value);
      } else if (typeof value === 'boolean') {
        settingValue = value ? '1' : '0';
      } else {
        settingValue = String(value);
      }
      
      // Update
      await connection.execute(
        'UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
        [settingValue, key]
      );
      
      // Aktivitätslog
      await connection.execute(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
         VALUES (?, 'setting_updated', 'settings', ?, ?)`,
        [
          req.user.id,
          0,
          JSON.stringify({ key, oldValue: existing[0].setting_value, newValue: settingValue })
        ]
      );
      
      await connection.commit();
      
      res.json({ 
        message: 'Einstellung erfolgreich aktualisiert' 
      });
      
    } catch (error) {
      await connection.rollback();
      console.error('Fehler beim Aktualisieren der Einstellung:', error);
      res.status(500).json({ 
        message: 'Fehler beim Aktualisieren der Einstellung' 
      });
    } finally {
      connection.release();
    }
  }
);

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
