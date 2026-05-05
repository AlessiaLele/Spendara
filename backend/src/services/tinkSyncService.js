const BankConnection = require('../models/BankConnection');
const Transaction = require('../models/Transaction');
const { normalizeCategory } = require('../utils/normalizeCategory');
const {
    getAccounts,
    getTransactions,
    refreshAccessToken
} = require('./tinkService');

function toDateOrNull(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function serializeAccount(account) {
    return {
        id: account.id,
        name: account.name || 'Conto',
        balance: Number(account.balance ?? 0),
        currencyCode: account.currencyCode || 'EUR'
    };
}

function getBankConnectionBaseQuery(userId) {
    return {
        userId,
        provider: 'tink'
    };
}

async function getValidAccessToken(bankConnection) {
    if (!bankConnection?.accessToken) return null;

    const tokenExpiresAt = toDateOrNull(bankConnection.tokenExpiresAt);
    const isExpiringSoon = tokenExpiresAt
        ? tokenExpiresAt.getTime() <= Date.now() + 60 * 1000
        : false;

    if (!bankConnection.refreshToken || !isExpiringSoon) {
        return bankConnection.accessToken;
    }

    const refreshed = await refreshAccessToken(bankConnection.refreshToken);

    bankConnection.accessToken = refreshed.accessToken || bankConnection.accessToken;
    if (refreshed.refreshToken) bankConnection.refreshToken = refreshed.refreshToken;
    if (refreshed.expiresAt) bankConnection.tokenExpiresAt = toDateOrNull(refreshed.expiresAt);
    bankConnection.status = 'connected';
    bankConnection.lastSyncError = null;

    await bankConnection.save();

    return bankConnection.accessToken;
}

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function subtractDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d;
}

function resolveSyncWindow(bankConnection, options = {}) {
    const now = new Date();

    const initialSyncDays = Math.max(
        1,
        Number(process.env.TINK_INITIAL_SYNC_DAYS || 90)
    );

    const lookbackDays = Math.max(
        1,
        Number(process.env.TINK_SYNC_LOOKBACK_DAYS || 7)
    );

    const explicitFrom = toDateOrNull(options.from);
    const explicitTo = toDateOrNull(options.to);
    const lastSyncAt = toDateOrNull(bankConnection?.lastSyncAt);

    let from = explicitFrom;

    if (!from) {
        if (options.forceFullSync || !lastSyncAt) {
            from = subtractDays(now, initialSyncDays);
        } else {
            from = subtractDays(lastSyncAt, lookbackDays);
        }
    }

    return {
        from: startOfDay(from),
        to: explicitTo || now
    };
}

function normalizeTransaction(userId, tx, accountMap) {
    const externalId = tx.id || tx.transactionId || tx.externalTransactionId;
    if (!externalId) return null;

    const account = accountMap.get(tx.accountId);

    return {
        userId,
        provider: 'tink',
        source: 'bank',
        externalTransactionId: externalId,
        accountId: tx.accountId || null,
        accountName: account?.name || null,
        amount: Number(tx.amount ?? 0),
        currencyCode: tx.currencyCode || 'EUR',
        description: String(tx.description || '').trim(),
        date: toDateOrNull(tx.date) || new Date(),
        category: normalizeCategory(tx.category || 'Uncategorized'),
        manualOverride: false
    };
}

async function importTransactions(userId, transactions, accounts = []) {
    if (!transactions?.length) return 0;

    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const operations = [];

    for (const tx of transactions) {
        const normalized = normalizeTransaction(userId, tx, accountMap);
        if (!normalized) continue;

        operations.push({
            updateOne: {
                filter: {
                    userId,
                    provider: 'tink',
                    externalTransactionId: normalized.externalTransactionId
                },
                update: {
                    $setOnInsert: normalized
                },
                upsert: true
            }
        });
    }

    if (!operations.length) return 0;

    const result = await Transaction.bulkWrite(operations, {
        ordered: false
    });

    return result.upsertedCount || 0;
}

async function syncBankConnection(userId, options = {}) {
    const bankConnection = await BankConnection.findOne(
        getBankConnectionBaseQuery(userId)
    );

    if (!bankConnection || bankConnection.status !== 'connected') {
        throw new Error('Nessun conto bancario collegato');
    }

    const accessToken = await getValidAccessToken(bankConnection);

    const accounts = await getAccounts(accessToken);

    const { from, to } = resolveSyncWindow(bankConnection, options);

    const allTransactions = [];

    for (const account of accounts) {
        const txs = await getTransactions(accessToken, {
            accountId: account.id,
            from: from.toISOString(),
            to: to.toISOString()
        });

        allTransactions.push(...txs);
    }

    const imported = await importTransactions(userId, allTransactions, accounts);

    bankConnection.linkedAccounts = accounts.map(serializeAccount);
    bankConnection.lastSyncAt = new Date();
    bankConnection.lastSyncError = null;

    await bankConnection.save();

    return {
        importedTransactions: imported,
        totalFetched: allTransactions.length,
        syncedAccounts: accounts.length,
        accounts: bankConnection.linkedAccounts,
        bankConnection
    };
}

async function syncAllConnectedBankConnections() {
    const connections = await BankConnection.find({
        provider: 'tink',
        status: 'connected',
        accessToken: { $ne: null }
    }).select('userId');

    const results = [];

    for (const connection of connections) {
        try {
            const result = await syncBankConnection(
                connection.userId.toString()
            );

            results.push({
                ok: true,
                ...result
            });
        } catch (error) {
            results.push({
                ok: false,
                error: error.message
            });
        }
    }

    return results;
}

module.exports = {
    toDateOrNull,
    serializeAccount,
    getBankConnectionBaseQuery,
    getValidAccessToken,
    resolveSyncWindow,
    importTransactions,
    syncBankConnection,
    syncAllConnectedBankConnections
};