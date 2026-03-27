const BankConnection = require('../models/BankConnection');
const Transaction = require('../models/Transaction');
const {
    getTinkConnectUrl,
    exchangeCodeForToken,
    getAccounts,
    getTransactions
} = require('../services/tinkService');

async function startConnect(req, res) {
    try {
        const userId = req.user._id.toString();
        const state = `user_${userId}_${Date.now()}`;

        const connectUrl = await getTinkConnectUrl(state);

        return res.status(200).json({
            message: 'URL di collegamento generata correttamente',
            connectUrl
        });
    } catch (error) {
        console.error('Errore startConnect:', error.message);
        return res.status(500).json({
            message: 'Errore durante la generazione del link di collegamento banca'
        });
    }
}

async function handleCallback(req, res) {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).json({
                message: 'Code mancante nella callback'
            });
        }

        if (!state) {
            return res.status(400).json({
                message: 'State mancante nella callback'
            });
        }

        const stateParts = state.split('_');
        const userId = stateParts[1];

        if (!userId) {
            return res.status(400).json({
                message: 'State non valido'
            });
        }

        const tokenData = await exchangeCodeForToken(code);

        let bankConnection = await BankConnection.findOne({ userId, provider: 'tink' });

        if (!bankConnection) {
            bankConnection = await BankConnection.create({
                userId,
                provider: 'tink',
                tinkUserId: tokenData.tinkUserId,
                accessToken: tokenData.accessToken,
                status: 'connected'
            });
        } else {
            bankConnection.accessToken = tokenData.accessToken;
            bankConnection.tinkUserId = tokenData.tinkUserId;
            bankConnection.status = 'connected';
            await bankConnection.save();
        }

        const accounts = await getAccounts(tokenData.accessToken);
        const transactions = await getTransactions(tokenData.accessToken);

        for (const tx of transactions) {
            const existingTransaction = await Transaction.findOne({
                userId,
                externalTransactionId: tx.id
            });

            if (!existingTransaction) {
                await Transaction.create({
                    userId,
                    externalTransactionId: tx.id,
                    accountId: tx.accountId || accounts[0]?.id || 'demo-account',
                    amount: tx.amount,
                    currencyCode: tx.currencyCode || 'EUR',
                    description: tx.description || '',
                    date: tx.date ? new Date(tx.date) : new Date(),
                    category: tx.category || 'Uncategorized',
                    source: 'bank'
                });
            }
        }

        return res.status(200).json({
            message: 'Collegamento banca completato con successo',
            bankConnection,
            accountsCount: accounts.length,
            importedTransactions: transactions.length
        });
    } catch (error) {
        console.error('Errore handleCallback:', error.message);
        return res.status(500).json({
            message: 'Errore durante la gestione della callback Tink'
        });
    }
}

async function getBankTransactions(req, res) {
    try {
        const userId = req.user._id;

        const transactions = await Transaction.find({
            userId,
            source: 'bank'
        }).sort({ date: -1 });

        return res.status(200).json(transactions);
    } catch (error) {
        console.error('Errore getBankTransactions:', error.message);
        return res.status(500).json({
            message: 'Errore nel recupero delle transazioni bancarie'
        });
    }
}

module.exports = {
    startConnect,
    handleCallback,
    getBankTransactions
};