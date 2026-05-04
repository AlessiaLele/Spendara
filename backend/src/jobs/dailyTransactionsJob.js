const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { isDemoMode, generateThreeDailyTransactions, generateMissingDailyTransactions } = require('../services/transactionService');

function normalize(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

async function insertMissingTransactions(userId, transactions) {
    if (!Array.isArray(transactions) || !transactions.length) {
        return 0;
    }

    const ids = transactions.map(tx => tx.externalTransactionId).filter(Boolean);

    if (!ids.length) return 0;

    const existing = await Transaction.find({
        userId,
        externalTransactionId: { $in: ids }
    }).select('externalTransactionId').lean();

    const existingIds = new Set(existing.map(tx => tx.externalTransactionId));
    const newTransactions = transactions.filter(tx => tx.externalTransactionId && !existingIds.has(tx.externalTransactionId));

    if (newTransactions.length > 0) {
        await Transaction.insertMany(newTransactions, { ordered: false });
    }

    return newTransactions.length;
}

async function runDailyTransactionsJob() {
    if (!isDemoMode()) {
        console.log('[dailyTransactionsJob] Demo mode disattiva: nessuna transazione generata.');
        return;
    }

    const users = await User.find();

    for (const user of users) {
        try {
            const today = normalize(new Date());

            let lastDate = user.lastSimulatedBatchDate
                ? normalize(user.lastSimulatedBatchDate)
                : null;

            if (!lastDate) {
                const newTransactions = generateThreeDailyTransactions(
                    user._id.toString(),
                    today,
                    'demo-account'
                );

                await insertMissingTransactions(user._id, newTransactions);

                await User.updateOne(
                    { _id: user._id },
                    { $set: { lastSimulatedBatchDate: today } }
                );
            } else if (lastDate < today) {
                const newTransactions = generateMissingDailyTransactions(
                    user._id.toString(),
                    lastDate,
                    today,
                    'demo-account'
                );

                await insertMissingTransactions(user._id, newTransactions);

                await User.updateOne(
                    { _id: user._id },
                    { $set: { lastSimulatedBatchDate: today } }
                );
            }

            // Stipendio demo
            const day = today.getDate();
            if (day === 10 || day === 11) {
                const salaryId = `salary-${user._id}-${today.toISOString().slice(0, 10)}`;
                const existingSalary = await Transaction.findOne({
                    userId: user._id,
                    externalTransactionId: salaryId
                });

                if (!existingSalary) {
                    const salaryDate = new Date(today);
                    salaryDate.setHours(9, 0, 0, 0);

                    await Transaction.create({
                        userId: user._id,
                        accountId: 'demo-account',
                        amount: 1650,
                        currencyCode: 'EUR',
                        description: 'Stipendio Azienda',
                        date: salaryDate,
                        category: 'salary',
                        source: 'bank',
                        externalTransactionId: salaryId
                    });

                    console.log(`Salary added for user ${user._id}`);
                }
            }
        } catch (err) {
            console.error(`Error processing user ${user._id}`, err);
        }
    }
}

function startDailyTransactionsJob() {
    cron.schedule('0 0 * * *', () => {
        runDailyTransactionsJob();
    });

    runDailyTransactionsJob();
}

module.exports = { startDailyTransactionsJob };