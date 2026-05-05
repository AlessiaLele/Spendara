const Transaction = require('../models/Transaction');
const { buildMonthlyForecast } = require('../services/forecastService');
const { normalizeCategory } = require('../utils/normalizeCategory');

function getPeriodBounds(period) {
    const now = new Date();

    switch (period) {
        case 'daily':
            return {
                start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
                end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
            };

        case 'weekly': {
            const start = new Date(now);
            const day = start.getDay() || 7;
            start.setDate(start.getDate() - day + 1);
            start.setHours(0, 0, 0, 0);

            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);

            return { start, end };
        }

        case 'yearly': {
            const year = now.getFullYear();
            return {
                start: new Date(year, 0, 1, 0, 0, 0, 0),
                end: new Date(year, 11, 31, 23, 59, 59, 999)
            };
        }

        default: {
            const year = now.getFullYear();
            const month = now.getMonth();

            return {
                start: new Date(year, month, 1, 0, 0, 0, 0),
                end: new Date(year, month + 1, 0, 23, 59, 59, 999)
            };
        }
    }
}

function buildTrendData(transactions, period) {
    const map = new Map();

    const addPoint = (label, income = 0, expenses = 0) => {
        const current = map.get(label) || { label, income: 0, expenses: 0, net: 0 };
        current.income += income;
        current.expenses += expenses;
        current.net = current.income - current.expenses;
        map.set(label, current);
    };

    for (const tx of transactions) {
        const d = new Date(tx.date);
        const amount = Number(tx.amount || 0);

        if (period === 'daily') {
            const label = `${String(d.getHours()).padStart(2, '0')}:00`;
            if (amount >= 0) addPoint(label, amount, 0);
            else addPoint(label, 0, Math.abs(amount));
        } else if (period === 'weekly') {
            const labels = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
            const label = labels[d.getDay()];
            if (amount >= 0) addPoint(label, amount, 0);
            else addPoint(label, 0, Math.abs(amount));
        } else if (period === 'yearly') {
            const labels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
            const label = labels[d.getMonth()];
            if (amount >= 0) addPoint(label, amount, 0);
            else addPoint(label, 0, Math.abs(amount));
        } else {
            const label = String(d.getDate()).padStart(2, '0');
            if (amount >= 0) addPoint(label, amount, 0);
            else addPoint(label, 0, Math.abs(amount));
        }
    }

    return Array.from(map.values());
}

async function getDashboardData(req, res) {
    try {
        const userId = req.user._id;
        const period = req.query.period || 'monthly';

        const allTransactions = await Transaction.find({
            userId,
            deletedAt: null
        }).sort({ date: -1 });

        const { start, end } = getPeriodBounds(period);

        const periodTransactions = allTransactions.filter((t) => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });

        const normalizedPeriodTransactions = periodTransactions.map((t) => {
            const tx = t.toObject();
            return {
                ...tx,
                category: normalizeCategory(tx.category)
            };
        });

        const totalIncome = normalizedPeriodTransactions
            .filter((t) => t.amount > 0)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const totalExpenses = normalizedPeriodTransactions
            .filter((t) => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

        const categoryMap = {};

        normalizedPeriodTransactions.forEach((t) => {
            if (t.amount < 0) {
                const cat = t.category || 'Altro';
                categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(Number(t.amount || 0));
            }
        });

        const categories = Object.entries(categoryMap).map(([name, value]) => ({
            name,
            value: Number(value.toFixed(2))
        }));

        const topExpenses = normalizedPeriodTransactions
            .filter((t) => t.amount < 0)
            .sort((a, b) => Math.abs(Number(b.amount || 0)) - Math.abs(Number(a.amount || 0)))
            .slice(0, 5);

        const trend = buildTrendData(normalizedPeriodTransactions, period);

        const forecast = await buildMonthlyForecast(allTransactions, userId);

        return res.status(200).json({
            summary: {
                totalTransactions: normalizedPeriodTransactions.length,
                totalIncome: Number(totalIncome.toFixed(2)),
                totalExpenses: Number(totalExpenses.toFixed(2)),
                balance: Number((totalIncome - totalExpenses).toFixed(2))
            },
            categories,
            trend,
            topExpenses,
            forecast,
            periodTransactions: normalizedPeriodTransactions
        });
    } catch (err) {
        console.error('Errore getDashboardData:', err);
        return res.status(500).json({
            message: 'Errore dashboard'
        });
    }
}

module.exports = {
    getDashboardData
};