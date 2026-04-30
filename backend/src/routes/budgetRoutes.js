const express = require('express');
const router = express.Router();

const {
    getCurrentBudget,
    setBudget
} = require('../controllers/budgetController');

const authMiddleware = require("../middleware/authMiddleware");

router.get('/', getCurrentBudget);
router.post('/', setBudget);

module.exports = router;