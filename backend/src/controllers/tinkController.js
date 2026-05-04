const BankConnection = require('../models/BankConnection');
const Transaction = require('../models/Transaction');

const {
    getTinkConnectUrl,
    exchangeCodeForToken,
    refreshAccessToken,
    getAccounts,
    getTransactions
} = require('../services/tinkService');

const {
    PURPOSE,
    createTinkState,
    verifyTinkState
} = require('../utils/stateToken');

function toDateOrNull(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
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

async function startConnect(req, res) {
    try {
        const userId = req.user._id.toString();
        const state = createTinkState(userId);
        const connectUrl = getTinkConnectUrl(state);

        return res.status(200).json({
            message: 'URL di collegamento generata correttamente',
            connectUrl
        });
    } catch (error) {
        console.error('Errore startConnect:', error);
        return res.status(500).json({
            message: 'Errore durante la generazione del link di collegamento banca'
        });
    }
}

async function importTransactions(userId, transactions, accounts) {
    if (!Array.isArray(transactions) || !transactions.length) {
        return 0;
    }

    const accountMap = new Map((accounts || []).map(acc => [acc.id, acc]));
    const transactionIds = transactions.map(t => t.id).filter(Boolean);

    if (!transactionIds.length) return 0;

    const existing = await Transaction.find({
        userId,
        externalTransactionId: { $in: transactionIds }
    }).select('externalTransactionId').lean();

    const existingIds = new Set(existing.map(t => t.externalTransactionId));

    const newTransactions = transactions
        .filter(tx => tx.id && !existingIds.has(tx.id))
        .filter(tx => tx.accountId)
        .map(tx => {
            const account = accountMap.get(tx.accountId);

            return {
                userId,
                provider: 'tink',
                source: 'bank',
                externalTransactionId: tx.id,
                accountId: tx.accountId,
                accountName: account?.name || tx.accountName || null,
                amount: Number(tx.amount ?? 0),
                currencyCode: tx.currencyCode || 'EUR',
                description: tx.description || '',
                date: tx.date ? new Date(tx.date) : new Date(),
                category: tx.category || 'Uncategorized'
            };
        });

    if (newTransactions.length > 0) {
        await Transaction.insertMany(newTransactions, { ordered: false });
    }

    return newTransactions.length;
}

async function handleCallback(req, res) {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).json({
                message: 'Code o state mancanti'
            });
        }

        let payload;
        try {
            payload = verifyTinkState(state);
        } catch (err) {
            return res.status(400).json({
                message: 'State non valido o scaduto'
            });
        }

        if (payload.purpose !== PURPOSE) {
            return res.status(400).json({
                message: 'State non valido'
            });
        }

        const userId = payload.userId;
        const tokenData = await exchangeCodeForToken(code);

        let bankConnection = await BankConnection.findOne(getBankConnectionBaseQuery(userId));

        if (!bankConnection) {
            bankConnection = await BankConnection.create({
                userId,
                provider: 'tink',
                tinkUserId: tokenData.tinkUserId,
                accessToken: tokenData.accessToken,
                refreshToken: tokenData.refreshToken || null,
                tokenExpiresAt: toDateOrNull(tokenData.expiresAt),
                status: 'connected',
                linkedAccounts: [],
                lastSyncAt: null,
                lastSyncError: null
            });
        } else {
            bankConnection.accessToken = tokenData.accessToken;
            bankConnection.refreshToken = tokenData.refreshToken || bankConnection.refreshToken || null;
            bankConnection.tokenExpiresAt = toDateOrNull(tokenData.expiresAt);
            bankConnection.tinkUserId = tokenData.tinkUserId || bankConnection.tinkUserId;
            bankConnection.status = 'connected';
            bankConnection.lastSyncError = null;
            await bankConnection.save();
        }

        const accessToken = await getValidAccessToken(bankConnection);
        if (!accessToken) {
            throw new Error('Access token non disponibile');
        }

        const accounts = await getAccounts(accessToken);
        bankConnection.linkedAccounts = accounts.map(serializeAccount);
        await bankConnection.save();

        const accountIds = accounts.map(acc => acc.id);
        const transactions = accountIds.length
            ? await Promise.all(accountIds.map(accountId => getTransactions(accessToken, { accountId })))
            : [await getTransactions(accessToken)];

        const flattenedTransactions = transactions.flat();
        const importedCount = await importTransactions(userId, flattenedTransactions, accounts);

        bankConnection.lastSyncAt = new Date();
        bankConnection.lastSyncError = null;
        await bankConnection.save();

        return res.status(200).json({
            message: 'Collegamento banca completato con successo',
            accountsCount: accounts.length,
            importedTransactions: importedCount
        });
    } catch (error) {
        console.error('Errore handleCallback:', error);

        try {
            const { state } = req.query;
            if (state) {
                const payload = verifyTinkState(state);
                if (payload?.userId) {
                    await BankConnection.findOneAndUpdate(
                        getBankConnectionBaseQuery(payload.userId),
                        {
                            $set: {
                                status: 'failed',
                                lastSyncError: error.message || 'Errore callback Tink'
                            }
                        },
                        { new: true }
                    );
                }
            }
        } catch (_) {
            // ignora errori secondari
        }

        return res.status(500).json({
            message: 'Errore durante la gestione della callback Tink'
        });
    }
}

