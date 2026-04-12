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
    const safeEndDate = new Date(endDate);
    safeEndDate.setHours(23, 59, 59, 999);

    while (cursor <= safeEndDate) {
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

function getForecastConfidence({
                                   activeExpenseDays,
                                   totalDaysObserved,
                                   recurringIncomeCount,
                                   recurringExpenseCount
                               }) {
    const ratio = totalDaysObserved > 0 ? activeExpenseDays / totalDaysObserved : 0;
    const recurringScore = recurringIncomeCount + recurringExpenseCount;

    if ((activeExpenseDays >= 20 || ratio >= 0.65) && recurringScore >= 2) {
        return 'alta';
    }

    if ((activeExpenseDays >= 10 || ratio >= 0.35) && recurringScore >= 1) {
        return 'media';
    }

    return 'bassa';
}

function normalizeText(value = '') {
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\d+/g, ' ')
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getRecurringGroupKey(transaction) {
    const normalizedDescription = normalizeText(transaction.description);
    const roundedAbsAmount = Math.round(Math.abs(transaction.amount) * 100) / 100;
    const direction = transaction.amount >= 0 ? 'income' : 'expense';
    const category = transaction.category || 'Uncategorized';

    return `${direction}__${category}__${normalizedDescription}__${roundedAbsAmount}`;
}

function diffInDays(dateA, dateB) {
    const ms = Math.abs(dateA.getTime() - dateB.getTime());
    return ms / (1000 * 60 * 60 * 24);
}

function average(values) {
    if (!values.length) {
        return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function detectRecurringTransactions(allTransactions, now, monthEnd) {
    const monthlyCandidates = allTransactions.filter((transaction) => {
        const txDate = new Date(transaction.date);
        const ageInDays = diffInDays(now, txDate);

        return ageInDays <= 180 && transaction.description;
    });

    const groups = {};

    monthlyCandidates.forEach((transaction) => {
        const key = getRecurringGroupKey(transaction);

        if (!groups[key]) {
            groups[key] = [];
        }

        groups[key].push(transaction);
    });

    const recurringSeries = [];

    Object.values(groups).forEach((group) => {
        if (group.length < 3) {
            return;
        }

        const sorted = [...group].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const intervals = [];
        for (let i = 1; i < sorted.length; i++) {
            intervals.push(
                diffInDays(new Date(sorted[i].date), new Date(sorted[i - 1].date))
            );
        }

        const avgInterval = average(intervals);
        const isMonthlyLike = avgInterval >= 25 && avgInterval <= 35;

        if (!isMonthlyLike) {
            return;
        }

        const amounts = sorted.map((item) => Math.abs(item.amount));
        const avgAmount = average(amounts);
        const minAmount = Math.min(...amounts);
        const maxAmount = Math.max(...amounts);
        const spreadRatio = avgAmount > 0 ? (maxAmount - minAmount) / avgAmount : 0;

        if (spreadRatio > 0.2) {
            return;
        }

        const lastTransaction = sorted[sorted.length - 1];
        const lastDate = new Date(lastTransaction.date);
        const predictedNextDate = new Date(lastDate);
        predictedNextDate.setDate(predictedNextDate.getDate() + Math.round(avgInterval));

        const isFutureInCurrentMonth =
            predictedNextDate > now && predictedNextDate <= monthEnd;

        recurringSeries.push({
            key: getRecurringGroupKey(lastTransaction),
            description: lastTransaction.description || 'Movimento ricorrente',
            category: lastTransaction.category || 'Uncategorized',
            direction: lastTransaction.amount >= 0 ? 'income' : 'expense',
            averageAmount: Number(avgAmount.toFixed(2)),
            occurrences: sorted.length,
            averageIntervalDays: Number(avgInterval.toFixed(1)),
            predictedNextDate,
            isFutureInCurrentMonth
        });
    });

    return recurringSeries;
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

    const recurringSeries = detectRecurringTransactions(allTransactions, now, monthEnd);

    const remainingRecurringIncomeItems = recurringSeries
        .filter((item) => item.direction === 'income' && item.isFutureInCurrentMonth)
        .map((item) => ({
            description: item.description,
            category: item.category,
            amount: item.averageAmount,
            predictedDate: item.predictedNextDate
        }));

    const remainingRecurringExpenseItems = recurringSeries
        .filter((item) => item.direction === 'expense' && item.isFutureInCurrentMonth)
        .map((item) => ({
            description: item.description,
            category: item.category,
            amount: item.averageAmount,
            predictedDate: item.predictedNextDate
        }));

    const remainingRecurringIncome = Number(
        remainingRecurringIncomeItems
            .reduce((sum, item) => sum + item.amount, 0)
            .toFixed(2)
    );

    const remainingRecurringExpenses = Number(
        remainingRecurringExpenseItems
            .reduce((sum, item) => sum + item.amount, 0)
            .toFixed(2)
    );

    const recurringKeys = new Set(
        recurringSeries.map((item) => item.key)
    );

    const last30DaysStart = getLastNDaysStart(30);

    const trailingVariableTransactions = allTransactions.filter((transaction) => {
        const txDate = new Date(transaction.date);
        const recurringKey = getRecurringGroupKey(transaction);

        return (
            txDate >= last30DaysStart &&
            txDate <= now &&
            transaction.amount < 0 &&
            !recurringKeys.has(recurringKey)
        );
    });

    const dailyVariableExpenses = buildDailyExpenseSeries(
        trailingVariableTransactions,
        last30DaysStart,
        now
    );

    const averageDailyVariableExpenses = Number(
        getTrimmedAverage(dailyVariableExpenses).toFixed(2)
    );

    const activeExpenseDays = dailyVariableExpenses.filter((value) => value > 0).length;

    const today = now.getDate();
    const daysInMonth = monthEnd.getDate();
    const daysRemaining = Math.max(daysInMonth - today, 0);

    const projectedVariableExpenses = Number(
        (averageDailyVariableExpenses * daysRemaining).toFixed(2)
    );

    const predictedEndBalance = Number(
        (
            currentBalance +
            remainingRecurringIncome -
            remainingRecurringExpenses -
            projectedVariableExpenses
        ).toFixed(2)
    );

    return {
        model: 'recurring_monthly_v2',
        currentBalance,
        remainingRecurringIncome,
        remainingRecurringExpenses,
        averageDailyVariableExpenses,
        projectedVariableExpenses,
        predictedEndBalance,
        daysRemaining,
        activeExpenseDays,
        confidence: getForecastConfidence({
            activeExpenseDays,
            totalDaysObserved: dailyVariableExpenses.length,
            recurringIncomeCount: remainingRecurringIncomeItems.length,
            recurringExpenseCount: remainingRecurringExpenseItems.length
        }),
        recurringSummary: {
            detectedSeries: recurringSeries.length,
            futureIncomeItems: remainingRecurringIncomeItems.length,
            futureExpenseItems: remainingRecurringExpenseItems.length
        },
        recurringIncomeItems,
        recurringExpenseItems
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