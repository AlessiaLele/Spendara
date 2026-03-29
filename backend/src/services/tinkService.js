function getTinkConnectUrl(state) {
    const clientId = process.env.TINK_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.TINK_REDIRECT_URI);

    if (!clientId) {
        throw new Error('TINK_CLIENT_ID mancante nel file .env');
    }

    if (!process.env.TINK_REDIRECT_URI) {
        throw new Error('TINK_REDIRECT_URI mancante nel file .env');
    }

    return `https://link.tink.com/1.0/transactions/connect-accounts?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
}

async function exchangeCodeForToken(code) {
    return {
        accessToken: `mock_access_token_${code}`,
        tinkUserId: `mock_tink_user_${code}`
    };
}

async function getAccounts(accessToken) {
    return [
        {
            id: 'demo-account-1',
            name: 'Conto Principale',
            balance: 3245.87,
            currencyCode: 'EUR'
        }
    ];
}

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function randomAmount(min, max) {
    return Number((Math.random() * (max - min) + min).toFixed(2));
}

function randomDateWithinLastMonths(months = 6) {
    const now = new Date();
    const past = new Date();
    past.setMonth(now.getMonth() - months);

    const randomTimestamp =
        past.getTime() + Math.random() * (now.getTime() - past.getTime());

    return new Date(randomTimestamp).toISOString();
}

function generateMockTransactions(count = 250) {
    const expenseTemplates = [
        { description: 'Supermercato Conad', category: 'Groceries', min: -120, max: -15 },
        { description: 'Esselunga', category: 'Groceries', min: -140, max: -20 },
        { description: 'Carburante Q8', category: 'Transport', min: -90, max: -20 },
        { description: 'Eni Station', category: 'Transport', min: -100, max: -25 },
        { description: 'Bar Centrale', category: 'Food', min: -18, max: -2.5 },
        { description: 'Ristorante', category: 'Food', min: -80, max: -18 },
        { description: 'Amazon', category: 'Shopping', min: -180, max: -8 },
        { description: 'Zara', category: 'Shopping', min: -120, max: -20 },
        { description: 'Farmacia', category: 'Health', min: -45, max: -6 },
        { description: 'Affitto', category: 'Housing', min: -950, max: -500 },
        { description: 'Bollette Luce', category: 'Utilities', min: -140, max: -40 },
        { description: 'Bolletta Gas', category: 'Utilities', min: -160, max: -35 },
        { description: 'Netflix', category: 'Entertainment', min: -18, max: -7 },
        { description: 'Spotify', category: 'Entertainment', min: -12, max: -5 },
        { description: 'Palestra', category: 'Health', min: -70, max: -25 },
        { description: 'Taxi', category: 'Transport', min: -35, max: -8 },
        { description: 'Trenitalia', category: 'Transport', min: -80, max: -12 },
        { description: 'Ikea', category: 'Home', min: -250, max: -20 }
    ];

    const incomeTemplates = [
        { description: 'Stipendio', category: 'Salary', min: 1200, max: 2800 },
        { description: 'Rimborso', category: 'Refund', min: 20, max: 180 },
        { description: 'Bonifico Ricevuto', category: 'Income', min: 50, max: 600 },
        { description: 'Cashback', category: 'Income', min: 5, max: 40 }
    ];

    const transactions = [];

    for (let i = 0; i < count; i++) {
        const isIncome = Math.random() < 0.15;
        const template = isIncome
            ? randomItem(incomeTemplates)
            : randomItem(expenseTemplates);

        const amount = randomAmount(template.min, template.max);

        transactions.push({
            id: `txn-${i + 1}`,
            accountId: 'demo-account-1',
            amount,
            currencyCode: 'EUR',
            description: template.description,
            date: randomDateWithinLastMonths(8),
            category: template.category
        });
    }

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    return transactions;
}

async function getTransactions(accessToken) {
    const count = Number(process.env.MOCK_TRANSACTIONS_COUNT || 250);
    return generateMockTransactions(count);
}

module.exports = {
    getTinkConnectUrl,
    exchangeCodeForToken,
    getAccounts,
    getTransactions
};