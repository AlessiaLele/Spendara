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

function getTrendLabels(period) {
    switch (period) {
        case 'daily':
            return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

        case 'weekly':
            return ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

        case 'yearly':
            return ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

        case 'monthly':
        default: {
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            return Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
        }
    }
}

function getTrendLabel(date, period) {
    const d = new Date(date);

    switch (period) {
        case 'daily':
            return `${String(d.getHours()).padStart(2, '0')}:00`;

        case 'weekly': {
            const labels = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
            return labels[d.getDay()];
        }

        case 'yearly': {
            const labels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
            return labels[d.getMonth()];
        }

        case 'monthly':
        default:
            return String(d.getDate()).padStart(2, '0');
    }
}

function buildTrendData(transactions, period) {
    const labels = getTrendLabels(period);

    const map = new Map(
        labels.map((label) => [
            label,
            { label, income: 0, expenses: 0, net: 0 }
        ])
    );

    for (const tx of transactions) {
        const label = getTrendLabel(tx.date, period);
        const point = map.get(label);

        if (!point) continue;

        const amount = Number(tx.amount || 0);

        if (amount >= 0) {
            point.income += amount;
        } else {
            point.expenses += Math.abs(amount);
        }

        point.net = point.income - point.expenses;
    }

    return labels.map((label) => map.get(label));
}

function toRomeDayKey(date) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(date));
}

async function getDashboardData(req, res) {
    try {
        const userId = req.user._id;
        const period = req.query.period || 'monthly';
        const categoryFilter = req.query.category || 'all';

        const allTransactions = await Transaction.find({
            userId,
            deletedAt: null
        }).sort({ date: -1 });

        const normalizedAllTransactions = allTransactions.map((t) => {
            const tx = t.toObject();
            return {
                ...tx,
                category: normalizeCategory(tx.category)
            };
        });

        const { start, end } = getPeriodBounds(period);

        const selectedCategory =
            categoryFilter && categoryFilter !== 'all'
                ? normalizeCategory(categoryFilter)
                : 'all';

        const todayKey = toRomeDayKey(new Date());

        const periodTransactions = normalizedAllTransactions.filter((t) => {
            const inCategory =
                selectedCategory === 'all' || normalizeCategory(t.category) === selectedCategory;

            if (period === 'daily') {
                return toRomeDayKey(t.date) === todayKey && inCategory;
            }

            const d = new Date(t.date);
            const inPeriod = d >= start && d <= end;

            return inPeriod && inCategory;
        });

        const totalIncome = periodTransactions
            .filter((t) => t.amount > 0)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const totalExpenses = periodTransactions
            .filter((t) => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

        const categoryMap = {};
        periodTransactions.forEach((t) => {
            if (t.amount < 0) {
                if (!t.category) return;
                const cat = t.category;
                categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(Number(t.amount || 0));
            }
        });

        const categories = Object.entries(categoryMap).map(([name, value]) => ({
            name,
            value: Number(value.toFixed(2))
        }));

        const availableCategories = Array.from(
            new Set(
                normalizedAllTransactions
                    .map((t) => normalizeCategory(t.category))
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b, 'it'));

        const topExpenses = periodTransactions
            .filter((t) => t.amount < 0)
            .sort((a, b) => Math.abs(Number(b.amount || 0)) - Math.abs(Number(a.amount || 0)))
            .slice(0, 5);

        const trend = buildTrendData(periodTransactions, period);

        // Forecast calcolato sull'intero set utente, non sul filtro storico.
        const forecast = await buildMonthlyForecast(normalizedAllTransactions, userId);

        return res.status(200).json({
            summary: {
                totalTransactions: periodTransactions.length,
                totalIncome: Number(totalIncome.toFixed(2)),
                totalExpenses: Number(totalExpenses.toFixed(2)),
                balance: Number((totalIncome - totalExpenses).toFixed(2))
            },
            categories,
            trend,
            topExpenses,
            forecast,
            periodTransactions,
            availableCategories
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