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
    // Step successivo: qui metteremo la chiamata reale al token endpoint Tink
    return {
        accessToken: `mock_access_token_${code}`,
        tinkUserId: `mock_tink_user_${code}`
    };
}

async function getAccounts(accessToken) {
    return [
        {
            id: 'demo-account-1',
            name: 'Conto Demo',
            balance: 1250.45,
            currencyCode: 'EUR'
        }
    ];
}

async function getTransactions(accessToken) {
    return [
        {
            id: 'txn-1',
            accountId: 'demo-account-1',
            amount: -35.5,
            currencyCode: 'EUR',
            description: 'Supermercato',
            date: new Date().toISOString(),
            category: 'Groceries'
        },
        {
            id: 'txn-2',
            accountId: 'demo-account-1',
            amount: -18.2,
            currencyCode: 'EUR',
            description: 'Bar',
            date: new Date().toISOString(),
            category: 'Food'
        }
    ];
}

module.exports = {
    getTinkConnectUrl,
    exchangeCodeForToken,
    getAccounts,
    getTransactions
};