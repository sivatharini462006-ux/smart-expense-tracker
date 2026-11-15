const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', budgetController.getBudgets);
router.post('/', budgetController.setBudget);
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;