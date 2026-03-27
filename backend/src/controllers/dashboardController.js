const Transaction = require('../models/Transaction');

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

        const balance = totalIncome - totalExpenses;

        const categoryMap = {};

        transactions.forEach((transaction) => {
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
                value
            }))
            .sort((a, b) => b.value - a.value);

        return res.status(200).json({
            summary: {
                totalTransactions,
                totalIncome,
                totalExpenses,
                balance
            },
            categories,
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