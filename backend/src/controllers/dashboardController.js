const Transaction = require('../models/Transaction');
const { buildMonthlyForecast } = require('../services/forecastService');
const { normalizeCategory } = require('../utils/normalizeCategory');

function getPeriodBounds(period) {
    const now = new Date();

    switch (period) {
        case 'daily':
            return {
                start: new Date(now.setHours(0, 0, 0, 0)),
                end: new Date(now.setHours(23, 59, 59, 999))
            };

        case 'weekly': {
            const start = new Date();
            const day = start.getDay() || 7;
            start.setDate(start.getDate() - day + 1);

            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            return { start, end };
        }

        case 'yearly': {
            const year = now.getFullYear();
            return {
                start: new Date(year, 0, 1),
                end: new Date(year, 11, 31)
            };
        }

        default: {
            const year = now.getFullYear();
            const month = now.getMonth();

            return {
                start: new Date(year, month, 1),
                end: new Date(year, month + 1, 0)
            };
        }
    }
}

async function getDashboardData(req, res) {
    try {
        const userId = req.user._id;
        const period = req.query.period || 'monthly';

        const all = await Transaction.find({ userId });

        const { start, end } = getPeriodBounds(period);

        const transactions = all.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });

        const normalized = transactions.map(t => ({
            ...t.toObject(),
            category: normalizeCategory(t.category)
        }));

        const totalIncome = normalized
            .filter(t => t.amount > 0)
            .reduce((s, t) => s + t.amount, 0);

        const totalExpenses = normalized
            .filter(t => t.amount < 0)
            .reduce((s, t) => s + Math.abs(t.amount), 0);

        const categoryMap = {};

        normalized.forEach(t => {
            if (t.amount < 0) {
                const cat = t.category || 'Altro';
                categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(t.amount);
            }
        });

        const categories = Object.entries(categoryMap).map(([name, value]) => ({
            name,
            value
        }));

        const forecast = await buildMonthlyForecast(all, userId);

        res.json({
            summary: {
                totalTransactions: normalized.length,
                totalIncome,
                totalExpenses,
                balance: totalIncome - totalExpenses
            },
            categories,
            trend: [], // puoi espandere dopo
            topExpenses: normalized
                .filter(t => t.amount < 0)
                .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
                .slice(0, 5),
            forecast,
            periodTransactions: normalized
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Errore dashboard' });
    }
}

module.exports = {
    getDashboardData
};