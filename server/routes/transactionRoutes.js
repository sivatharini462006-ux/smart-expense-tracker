const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authenticateToken = require('../middleware/authMiddleware');

// All transaction routes require valid JWT
router.use(authenticateToken);

router.get('/', transactionController.getTransactions);
router.post('/', transactionController.addTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;