import Transaction from "../models/Transaction.js";

// Creazione spesa
export const createTransaction = async (req, res) => {
    try {
        const { amount, category, description, date } = req.body;

        const transaction = new Transaction({
            userId: req.user._id, // collegamento all'utente
            amount,
            category,
            description,
            date
        });

        const savedTransaction = await transaction.save();
        res.status(201).json(savedTransaction);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Errore nel salvataggio della transazione" });
    }
};

// Recupera tutte le spese dell'utente
export const getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user._id });
        res.status(200).json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Errore nel recupero delle transazioni" });
    }
};