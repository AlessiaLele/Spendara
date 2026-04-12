const Transaction = require('../models/Transaction');

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

    if (period === 'daily') {
        for (let hour = 0; hour < 24; hour++) {
            const pointDate = new Date(startDate);
            pointDate.setHours(hour, 0, 0, 0);

            trend.push({
                key: `${hour}`,
                month: formatLabelByPeriod(pointDate, period),
                income: 0,
                expenses: 0,
                net: 0
            });
        }
    } else if (period === 'weekly') {
        for (let i = 0; i < 7; i++) {
            const pointDate = new Date(startDate);
            pointDate.setDate(startDate.getDate() + i);

            trend.push({
                key: pointDate.toISOString().slice(0, 10),
                month: formatLabelByPeriod(pointDate, period),
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

            trend.push({
                key: pointDate.toISOString().slice(0, 10),
                month: formatLabelByPeriod(pointDate, period),
                income: 0,
                expenses: 0,
                net: 0
            });
        }
    } else if (period === 'yearly') {
        for (let month = 0; month < 12; month++) {
            const pointDate = new Date(startDate.getFullYear(), month, 1);

            trend.push({
                key: `${startDate.getFullYear()}-${String(month + 1).padStart(2, '0')}`,
                month: formatLabelByPeriod(pointDate, period),
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
        return date.toISOString().slice(0, 10);
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getLastNDaysStart(days) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    return start;
}

function getMedian(values) {
    if (!values.length) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

function buildDailyExpenseSeries(transactions, startDate, endDate) {
    const dailyMap = {};
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
        dailyMap[cursor.toISOString().slice(0, 10)] = 0;
        cursor.setDate(cursor.getDate() + 1);
    }

    transactions
        .filter((transaction) => transaction.amount < 0)
        .forEach((transaction) => {
            const txDate = new Date(transaction.date);
            const key = txDate.toISOString().slice(0, 10);

            if (dailyMap[key] !== undefined) {
                dailyMap[key] += Math.abs(transaction.amount);
            }
        });

    return Object.values(dailyMap);
}

function getTrimmedAverage(values) {
    if (!values.length) {
        return 0;
    }

    const median = getMedian(values);
    const maxAccepted = median > 0 ? median * 3 : 0;

    const filtered = values.filter((value) => {
        if (median === 0) {
            return value === 0;
        }
        return value <= maxAccepted;
    });

    const usable = filtered.length ? filtered : values;
    const total = usable.reduce((sum, value) => sum + value, 0);

    return total / usable.length;
}

function getForecastConfidence(activeExpenseDays, totalDaysObserved) {
    const ratio = totalDaysObserved > 0 ? activeExpenseDays / totalDaysObserved : 0;

    if (activeExpenseDays >= 20 || ratio >= 0.65) {
        return 'alta';
    }

    if (activeExpenseDays >= 10 || ratio >= 0.35) {
        return 'media';
    }

    return 'bassa';
}

function buildMonthlyForecast(allTransactions) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const currentMonthTransactions = allTransactions.filter((transaction) => {
        const txDate = new Date(transaction.date);
        return txDate >= monthStart && txDate <= now;
    });

    const currentIncome = currentMonthTransactions
        .filter((transaction) => transaction.amount > 0)
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    const currentExpenses = currentMonthTransactions
        .filter((transaction) => transaction.amount < 0)
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    const currentBalance = Number((currentIncome - currentExpenses).toFixed(2));

    const last30DaysStart = getLastNDaysStart(30);
    const trailing30DaysTransactions = allTransactions.filter((transaction) => {
        const txDate = new Date(transaction.date);
        return txDate >= last30DaysStart && txDate <= now;
    });

    const dailyExpenses = buildDailyExpenseSeries(
        trailing30DaysTransactions,
        last30DaysStart,
        now
    );

    const averageDailyExpenses = Number(getTrimmedAverage(dailyExpenses).toFixed(2));
    const activeExpenseDays = dailyExpenses.filter((value) => value > 0).length;

    const today = now.getDate();
    const daysInMonth = monthEnd.getDate();
    const daysRemaining = Math.max(daysInMonth - today, 0);

    const projectedRemainingExpenses = Number(
        (averageDailyExpenses * daysRemaining).toFixed(2)
    );

    const predictedEndBalance = Number(
        (currentBalance - projectedRemainingExpenses).toFixed(2)
    );

    return {
        model: 'basic_monthly_v1',
        currentBalance,
        averageDailyExpenses,
        projectedRemainingExpenses,
        predictedEndBalance,
        daysRemaining,
        activeExpenseDays,
        confidence: getForecastConfidence(activeExpenseDays, dailyExpenses.length)
    };
}

async function getDashboardData(req, res) {
    try {
        const userId = req.user._id;
        const requestedPeriod = String(req.query.period || 'monthly').toLowerCase();
        const period = isValidPeriod(requestedPeriod) ? requestedPeriod : 'monthly';

        const allTransactions = await Transaction.find({ userId }).sort({ date: -1 });

        const { start, end } = getPeriodBounds(period);

        const transactions = allTransactions.filter((transaction) => {
            const txDate = new Date(transaction.date);
            return txDate >= start && txDate <= end;
        });

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
                const category = transaction.category || 'Uncategorized';
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

        const monthlyTrend = Object.values(trendMap).map((item) => ({
            month: item.month,
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
            monthlyTrend,
            topExpenses,
            recentTransactions: transactions.slice(0, 10),
            allTransactions: transactions
        });
    } catch (error) {
        console.error('Errore getDashboardData:', error.message);
        return res.status(500).json({
            message: 'Errore nel recupero dei dati dashboard'
        });
    }
}

module.exports = {
    getDashboardData
};