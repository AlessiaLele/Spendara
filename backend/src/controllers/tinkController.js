const BankConnection = require('../models/BankConnection');
const Transaction = require('../models/Transaction');

const {
    getTinkConnectUrl,
    exchangeCodeForToken,
    getAccounts
} = require('../services/tinkService');

const {
    PURPOSE,
    createTinkState,
    verifyTinkState
} = require('../utils/stateToken');

const {
    getBankConnectionBaseQuery,
    getValidAccessToken,
    syncBankConnection,
    toDateOrNull,
    serializeAccount
} = require('../services/tinkSyncService');

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

async function upsertBankConnectionFromToken(userId, tokenData) {
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
            lastSyncError: null,
            syncCursor: null
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

    return bankConnection;
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
        await upsertBankConnectionFromToken(userId, tokenData);

        const syncResult = await syncBankConnection(userId, {
            forceFullSync: true
        });

        return res.status(200).json({
            message: 'Collegamento banca completato con successo',
            accountsCount: syncResult.accounts.length,
            importedTransactions: syncResult.importedTransactions,
            syncedAccounts: syncResult.syncedAccounts,
            lastSyncAt: syncResult.bankConnection.lastSyncAt
        });
    } catch (error) {
        console.error('Errore handleCallback:', error);
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
                    linkedAccounts: bankConnection.linkedAccounts || [],
                    syncCursor: bankConnection.syncCursor || null
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
            source: 'bank',
            deletedAt: null
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

        const result = await syncBankConnection(userId, {
            accountId: accountId || '',
            forceFullSync: false
        });

        return res.status(200).json({
            message: 'Sincronizzazione completata con successo',
            importedTransactions: result.importedTransactions,
            totalFetched: result.totalFetched,
            syncedAccounts: result.syncedAccounts,
            lastSyncAt: result.bankConnection.lastSyncAt,
            linkedAccounts: result.accounts
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
                            lastSyncError: error.message || 'Errore sync Tink'
                        }
                    },
                    { new: true }
                );
            }
        } catch (_) {
            // ignora errori secondari
        }

        return res.status(error.statusCode || 500).json({
            message: error.message || 'Errore durante la sincronizzazione delle transazioni bancarie'
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
                    lastSyncError: null,
                    syncCursor: null
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