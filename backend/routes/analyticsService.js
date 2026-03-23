const Transaction = require('../models/Transaction');
const { getDateRange } = require('../utils/dateRange');

function getTotalDaysInPeriod(period, now = new Date()) {
    if (period === 'day') {
        return 1;
    }

    if (period === 'week') {
        return 7;
    }

    if (period === 'month') {
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }

    if (period === 'year') {
        const year = now.getFullYear();
        const isLeap =
            (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        return isLeap ? 366 : 365;
    }

    return 30;
}

function getElapsedDays(start, now = new Date()) {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfPeriod = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    const diff = startOfToday.getTime() - startOfPeriod.getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildCategoryTotals(transactions) {
    const totals = {};

    for (const transaction of transactions) {
        if (transaction.type !== 'expense') continue;

        const category = transaction.category || 'Altro';
        totals[category] = (totals[category] || 0) + Number(transaction.amount);
    }

    return Object.entries(totals)
        .map(([category, total]) => ({
            category,
            total: round2(total)
        }))
        .sort((a, b) => b.total - a.total);
}

function buildTrendData(transactions, period) {
    const trendMap = {};

    for (const transaction of transactions) {
        if (transaction.type !== 'expense') continue;

        const date = new Date(transaction.date);
        let label;
        let sortKey;

        if (period === 'day') {
            label = 'Oggi';
            sortKey = 1;
        } else if (period === 'week') {
            const day = date.getDay();
            const normalizedDay = day === 0 ? 7 : day;
            const weekLabels = {
                1: 'Lun',
                2: 'Mar',
                3: 'Mer',
                4: 'Gio',
                5: 'Ven',
                6: 'Sab',
                7: 'Dom'
            };

            label = weekLabels[normalizedDay];
            sortKey = normalizedDay;
        } else if (period === 'month') {
            label = `${date.getDate()}`;
            sortKey = date.getDate();
        } else if (period === 'year') {
            const month = date.getMonth() + 1;
            label = `${month}`;
            sortKey = month;
        } else {
            label = `${date.getDate()}`;
            sortKey = date.getDate();
        }

        if (!trendMap[label]) {
            trendMap[label] = {
                label,
                total: 0,
                sortKey
            };
        }

        trendMap[label].total += Number(transaction.amount);
    }

    return Object.values(trendMap)
        .map((item) => ({
            label: item.label,
            total: round2(item.total),
            sortKey: item.sortKey
        }))
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ label, total }) => ({ label, total }));
}

function buildForecast(totalExpenses, elapsedDays, totalDays) {
    const averageDailyExpense =
        elapsedDays > 0 ? totalExpenses / elapsedDays : 0;

    const projectedTotal = averageDailyExpense * totalDays;

    return {
        averageDailyExpense: round2(averageDailyExpense),
        projectedTotal: round2(projectedTotal)
    };
}

async function getOverview(userId, period = 'month', monthlyBudget = 0) {
    const now = new Date();
    const { start, end } = getDateRange(period);

    const transactions = await Transaction.find({
        user: userId,
        date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const transaction of transactions) {
        const amount = Number(transaction.amount) || 0;

        if (transaction.type === 'income') {
            totalIncome += amount;
        } else if (transaction.type === 'expense') {
            totalExpenses += amount;
        }
    }

    const balance = totalIncome - totalExpenses;
    const elapsedDays = getElapsedDays(start, now);
    const totalDays = getTotalDaysInPeriod(period, now);

    const forecast = buildForecast(totalExpenses, elapsedDays, totalDays);

    const budget = Number(monthlyBudget) || 0;
    const budgetUsedPercentage =
        budget > 0 ? round2((totalExpenses / budget) * 100) : 0;
    const budgetRemaining = budget > 0 ? round2(budget - totalExpenses) : 0;

    return {
        totals: {
            income: round2(totalIncome),
            expenses: round2(totalExpenses),
            balance: round2(balance)
        },
        forecast,
        budget: {
            monthlyBudget: round2(budget),
            usedPercentage: budgetUsedPercentage,
            remaining: round2(budgetRemaining),
            exceeded: budget > 0 ? totalExpenses > budget : false
        },
        categoryTotals: buildCategoryTotals(transactions),
        trend: buildTrendData(transactions, period),
        meta: {
            period,
            transactionCount: transactions.length,
            startDate: start,
            endDate: end,
            elapsedDays,
            totalDays
        }
    };
}

module.exports = {getOverview};