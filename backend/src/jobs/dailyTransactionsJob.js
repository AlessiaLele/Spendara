const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const {
    generateThreeDailyTransactions,
    generateMissingDailyTransactions,
    generateMonthlySalaryTransaction,
    generateHistoricalTransactions
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

            if (today.getDate() >= 26) {
                const salaryId =
                    `salary-${user._id}-${today.getFullYear()}-${today.getMonth() + 1}`;

                await Transaction.updateOne(
                    {
                        userId: user._id,
                        externalTransactionId: salaryId
                    },
                    {
                        $setOnInsert: generateMonthlySalaryTransaction(user._id, today)
                    },
                    {
                        upsert: true
                    }
                );
            }

            const lastDate = user.lastSimulatedBatchDate
                ? normalize(user.lastSimulatedBatchDate)
                : null;

            let newTransactions = [];

            if (!lastDate) {
                // ✅ Prima volta: popola storico 90 giorni + transazioni di oggi
                const historicalTransactions = generateHistoricalTransactions(
                    user._id,
                    90,
                    'demo-account'
                );

                if (historicalTransactions.length > 0) {
                    await Transaction.insertMany(historicalTransactions, { ordered: false });
                }

                // Genera anche le transazioni di oggi
                newTransactions = generateThreeDailyTransactions(
                    user._id,
                    today,
                    'demo-account'
                );
            } else if (lastDate < today) {
                // giorni mancanti — invariato
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