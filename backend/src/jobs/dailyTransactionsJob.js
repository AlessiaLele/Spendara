const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { generateMissingDailyTransactions } = require('../services/transactionService');

// helper per evitare problemi di timezone
function normalize(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

async function runDailyTransactionsJob() {
    console.log("Running daily transaction job...");

    const users = await User.find();

    for (const user of users) {
        try {
            const today = normalize(new Date());

            let lastDate = user.lastSimulatedBatchDate
                ? normalize(user.lastSimulatedBatchDate)
                : null;

            // ✅ Caso primo avvio: nessuna data → genera solo oggi
            if (!lastDate) {
                console.log(`First run for user ${user._id}`);

                const newTransactions = generateMissingDailyTransactions(
                    user._id,
                    user.lastSimulatedBatchDate,
                    today,
                    'demo-account'
                );

// 🔥 definisci inizio/fine giornata
                const todayStart = new Date(today);
                todayStart.setHours(0, 0, 0, 0);

                const todayEnd = new Date(today);
                todayEnd.setHours(23, 59, 59, 999);

// 🔍 controlla se stipendio esiste già
                const existingSalary = await Transaction.findOne({
                    userId: user._id,
                    category: 'salary',
                    date: {
                        $gte: todayStart,
                        $lte: todayEnd
                    }
                });

// 🔥 FILTRA le transazioni da inserire
                const filteredTransactions = newTransactions.filter(tx => {
                    if (tx.category === 'salary' && existingSalary) {
                        return false; // ❌ blocca duplicato
                    }
                    return true;
                });

                if (filteredTransactions.length > 0) {
                    await Transaction.insertMany(filteredTransactions);

                    await User.updateOne(
                        { _id: user._id },
                        { lastSimulatedBatchDate: today }
                    );

                    console.log(`Added ${filteredTransactions.length} transactions for user ${user._id}`);
                }

                await User.updateOne(
                    { _id: user._id },
                    { lastSimulatedBatchDate: today }
                );

                continue;
            }

            // ✅ Se già aggiornato oggi → skip
            if (lastDate >= today) {
                continue;
            }

            // ✅ GENERA GIORNI MANCANTI
            const newTransactions = generateMissingDailyTransactions(
                user._id,
                lastDate,
                today,
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