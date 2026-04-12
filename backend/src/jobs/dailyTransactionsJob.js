const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { generateMissingDailyTransactions } = require('../services/transactionService');

async function runDailyTransactionsJob() {
    console.log("Running daily transaction job...");

    const users = await User.find();

    for (const user of users) {
        try {
            const today = new Date();

            const newTransactions = generateMissingDailyTransactions(
                user._id,
                user.lastSimulatedBatchDate,
                'demo-account'
            );

            if (newTransactions.length > 0) {
                await Transaction.insertMany(newTransactions);

                await User.updateOne(
                    { _id: user._id },
                    { lastSimulatedBatchDate: today }
                );

                console.log(`Added ${newTransactions.length} transactions for user ${user._id}`);
            }

        } catch (err) {
            console.error(`Error processing user ${user._id}`, err);
        }
    }

    console.log("Daily transaction job completed");
}

function startDailyTransactionsJob() {
    cron.schedule('0 0 * * *', () => {
        runDailyTransactionsJob();
    });

    runDailyTransactionsJob();
}

module.exports = { startDailyTransactionsJob };