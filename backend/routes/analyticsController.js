const { getOverview } = require('./analyticsService');

async function getAnalyticsOverview(req, res) {
    try {
        const { period = 'month', budget = 0 } = req.query;
        const monthlyBudget = Number(budget) || 0;

        const data = await getOverview(req.user.id, period, monthlyBudget);

        res.status(200).json(data);
    } catch (error) {
        console.error('Errore analytics overview:', error);
        res.status(500).json({ message: 'Errore server durante il calcolo analytics' });
    }
}

module.exports = {
    getAnalyticsOverview
};