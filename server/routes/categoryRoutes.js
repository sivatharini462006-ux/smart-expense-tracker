const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authenticateToken = require('../middleware/authMiddleware');

// All category routes require valid JWT
router.use(authenticateToken);

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);

module.exports = router;