const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

const {
    addCashTransaction,
    getAllTransactions,
    updateTransactionCategory,
    updateManualTransaction,
    deleteTransaction
} = require('../controllers/transactionController');

router.get('/', protect, getAllTransactions);
router.post('/cash', protect, addCashTransaction);
router.patch('/:id/category', protect, updateTransactionCategory);
router.put('/:id/manual', protect, updateManualTransaction);
router.delete('/:id', protect, deleteTransaction);

module.exports = router;