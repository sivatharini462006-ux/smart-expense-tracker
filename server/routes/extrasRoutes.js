const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const extrasController = require('../controllers/extrasController');

router.use(authMiddleware);

router.post('/categories', extrasController.createCategory);

router.get('/bills', extrasController.getBills);
router.post('/bills', extrasController.createBill);
router.post('/bills/:id/pay', extrasController.payBill);
router.delete('/bills/:id', extrasController.deleteBill);

router.get('/splits', extrasController.getSplits);
router.post('/splits', extrasController.createSplit);
router.put('/splits/:id/settle', extrasController.settleSplit);
router.delete('/splits/:id', extrasController.deleteSplit);

module.exports = router;