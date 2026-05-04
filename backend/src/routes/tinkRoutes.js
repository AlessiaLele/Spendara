const express = require('express');
const {
    startConnect,
    handleCallback,
    getBankConnectionStatus,
    getBankAccounts,
    getBankTransactions,
    syncBankTransactions,
    disconnectBankConnection
} = require('../controllers/tinkController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/connect', protect, startConnect);
router.get('/callback', handleCallback);
router.get('/status', protect, getBankConnectionStatus);
router.get('/accounts', protect, getBankAccounts);
router.get('/transactions', protect, getBankTransactions);
router.post('/sync', protect, syncBankTransactions);
router.delete('/disconnect', protect, disconnectBankConnection);

module.exports = router;