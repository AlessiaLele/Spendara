const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

const {
    addCashTransaction,
    getAllTransactions,
    deleteTransaction,
    seedTransactions,
    addDailySimulatedTransactions
} = require('../controllers/transactionController');

router.get('/', protect, getAllTransactions);
router.post('/cash', protect, addCashTransaction);
router.delete('/:id', protect, deleteTransaction);
router.post('/seed', protect, seedTransactions);
router.post('/simulate-daily', protect, addDailySimulatedTransactions);

module.exports = router;