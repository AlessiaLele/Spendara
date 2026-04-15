const Transaction = require('../models/Transaction');
const { buildMonthlyForecast } = require('../services/forecastService');
const { normalizeCategory } = require('../utils/normalizeCategory');

function formatLocalDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function getPeriodBounds(period) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (period) {
        case 'daily': {
            return { start, end };
        }

        case 'weekly': {
            const day = start.getDay();
            const diff = day === 0 ? 6 : day - 1;

            start.setDate(start.getDate() - diff);
            start.setHours(0, 0, 0, 0);

            end.setTime(start.getTime());
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

        case 'monthly':
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

function isValidPeriod(period) {
    return ['daily', 'weekly', 'monthly', 'yearly'].includes(period);
}

function formatLabelByPeriod(date, period) {
    if (period === 'daily') {
        return new Intl.DateTimeFormat('it-IT', {
            hour: '2-digit'
        }).format(date);
    }

    if (period === 'weekly') {
        return new Intl.DateTimeFormat('it-IT', {
            weekday: 'short',
            day: '2-digit'
        }).format(date);
    }

    if (period === 'monthly') {
        return new Intl.DateTimeFormat('it-IT', {
            day: '2-digit',
            month: '2-digit'
        }).format(date);
    }

    return new Intl.DateTimeFormat('it-IT', {
        month: 'short'
    }).format(date);
}

function buildTrendSkeleton(period, startDate) {
    const trend = [];
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    if (period === 'daily') {
        const currentHour = now.getHours();

        for (let hour = 0; hour <= currentHour; hour++) {
            const pointDate = new Date(startDate);
            pointDate.setHours(hour, 0, 0, 0);

            trend.push({
                key: `${hour}`,
                label: formatLabelByPeriod(pointDate, period),
                income: 0,
                expenses: 0,
                net: 0
            });
        }
    } else if (period === 'weekly') {
        for (let i = 0; i < 7; i++) {
            const pointDate = new Date(startDate);
            pointDate.setDate(startDate.getDate() + i);

            if (pointDate > todayEnd) {
                break;
            }

            trend.push({
                key: formatLocalDateKey(pointDate),
                label: formatLabelByPeriod(pointDate, period),
                income: 0,
                expenses: 0,
                net: 0
            });
        }
    } else if (period === 'monthly') {
        const daysInMonth = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            0
        ).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const pointDate = new Date(
                startDate.getFullYear(),
                startDate.getMonth(),
                day
            );

            if (pointDate > todayEnd) {
                break;
            }

            trend.push({
                key: formatLocalDateKey(pointDate),
                label: formatLabelByPeriod(pointDate, period),
                income: 0,
                expenses: 0,
                net: 0
            });
        }
    } else if (period === 'yearly') {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        for (let month = 0; month < 12; month++) {
            const pointDate = new Date(startDate.getFullYear(), month, 1);

            if (
                startDate.getFullYear() === currentYear &&
                month > currentMonth
            ) {
                break;
            }

            trend.push({
                key: `${startDate.getFullYear()}-${String(month + 1).padStart(2, '0')}`,
                label: formatLabelByPeriod(pointDate, period),
                income: 0,
                expenses: 0,
                net: 0
            });
        }
    }

    return trend;
}

function getTrendKey(date, period) {
    if (period === 'daily') {
        return `${date.getHours()}`;
    }

    if (period === 'weekly' || period === 'monthly') {
        return formatLocalDateKey(date);
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function getDashboardData(req, res) {
    try {
        const userId = req.user._id;
        const requestedPeriod = String(req.query.period || 'monthly').toLowerCase();
        const period = isValidPeriod(requestedPeriod) ? requestedPeriod : 'monthly';

        const allTransactions = await Transaction.find({ userId }).sort({ date: -1 });

        const { start, end } = getPeriodBounds(period);

        const transactions = allTransactions
            .filter((transaction) => {
                const txDate = new Date(transaction.date);
                return txDate >= start && txDate <= end;
            })
            .map((transaction) => ({
                ...(transaction.toObject?.() ? transaction.toObject() : transaction),
                category: normalizeCategory(transaction.category)
            }));

        const totalTransactions = transactions.length;

        const totalIncome = transactions
            .filter((transaction) => transaction.amount > 0)
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        const totalExpenses = transactions
            .filter((transaction) => transaction.amount < 0)
            .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

        const balance = Number((totalIncome - totalExpenses).toFixed(2));

        const categoryMap = {};

        transactions
            .filter((transaction) => transaction.amount < 0)
            .forEach((transaction) => {
                const category = transaction.category || 'Non categorizzato';
                const value = Math.abs(transaction.amount);

                if (!categoryMap[category]) {
                    categoryMap[category] = 0;
                }

                categoryMap[category] += value;
            });

        const categories = Object.entries(categoryMap)
            .map(([name, value]) => ({
                name,
                value: Number(value.toFixed(2))
            }))
            .sort((a, b) => b.value - a.value);

        const trendSkeleton = buildTrendSkeleton(period, start);
        const trendMap = Object.fromEntries(
            trendSkeleton.map((item) => [item.key, { ...item }])
        );

        transactions.forEach((transaction) => {
            const txDate = new Date(transaction.date);
            const key = getTrendKey(txDate, period);

            if (!trendMap[key]) {
                return;
            }

            if (transaction.amount > 0) {
                trendMap[key].income += transaction.amount;
            } else {
                trendMap[key].expenses += Math.abs(transaction.amount);
            }
        });

        const trend = Object.values(trendMap).map((item) => ({
            label: item.label,
            income: Number(item.income.toFixed(2)),
            expenses: Number(item.expenses.toFixed(2)),
            net: Number((item.income - item.expenses).toFixed(2))
        }));

        const topExpenses = transactions
            .filter((transaction) => transaction.amount < 0)
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .slice(0, 5);

        const forecast = buildMonthlyForecast(allTransactions);

        return res.status(200).json({
            period,
            range: {
                start,
                end
            },
            summary: {
                totalTransactions,
                totalIncome: Number(totalIncome.toFixed(2)),
                totalExpenses: Number(totalExpenses.toFixed(2)),
                balance
            },
            forecast,
            categories,
            trend,
            topExpenses,
            recentTransactions: transactions.slice(0, 10),
            periodTransactions: transactions
        });
    } catch (error) {
        console.error('Errore getDashboardData:', error.message);
        return res.status(500).json({
            message: 'Errore nel recupero dei dati dashboard'
        });
    }
}

async function getForecastData(req, res) {
    try {
        const userId = req.user._id;
        const allTransactions = await Transaction.find({ userId }).sort({ date: -1 });
        const forecast = buildMonthlyForecast(allTransactions);

        return res.status(200).json(forecast);
    } catch (error) {
        console.error('Errore getForecastData:', error.message);
        return res.status(500).json({
            message: 'Errore nel recupero della previsione'
        });
    }
}

module.exports = {
    getDashboardData,
    getForecastData
};