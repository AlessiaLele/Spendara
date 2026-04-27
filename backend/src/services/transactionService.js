const merchantsByCategory = {
    spesa: ['Carrefour', 'Conad', 'Esselunga', 'Lidl'],
    ristoranti: ['McDonald’s', 'Burger King', 'Pizzeria Roma', 'Sushi House'],
    trasporti: ['Uber', 'Trenitalia', 'Eni', 'Q8'],
    shopping: ['Amazon', 'Zara', 'H&M', 'MediaWorld'],
    bollette: ['Enel', 'TIM', 'Fastweb', 'Acqua Servizi'],
    intrattenimento: ['Netflix', 'Spotify', 'Cinema City'],
    stipendio: ['Stipendio Azienda']
};

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(category) {
    switch (category) {
        case 'spesa':
            return Number((-(10 + Math.random() * 70)).toFixed(2));
        case 'ristoranti':
            return Number((-(5 + Math.random() * 30)).toFixed(2));
        case 'trasporti':
            return Number((-(8 + Math.random() * 60)).toFixed(2));
        case 'shopping':
            return Number((-(15 + Math.random() * 150)).toFixed(2));
        case 'bollette':
            return Number((-(20 + Math.random() * 120)).toFixed(2));
        case 'intrattenimento':
            return Number((-(8 + Math.random() * 40)).toFixed(2));
        case 'stipendio':
            return Number((1200 + Math.random() * 1200).toFixed(2));
        default:
            return Number((-(5 + Math.random() * 50)).toFixed(2));
    }
}

function generateTransaction(userId, date, accountId = 'demo-account') {
    const categories = ['spesa', 'ristoranti', 'trasporti', 'shopping', 'intrattenimento', 'bollette'];
    const category = randomFrom(categories);

    const merchants = merchantsByCategory[category] || ['Generic Store']; // ✅ fallback

    return {
        userId,
        accountId,
        amount: randomAmount(category),
        currencyCode: 'EUR',
        description: randomFrom(merchants),
        date,
        category,
        source: 'bank',
        externalTransactionId: `bank-${userId}-${date.getTime()}-${Math.floor(Math.random() * 100000)}`
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
    }

    return transactions;
}

function generateThreeDailyTransactions(userId, date, accountId = 'demo-account') {
    const transactions = [];

    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 3; i++) {
        const txDate = new Date(baseDate);
        txDate.setHours(8 + Math.floor(Math.random() * 12));
        txDate.setMinutes(Math.floor(Math.random() * 60));
        txDate.setSeconds(Math.floor(Math.random() * 60));

        transactions.push(generateTransaction(userId, txDate, accountId));
    }

    return transactions;
}

function generateMissingDailyTransactions(userId, startDate, endDate, accountId) {
    const transactions = [];

    let current = new Date(startDate);
    current.setDate(current.getDate() + 1);

    while (current <= endDate) {

        const baseDate = new Date(current);
        baseDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < 3; i++) {
            const txDate = new Date(baseDate);
            txDate.setHours(8 + Math.floor(Math.random() * 12));
            txDate.setMinutes(Math.floor(Math.random() * 60));
            txDate.setSeconds(Math.floor(Math.random() * 60));

            const tx = generateTransaction(userId, txDate, accountId);

            transactions.push(tx);
        }

        current.setDate(current.getDate() + 1);
    }

    return transactions;
}

module.exports = {
    generateTransaction,
    generateHistoricalTransactions,
    generateThreeDailyTransactions,
    generateMissingDailyTransactions
};