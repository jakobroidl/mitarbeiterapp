const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Placeholder controller
const qualificationController = {
  getAllQualifications: async (req, res) => {
    try {
      const db = require('../config/database');
      const [qualifications] = await db.execute(
        'SELECT * FROM qualifications WHERE is_active = true ORDER BY name'
      );
      res.json(qualifications);
    } catch (error) {
      res.status(500).json({ message: 'Fehler beim Abrufen der Qualifikationen' });
    }
  },
  createQualification: (req, res) => res.status(201).json({ message: 'Qualification created' }),
  updateQualification: (req, res) => res.json({ message: 'Qualification updated' }),
  deleteQualification: (req, res) => res.json({ message: 'Qualification deleted' }),
};

router.use(authenticateToken);

// Get all qualifications
router.get('/', qualificationController.getAllQualifications);

// Admin routes
router.post('/', requireAdmin, qualificationController.createQualification);
router.put('/:id', requireAdmin, qualificationController.updateQualification);
router.delete('/:id', requireAdmin, qualificationController.deleteQualification);

module.exports = router;
