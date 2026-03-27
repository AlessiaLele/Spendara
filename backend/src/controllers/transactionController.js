const Transaction = require('../models/Transaction');
const { generateTransaction, generateHistoricalTransactions } = require('../services/transactionService');

async function addCashTransaction(req, res) {
    try {
        const userId = req.user._id;
        const { amount, category, description, date } = req.body;

        if (!amount || !category || !date) {
            return res.status(400).json({
                message: 'Amount, category e date sono obbligatori'
            });
        }

        const transaction = await Transaction.create({
            userId,
            amount: Number(amount),
            category,
            description: description || '',
            date: new Date(date),
            currencyCode: 'EUR',
            source: 'cash',
            externalTransactionId: ''
        });

        return res.status(201).json({
            message: 'Transazione cash aggiunta con successo',
            transaction
        });
    } catch (error) {
        console.error('Errore addCashTransaction:', error.message);
        return res.status(500).json({
            message: 'Errore durante l’inserimento della transazione cash'
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

async function seedTransactions(req, res) {
    try {
        const userId = req.user._id;
        const { days = 90 } = req.body;

        const transactions = generateHistoricalTransactions(userId, Number(days));

        console.log('USER ID:', userId);
        console.log('DAYS:', days);
        console.log('GENERATED TRANSACTIONS:', transactions.length);
        console.log('FIRST TRANSACTION:', transactions[0]);

        await Transaction.insertMany(transactions);

        return res.status(201).json({
            message: `${transactions.length} transazioni simulate create con successo`
        });
    } catch (error) {
        console.error('Errore seedTransactions:', error);
        return res.status(500).json({
            message: 'Errore durante la generazione dello storico'
        });
    }
}

async function addDailySimulatedTransactions(req, res) {
    try {
        const userId = req.user._id;
        const count = 2 + Math.floor(Math.random() * 2); // 2 o 3

        const docs = [];
        for (let i = 0; i < count; i++) {
            docs.push(generateTransaction(userId, new Date()));
        }

        const created = await Transaction.insertMany(docs);

        return res.status(201).json({
            message: `${created.length} transazioni giornaliere aggiunte`,
            transactions: created
        });
    } catch (error) {
        console.error('Errore addDailySimulatedTransactions:', error.message);
        return res.status(500).json({
            message: 'Errore durante la generazione delle transazioni giornaliere'
        });
    }
}

module.exports = {
    addCashTransaction,
    getAllTransactions,
    deleteTransaction,
    seedTransactions,
    addDailySimulatedTransactions
};