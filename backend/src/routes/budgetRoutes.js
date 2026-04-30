const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const budgetController = require('../controllers/budgetController');

router.get('/', authMiddleware, budgetController.getBudgetByMonth);
router.post('/', authMiddleware, budgetController.upsertMonthlyBudget);

module.exports = router;