async function getBankConnectionStatus(req, res) {
    try {
        const userId = req.user._id.toString();

        const bankConnection = await BankConnection.findOne({
            ...getBankConnectionBaseQuery(userId)
        }).lean();

        return res.status(200).json({
            isConnected: !!bankConnection && bankConnection.status === 'connected',
            bankConnection: bankConnection
                ? {
                    id: bankConnection._id,
                    provider: bankConnection.provider,
                    status: bankConnection.status,
                    updatedAt: bankConnection.updatedAt,
                    lastSyncAt: bankConnection.lastSyncAt,
                    lastSyncError: bankConnection.lastSyncError || null,
                    linkedAccounts: bankConnection.linkedAccounts || []
                }
                : null
        });
    } catch (error) {
        console.error('Errore getBankConnectionStatus:', error);
        return res.status(500).json({
            message: 'Errore nel recupero dello stato collegamento banca'
        });
    }
}

async function getBankAccounts(req, res) {
    try {
        const userId = req.user._id.toString();

        const bankConnection = await BankConnection.findOne(getBankConnectionBaseQuery(userId));
        if (!bankConnection || bankConnection.status !== 'connected') {
            return res.status(200).json({
                accounts: []
            });
        }

        const accessToken = await getValidAccessToken(bankConnection);
        const accounts = await getAccounts(accessToken);

        bankConnection.linkedAccounts = accounts.map(serializeAccount);
        await bankConnection.save();

        return res.status(200).json({
            accounts: accounts.map(serializeAccount)
        });
    } catch (error) {
        console.error('Errore getBankAccounts:', error);
        return res.status(500).json({
            message: 'Errore nel recupero dei conti bancari'
        });
    }
}

async function getBankTransactions(req, res) {
    try {
        const userId = req.user._id.toString();
        const { accountId } = req.query;

        const query = {
            userId,
            source: 'bank'
        };

        if (accountId) {
            query.accountId = accountId;
        }

        const transactions = await Transaction.find(query).sort({ date: -1 }).lean();

        return res.status(200).json(transactions);
    } catch (error) {
        console.error('Errore getBankTransactions:', error);
        return res.status(500).json({
            message: 'Errore nel recupero delle transazioni bancarie'
        });
    }
}

async function syncBankTransactions(req, res) {
    try {
        const userId = req.user._id.toString();
        const { accountId } = req.query;

        const bankConnection = await BankConnection.findOne(getBankConnectionBaseQuery(userId));

        if (!bankConnection || bankConnection.status !== 'connected' || !bankConnection.accessToken) {
            return res.status(400).json({
                message: 'Nessun conto bancario collegato'
            });
        }

        const accessToken = await getValidAccessToken(bankConnection);
        if (!accessToken) {
            return res.status(400).json({
                message: 'Access token non disponibile'
            });
        }

        const accounts = await getAccounts(accessToken);

        let accountsToSync = accounts;
        if (accountId) {
            accountsToSync = accounts.filter(acc => acc.id === accountId);
        }

        if (!accountsToSync.length) {
            return res.status(404).json({
                message: 'Conto bancario non trovato'
            });
        }

        const transactionsByAccount = await Promise.all(
            accountsToSync.map(acc => getTransactions(accessToken, { accountId: acc.id }))
        );

        const flattenedTransactions = transactionsByAccount.flat();
        const importedCount = await importTransactions(userId, flattenedTransactions, accountsToSync);

        bankConnection.linkedAccounts = accounts.map(serializeAccount);
        bankConnection.lastSyncAt = new Date();
        bankConnection.lastSyncError = null;
        await bankConnection.save();

        return res.status(200).json({
            message: 'Sincronizzazione completata con successo',
            importedTransactions: importedCount,
            totalFetched: flattenedTransactions.length,
            syncedAccounts: accountsToSync.length
        });
    } catch (error) {
        console.error('Errore syncBankTransactions:', error);

        try {
            const userId = req.user?._id?.toString();
            if (userId) {
                await BankConnection.findOneAndUpdate(
                    getBankConnectionBaseQuery(userId),
                    {
                        $set: {
                            status: 'failed',
                            lastSyncError: error.message || 'Errore sync Tink'
                        }
                    },
                    { new: true }
                );
            }
        } catch (_) {
            // ignora errori secondari
        }

        return res.status(500).json({
            message: 'Errore durante la sincronizzazione delle transazioni bancarie'
        });
    }
}

async function disconnectBankConnection(req, res) {
    try {
        const userId = req.user._id.toString();

        await BankConnection.findOneAndUpdate(
            getBankConnectionBaseQuery(userId),
            {
                $set: {
                    status: 'disconnected',
                    accessToken: null,
                    refreshToken: null,
                    tokenExpiresAt: null,
                    linkedAccounts: [],
                    lastSyncError: null
                }
            },
            { new: true }
        );

        return res.status(200).json({
            message: 'Connessione bancaria rimossa con successo'
        });
    } catch (error) {
        console.error('Errore disconnectBankConnection:', error);
        return res.status(500).json({
            message: 'Errore durante la disconnessione della banca'
        });
    }
}

module.exports = {
    startConnect,
    handleCallback,
    getBankConnectionStatus,
    getBankAccounts,
    getBankTransactions,
    syncBankTransactions,
    disconnectBankConnection
};