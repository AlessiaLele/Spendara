const DEFAULT_CONNECT_URL = 'https://link.tink.com/1.0/transactions/connect-accounts';

function isMockMode() {
    return String(process.env.TINK_USE_MOCK_DATA || '').toLowerCase() === 'true';
}

function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} mancante nel file .env`);
    }
    return value;
}

function getTinkConnectUrl(state) {
    const clientId = getRequiredEnv('TINK_CLIENT_ID');
    const redirectUri = encodeURIComponent(getRequiredEnv('TINK_REDIRECT_URI'));
    const connectUrl = process.env.TINK_CONNECT_URL || DEFAULT_CONNECT_URL;
    const scope = process.env.TINK_SCOPE ? `&scope=${encodeURIComponent(process.env.TINK_SCOPE)}` : '';

    return `${connectUrl}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirectUri}&state=${encodeURIComponent(state)}${scope}`;
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (!response.ok) {
            throw new Error(text?.trim() || `Errore HTTP ${response.status}`);
        }
        throw new Error('La risposta del provider non è JSON');
    }

    const data = await response.json();

    if (!response.ok) {
        const message =
            data?.message ||
            data?.error_description ||
            data?.error ||
            `Errore HTTP ${response.status}`;
        throw new Error(message);
    }

    return data;
}

function normalizeTokenResponse(data = {}) {
    const accessToken = data.access_token || data.accessToken || null;
    const refreshToken = data.refresh_token || data.refreshToken || null;
    const expiresIn = Number(data.expires_in || data.expiresIn || 0);
    const expiresAt =
        data.expires_at ||
        data.expiresAt ||
        (expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null);

    return {
        accessToken,
        refreshToken,
        expiresAt,
        tinkUserId: data.sub || data.user_id || data.userId || data.tinkUserId || null
    };
}

async function exchangeCodeForToken(code) {
    if (isMockMode()) {
        return {
            accessToken: `mock_access_token_${code}`,
            refreshToken: `mock_refresh_token_${code}`,
            tinkUserId: `mock_tink_user_${code}`,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        };
    }

    const tokenUrl = getRequiredEnv('TINK_TOKEN_URL');
    const clientId = getRequiredEnv('TINK_CLIENT_ID');
    const redirectUri = getRequiredEnv('TINK_REDIRECT_URI');
    const clientSecret = process.env.TINK_CLIENT_SECRET;
    const codeVerifier = process.env.TINK_CODE_VERIFIER;

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri
    });

    if (clientSecret) body.set('client_secret', clientSecret);
    if (codeVerifier) body.set('code_verifier', codeVerifier);

    const data = await requestJson(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    });

    return normalizeTokenResponse(data);
}

async function refreshAccessToken(refreshToken) {
    if (isMockMode()) {
        return {
            accessToken: `mock_access_token_${Date.now()}`,
            refreshToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            tinkUserId: null
        };
    }

    const tokenUrl = getRequiredEnv('TINK_TOKEN_URL');
    const clientId = getRequiredEnv('TINK_CLIENT_ID');
    const clientSecret = process.env.TINK_CLIENT_SECRET;

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
    });

    if (clientSecret) body.set('client_secret', clientSecret);

    const data = await requestJson(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    });

    return normalizeTokenResponse(data);
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

    const randomTimestamp = past.getTime() + Math.random() * (now.getTime() - past.getTime());
    return new Date(randomTimestamp).toISOString();
}

function generateMockAccounts() {
    return [
        {
            id: 'demo-account-1',
            name: 'Conto Principale',
            balance: 3245.87,
            currencyCode: 'EUR'
        },
        {
            id: 'demo-account-2',
            name: 'Carta Collegata',
            balance: 418.12,
            currencyCode: 'EUR'
        }
    ];
}

function generateMockTransactions({ count = 250, accountIds = ['demo-account-1'] } = {}) {
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
    const safeAccountIds = accountIds?.length ? accountIds : ['demo-account-1'];

    for (let i = 0; i < count; i++) {
        const isIncome = Math.random() < 0.15;
        const template = isIncome ? randomItem(incomeTemplates) : randomItem(expenseTemplates);
        const accountId = randomItem(safeAccountIds);
        const amount = randomAmount(template.min, template.max);

        transactions.push({
            id: `txn-${accountId}-${i + 1}`,
            accountId,
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

function extractCollection(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];

    const candidates = [data.transactions, data.items, data.data, data.results, data.accounts];
    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
    }

    return [];
}

function extractNextCursor(data) {
    if (!data || typeof data !== 'object') return null;

    return (
        data.nextCursor ||
        data.next_cursor ||
        data.continuationToken ||
        data.continuation_token ||
        data.cursor?.next ||
        data.pageInfo?.nextCursor ||
        data.pagination?.nextCursor ||
        null
    );
}

async function getAccounts(accessToken) {
    if (isMockMode()) {
        return generateMockAccounts();
    }

    const accountsUrl = getRequiredEnv('TINK_ACCOUNTS_URL');
    const data = await requestJson(accountsUrl, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const accounts = extractCollection(data);

    return accounts.map((account) => ({
        id: account.id || account.accountId || account.externalId,
        name: account.name || account.displayName || 'Conto',
        balance: Number(account.balance ?? account.availableBalance ?? 0),
        currencyCode: account.currencyCode || account.currency || 'EUR'
    })).filter(account => account.id);
}

async function getTransactionsPage(accessToken, options = {}) {
    const {
        accountId = null,
        from = null,
        to = null,
        cursor = null
    } = options;

    if (isMockMode()) {
        const count = Number(process.env.MOCK_TRANSACTIONS_COUNT || 250);
        const ids = accountId ? [accountId] : ['demo-account-1'];
        return {
            transactions: generateMockTransactions({ count, accountIds: ids }),
            nextCursor: null
        };
    }

    const transactionsUrl = getRequiredEnv('TINK_TRANSACTIONS_URL');
    const url = new URL(transactionsUrl);

    if (accountId) url.searchParams.set('accountId', accountId);
    if (from) url.searchParams.set('from', from);
    if (to) url.searchParams.set('to', to);
    if (cursor) url.searchParams.set('cursor', cursor);

    const data = await requestJson(url.toString(), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const transactions = extractCollection(data);
    const nextCursor = extractNextCursor(data);

    return {
        transactions: transactions.map((tx, index) => ({
            id: tx.id || tx.transactionId || tx.externalId || `${accountId || 'acc'}-${index}`,
            accountId: tx.accountId || accountId || tx.account?.id || tx.account?.accountId || null,
            amount: Number(tx.amount ?? tx.value ?? 0),
            currencyCode: tx.currencyCode || tx.currency || 'EUR',
            description: tx.description || tx.merchantName || tx.counterpartName || '',
            date: tx.date || tx.bookingDate || tx.valueDate || new Date().toISOString(),
            category: tx.category || tx.merchantCategory || 'Uncategorized',
            raw: tx
        })).filter(tx => tx.id),
        nextCursor
    };
}

async function getTransactions(accessToken, options = {}) {
    const maxPages = Math.max(1, Number(process.env.TINK_MAX_TRANSACTION_PAGES || 20));
    const seenCursors = new Set();
    const aggregated = [];
    let cursor = options.cursor || null;

    for (let page = 0; page < maxPages; page++) {
        const { transactions, nextCursor } = await getTransactionsPage(accessToken, {
            ...options,
            cursor
        });

        aggregated.push(...transactions);

        if (!nextCursor || seenCursors.has(nextCursor) || nextCursor === cursor) {
            break;
        }

        seenCursors.add(nextCursor);
        cursor = nextCursor;
    }

    return aggregated;
}

module.exports = {
    getTinkConnectUrl,
    exchangeCodeForToken,
    refreshAccessToken,
    getAccounts,
    getTransactions,
    getTransactionsPage,
    extractCollection,
    extractNextCursor
};