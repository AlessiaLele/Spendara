const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { getAnalyticsOverview } = require('./analyticsController');

router.get('/overview', authMiddleware, getAnalyticsOverview);

module.exports = router;