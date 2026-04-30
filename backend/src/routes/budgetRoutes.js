// routes/budgetRoutes.js
const express = require('express');
const router = express.Router();

const {
    getCurrentBudget,
    setBudget
} = require('../controllers/budgetController');

router.get('/', getCurrentBudget);
router.post('/', setBudget);

module.exports = router;