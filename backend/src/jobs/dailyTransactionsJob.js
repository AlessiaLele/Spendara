const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const {
    generateThreeDailyTransactions,
    generateMissingDailyTransactions
} = require('../services/transactionService');

function normalize(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

async function runDailyTransactionsJob() {
    const users = await User.find();

    for (const user of users) {
        try {
            const today = normalize(new Date());

            const lastDate = user.lastSimulatedBatchDate
                ? normalize(user.lastSimulatedBatchDate)
                : null;

            let newTransactions = [];

            if (!lastDate) {
                newTransactions = generateThreeDailyTransactions(
                    user._id,
                    today,
                    'demo-account'
                );
            } else if (lastDate < today) {
                newTransactions = generateMissingDailyTransactions(
                    user._id,
                    lastDate,
                    today,
                    'demo-account'
                );
            }

            if (newTransactions.length > 0) {
                await Transaction.insertMany(newTransactions);
            }

            await User.updateOne(
                { _id: user._id },
                { lastSimulatedBatchDate: today }
            );
        } catch (err) {
            console.error(`Error processing user ${user._id}`, err);
        }
    }
}

function startDailyTransactionsJob() {
    cron.schedule('0 0 * * *', () => {
        runDailyTransactionsJob();
    }, {
        timezone: 'Europe/Rome'
    });

    runDailyTransactionsJob();
}

module.exports = { startDailyTransactionsJob, runDailyTransactionsJob };