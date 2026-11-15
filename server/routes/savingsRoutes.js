const express = require('express');
const router = express.Router();
const savingsController = require('../controllers/savingsController');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', savingsController.getGoals);
router.post('/', savingsController.createGoal);
router.post('/:goal_id/contribute', savingsController.addContribution);
router.delete('/:goal_id', savingsController.deleteGoal);

module.exports = router;