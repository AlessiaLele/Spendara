const Transaction = require('../models/Transaction');
const { normalizeTransactionInput, normalizeCategory } = require('../utils/mapTransaction');

async function addCashTransaction(req, res) {
    try {
        const userId = req.user._id;
        const { amount, category, description, date } = req.body;

        if (amount === undefined || amount === null || !category || !date) {
            return res.status(400).json({
                message: 'Amount, category e date sono obbligatori'
            });
        }

        const normalizedTransaction = normalizeTransactionInput({
            amount,
            category: normalizeCategory(category),
            description,
            date,
            currencyCode: 'EUR',
            source: 'cash',
            externalTransactionId: '',
            accountId: ''
        });

        const transaction = await Transaction.create({
            userId,
            ...normalizedTransaction
        });

        return res.status(201).json({
            message: 'Transazione cash aggiunta con successo',
            transaction
        });
    } catch (error) {
        console.error('Errore addCashTransaction:', error.message);
        return res.status(500).json({
            message: error.message || 'Errore durante l’inserimento della transazione cash'
        });
    }
}

async function getAllTransactions(req, res) {
    try {
        const userId = req.user._id;

        const transactions = await Transaction.find({ userId }).sort({ date: -1 });

        return res.status(200).json(transactions);
    } catch (error) {
        console.error('Errore getAllTransactions:', error.message);
        return res.status(500).json({
            message: 'Errore nel recupero delle transazioni'
        });
    }
}

async function updateTransactionCategory(req, res) {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { category } = req.body;

        const normalizedCategoryValue = normalizeCategory(category);

        const transaction = await Transaction.findOne({ _id: id, userId });

        if (!transaction) {
            return res.status(404).json({
                message: 'Transazione non trovata'
            });
        }

        transaction.category = normalizedCategoryValue;
        await transaction.save();

        return res.status(200).json({
            message: 'Categoria aggiornata con successo',
            transaction
        });
    } catch (error) {
        console.error('Errore updateTransactionCategory:', error.message);
        return res.status(500).json({
            message: 'Errore durante l’aggiornamento della categoria'
        });
    }
}

async function updateManualTransaction(req, res) {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { amount, category, description, date } = req.body;

        const transaction = await Transaction.findOne({ _id: id, userId });

        if (!transaction) {
            return res.status(404).json({
                message: 'Transazione non trovata'
            });
        }

        if (transaction.source !== 'cash') {
            return res.status(400).json({
                message: 'Puoi modificare solo le transazioni inserite manualmente'
            });
        }

        if (amount === undefined || amount === null || !category || !date) {
            return res.status(400).json({
                message: 'Amount, category e date sono obbligatori'
            });
        }

        const normalizedTransaction = normalizeTransactionInput({
            externalTransactionId: '',
            accountId: '',
            amount,
            currencyCode: transaction.currencyCode || 'EUR',
            description,
            date,
            category: normalizeCategory(category),
            source: 'cash'
        });

        transaction.amount = normalizedTransaction.amount;
        transaction.category = normalizedTransaction.category;
        transaction.description = normalizedTransaction.description;
        transaction.date = normalizedTransaction.date;

        await transaction.save();

        return res.status(200).json({
            message: 'Transazione manuale aggiornata con successo',
            transaction
        });
    } catch (error) {
        console.error('Errore updateManualTransaction:', error.message);
        return res.status(500).json({
            message: error.message || 'Errore durante la modifica della transazione'
        });
    }
}

async function deleteTransaction(req, res) {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const transaction = await Transaction.findOne({ _id: id, userId });

        if (!transaction) {
            return res.status(404).json({
                message: 'Transazione non trovata'
            });
        }

        if (transaction.source !== 'cash') {
            return res.status(400).json({
                message: 'Puoi eliminare solo le transazioni inserite manualmente'
            });
        }

        await Transaction.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'Transazione eliminata con successo'
        });
    } catch (error) {
        console.error('Errore deleteTransaction:', error.message);
        return res.status(500).json({
            message: 'Errore durante l’eliminazione della transazione'
        });
    }
}

module.exports = {
    addCashTransaction,
    getAllTransactions,
    updateTransactionCategory,
    updateManualTransaction,
    deleteTransaction
};