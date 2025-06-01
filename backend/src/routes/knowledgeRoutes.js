const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Placeholder controller
const knowledgeController = {
  getCategories: (req, res) => res.json({ categories: [] }),
  getArticles: (req, res) => res.json({ articles: [] }),
  getArticle: (req, res) => res.json({ article: {} }),
  createCategory: (req, res) => res.status(201).json({ message: 'Category created' }),
  createArticle: (req, res) => res.status(201).json({ message: 'Article created' }),
  updateArticle: (req, res) => res.json({ message: 'Article updated' }),
  deleteArticle: (req, res) => res.json({ message: 'Article deleted' }),
};

router.use(authenticateToken);

// Public routes (for all authenticated users)
router.get('/categories', knowledgeController.getCategories);
router.get('/articles', knowledgeController.getArticles);
router.get('/articles/:id', knowledgeController.getArticle);

// Admin routes
router.post('/categories', requireAdmin, knowledgeController.createCategory);
router.post('/articles', requireAdmin, knowledgeController.createArticle);
router.put('/articles/:id', requireAdmin, knowledgeController.updateArticle);
router.delete('/articles/:id', requireAdmin, knowledgeController.deleteArticle);

module.exports = router;
