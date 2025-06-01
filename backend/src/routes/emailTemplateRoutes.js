const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Placeholder controller
const emailTemplateController = {
  getAllTemplates: (req, res) => res.json({ templates: [] }),
  getTemplate: (req, res) => res.json({ template: {} }),
  updateTemplate: (req, res) => res.json({ message: 'Template updated' }),
  testTemplate: (req, res) => res.json({ message: 'Test email sent' }),
};

router.use(authenticateToken, requireAdmin);

// Admin only routes
router.get('/', emailTemplateController.getAllTemplates);
router.get('/:id', emailTemplateController.getTemplate);
router.put('/:id', emailTemplateController.updateTemplate);
router.post('/:id/test', emailTemplateController.testTemplate);

module.exports = router;
