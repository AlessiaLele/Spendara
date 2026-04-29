const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { generateMissingDailyTransactions,
        generateThreeDailyTransactions } = require('../services/transactionService');

// helper per evitare problemi di timezone
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

            let lastDate = user.lastSimulatedBatchDate
                ? normalize(user.lastSimulatedBatchDate)
                : null;

            if (!lastDate) {
                const newTransactions = generateThreeDailyTransactions(
                    user._id,
                    today,
                    'demo-account'
                );

                if (newTransactions.length > 0) {
                    await Transaction.insertMany(newTransactions);
                }

                await User.updateOne(
                    { _id: user._id },
                    { lastSimulatedBatchDate: today }
                );
            } else if (lastDate < today) {

                const newTransactions = generateMissingDailyTransactions(
                    user._id,
                    lastDate,
                    today,
                    'demo-account'
                );

                if (newTransactions.length > 0) {
                    await Transaction.insertMany(newTransactions);
                }

                await User.updateOne(
                    { _id: user._id },
                    { lastSimulatedBatchDate: today }
                );
            }

           //Stipedio
            if (today.getDate() === 10 || today.getDate() === 11) {

                const salaryId = `salary-${user._id}-${today.toISOString().slice(0, 10)}`;

                const existingSalary = await Transaction.findOne({
                    externalTransactionId: `daily-${userId}-${date.toISOString().slice(0,10)}-${i}`
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

    // run immediato all'avvio
    runDailyTransactionsJob();
}

module.exports = { startDailyTransactionsJob };