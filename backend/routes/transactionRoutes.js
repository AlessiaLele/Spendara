const express = require('express');
const Transaction = require('../models/Transaction');
const { getDateRange } = require('../utils/dateRange');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET transazioni con filtro periodo
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const { start, end } = getDateRange(period);

        const filter = {
            user: req.user.id,
            date: {
                $gte: start,
                $lte: end
            }
        };

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

        if (!type || amount === undefined || !date || !category || !description) {
            return res.status(400).json({
                message: 'Tipo, importo, data, categoria e descrizione sono obbligatori'
            });
        }

        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({
                message: "Il tipo deve essere 'income' oppure 'expense'"
            });
        }

        if (isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({
                message: "L'importo deve essere un numero maggiore di 0"
            });
        }

        if (isNaN(new Date(date).getTime())) {
            return res.status(400).json({
                message: 'La data non è valida'
            });
        }

        const transaction = new Transaction({
            user: req.user.id,
            type,
            amount: Number(amount),
            date,
            category: String(category).trim(),
            description: String(description).trim(),
            paymentMethod: paymentMethod ? String(paymentMethod).trim() : ''
        });

        await transaction.save();

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Errore creazione transazione:', error);
        res.status(500).json({ message: 'Errore server' });
    }
});

// PUT modifica transazione
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { type, amount, date, category, description, paymentMethod } = req.body;

        if (type !== undefined && !['income', 'expense'].includes(type)) {
            return res.status(400).json({
                message: "Il tipo deve essere 'income' oppure 'expense'"
            });
        }

        if (amount !== undefined && (isNaN(amount) || Number(amount) <= 0)) {
            return res.status(400).json({
                message: "L'importo deve essere un numero maggiore di 0"
            });
        }

        if (date !== undefined && isNaN(new Date(date).getTime())) {
            return res.status(400).json({
                message: 'La data non è valida'
            });
        }

        if (category !== undefined && !String(category).trim()) {
            return res.status(400).json({
                message: 'La categoria non può essere vuota'
            });
        }

        if (description !== undefined && !String(description).trim()) {
            return res.status(400).json({
                message: 'La descrizione non può essere vuota'
            });
        }

        const transaction = await Transaction.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transazione non trovata' });
        }

        if (type !== undefined) transaction.type = type;
        if (amount !== undefined) transaction.amount = Number(amount);
        if (date !== undefined) transaction.date = date;
        if (category !== undefined) transaction.category = String(category).trim();
        if (description !== undefined) transaction.description = String(description).trim();
        if (paymentMethod !== undefined) {
            transaction.paymentMethod = String(paymentMethod).trim();
        }

        await transaction.save();

        res.status(200).json(transaction);
    } catch (error) {
        console.error('Errore aggiornamento transazione:', error);
        res.status(500).json({ message: 'Errore server' });
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