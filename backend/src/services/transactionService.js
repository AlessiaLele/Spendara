// src/services/transactionService.js

const merchantsByCategory = {
    groceries: ['Carrefour', 'Conad', 'Esselunga', 'Lidl'],
    food: ['McDonald’s', 'Burger King', 'Pizzeria Roma', 'Sushi House'],
    transport: ['Uber', 'Trenitalia', 'Eni', 'Q8'],
    shopping: ['Amazon', 'Zara', 'H&M', 'MediaWorld'],
    bills: ['Enel', 'TIM', 'Fastweb', 'Acqua Servizi'],
    entertainment: ['Netflix', 'Spotify', 'Cinema City'],
    salary: ['Stipendio Azienda']
};

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(category) {
    switch (category) {
        case 'groceries':
            return Number((-(10 + Math.random() * 70)).toFixed(2));
        case 'food':
            return Number((-(5 + Math.random() * 30)).toFixed(2));
        case 'transport':
            return Number((-(8 + Math.random() * 60)).toFixed(2));
        case 'shopping':
            return Number((-(15 + Math.random() * 150)).toFixed(2));
        case 'bills':
            return Number((-(20 + Math.random() * 120)).toFixed(2));
        case 'entertainment':
            return Number((-(8 + Math.random() * 40)).toFixed(2));
        case 'salary':
            return Number((1200 + Math.random() * 1200).toFixed(2));
        default:
            return Number((-(5 + Math.random() * 50)).toFixed(2));
    }
}

function generateTransaction(userId, date, accountId = 'demo-account') {
    const categories = ['groceries', 'food', 'transport', 'shopping', 'entertainment', 'bills'];
    const category = randomFrom(categories);

    return {
        userId,
        accountId,
        amount: randomAmount(category),
        currencyCode: 'EUR',
        description: randomFrom(merchantsByCategory[category]),
        date,
        category,
        source: 'simulated',
        externalTransactionId: ''
    };
}

function generateHistoricalTransactions(userId, days = 90, accountId = 'demo-account') {
    const transactions = [];

    for (let i = days; i >= 1; i--) {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - i);
        currentDate.setHours(0, 0, 0, 0);

        const transactionsPerDay = Math.floor(Math.random() * 3) + 1; // 1, 2, 3

        for (let j = 0; j < transactionsPerDay; j++) {
            const txDate = new Date(currentDate);
            txDate.setHours(8 + Math.floor(Math.random() * 12));
            txDate.setMinutes(Math.floor(Math.random() * 60));
            txDate.setSeconds(Math.floor(Math.random() * 60));

            transactions.push(generateTransaction(userId, txDate, accountId));
        }

        if (currentDate.getDate() === 27 || currentDate.getDate() === 28) {
            const salaryDate = new Date(currentDate);
            salaryDate.setHours(9, 0, 0, 0);

            transactions.push({
                userId,
                accountId,
                amount: 1650,
                currencyCode: 'EUR',
                description: 'Stipendio Azienda',
                date: salaryDate,
                category: 'salary',
                source: 'simulated',
                externalTransactionId: ''
            });
        }
    }

    return transactions;
}

module.exports = {
    generateTransaction,
    generateHistoricalTransactions
};