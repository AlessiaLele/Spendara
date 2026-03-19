const express = require('express');
const Transaction = require('../models/Transaction');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET transazioni con filtro periodo
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { period } = req.query;

        const now = new Date();
        let startDate = null;

        if (period === 'day') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        const filter = { user: req.user.id };

        if (startDate) {
            filter.date = { $gte: startDate };
        }

        const transactions = await Transaction.find(filter).sort({ date: -1 });

        res.status(200).json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nel recupero delle transazioni' });
    }
});

// POST nuova transazione
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { type, amount, date, category, description, paymentMethod } = req.body;

        if ( !type || !amount || !date || !category || !description) {
            return res.status(400).json({
                message: 'Tipo, importo, data, categoria e descrizione sono obbligatori'
            });
        }

        const newTransaction = new Transaction({
            user: req.user.id,
            type,
            amount,
            date,
            category,
            description,
            paymentMethod
        });

        const savedTransaction = await newTransaction.save();

        res.status(201).json(savedTransaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nella creazione della transazione' });
    }
});

// PUT modifica transazione
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transazione non trovata' });
        }

        const { type, amount, date, category, description, paymentMethod } = req.body;

        transaction.amount = amount ?? transaction.amount;
        transaction.date = date ?? transaction.date;
        transaction.category = category ?? transaction.category;
        transaction.description = description ?? transaction.description;
        transaction.paymentMethod = paymentMethod ?? transaction.paymentMethod;
        transaction.type = type ?? transaction.type;

        const updatedTransaction = await transaction.save();

        res.status(200).json(updatedTransaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nella modifica della transazione' });
    }
});

// DELETE transazione
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transazione non trovata' });
        }

        res.status(200).json({ message: 'Transazione eliminata con successo' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nella cancellazione della transazione' });
    }
});

module.exports = router;