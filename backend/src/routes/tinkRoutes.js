const express = require('express');
const {
    startConnect,
    handleCallback,
    getBankTransactions,
    syncBankTransactions,
} = require('../controllers/tinkController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/connect', protect, startConnect);
router.get('/callback', handleCallback);
router.get('/transactions', protect, getBankTransactions);
router.post('/sync', protect, syncBankTransactions);


module.exports = router;