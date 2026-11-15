const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/dashboard', analyticsController.getDashboardSummary);
router.get('/insights', analyticsController.getSmartInsights);

module.exports = router;