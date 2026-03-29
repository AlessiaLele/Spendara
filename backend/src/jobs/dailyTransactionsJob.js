const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

let userTransactions = [];

// Generatore base
function generateTransaction() {
    return {
        id: uuidv4(),
        amount: (Math.random() * -100).toFixed(2),
        currency: "EUR",
        description: "Daily Auto Transaction",
        date: new Date().toISOString()
    };
}

// Job: eseguito ogni giorno alle 00:00
function startDailyTransactionsJob() {
    cron.schedule('0 0 * * *', () => {
        console.log("Running daily transaction job...");

        const newTransactions = [
            generateTransaction(),
            generateTransaction()
        ];

        // aggiunge esattamente 2
        userTransactions = [...newTransactions, ...userTransactions];

        console.log("Added 2 new daily transactions");
    });
}

module.exports = startDailyTransactionsJob;