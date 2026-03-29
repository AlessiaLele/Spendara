const Transaction = require('../models/Transaction');

function getMonthBounds(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    return { start, end };
}

function formatMonthKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function getLastMonthsRange(monthsCount = 6) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);
    return start;
}

async function getDashboardData(req, res) {
    try {
        const userId = req.user._id;

        const transactions = await Transaction.find({ userId }).sort({ date: -1 });

        const totalTransactions = transactions.length;

        const totalIncome = transactions
            .filter((transaction) => transaction.amount > 0)
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        const totalExpenses = transactions
            .filter((transaction) => transaction.amount < 0)
            .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

        const balance = Number((totalIncome - totalExpenses).toFixed(2));

        const { start: currentMonthStart, end: currentMonthEnd } = getMonthBounds(new Date());

        const currentMonthTransactions = transactions.filter((transaction) => {
            const txDate = new Date(transaction.date);
            return txDate >= currentMonthStart && txDate < currentMonthEnd;
        });

        const monthlyIncome = currentMonthTransactions
            .filter((transaction) => transaction.amount > 0)
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        const monthlyExpenses = currentMonthTransactions
            .filter((transaction) => transaction.amount < 0)
            .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

        const monthlyNet = Number((monthlyIncome - monthlyExpenses).toFixed(2));

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

        const trendStartDate = getLastMonthsRange(6);

        const trendMap = {};
        for (let i = 0; i < 6; i++) {
            const monthDate = new Date(trendStartDate.getFullYear(), trendStartDate.getMonth() + i, 1);
            trendMap[formatMonthKey(monthDate)] = {
                month: formatMonthKey(monthDate),
                income: 0,
                expenses: 0,
                net: 0
            };
        }

        transactions.forEach((transaction) => {
            const txDate = new Date(transaction.date);

            if (txDate < trendStartDate) {
                return;
            }

            const monthKey = formatMonthKey(txDate);

            if (!trendMap[monthKey]) {
                return;
            }

            if (transaction.amount > 0) {
                trendMap[monthKey].income += transaction.amount;
            } else {
                trendMap[monthKey].expenses += Math.abs(transaction.amount);
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

        return res.status(200).json({
            summary: {
                totalTransactions,
                totalIncome: Number(totalIncome.toFixed(2)),
                totalExpenses: Number(totalExpenses.toFixed(2)),
                balance,
                monthlyIncome: Number(monthlyIncome.toFixed(2)),
                monthlyExpenses: Number(monthlyExpenses.toFixed(2)),
                monthlyNet
            },
            categories,
            monthlyTrend,
            topExpenses,
            recentTransactions: transactions.slice(0, 10)
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