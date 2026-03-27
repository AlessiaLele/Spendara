const cron = require('node-cron');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { generateTransaction } = require('../services/transactionService');

cron.schedule('0 9 * * *', async () => {
    console.log('Avvio job transazioni giornaliere');

    try {
        const users = await User.find();

        for (const user of users) {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const alreadyRun = await Transaction.findOne({
                userId: user._id,
                source: 'simulated',
                date: { $gte: startOfToday }
            });

            if (alreadyRun) {
                console.log(`Transazioni già generate oggi per utente ${user._id}`);
                continue;
            }

            const accountId = user.tinkAccountId || 'demo-account';
            const count = 2 + Math.floor(Math.random() * 2);
            const docs = [];

            for (let i = 0; i < count; i++) {
                const date = new Date();
                date.setHours(9 + Math.floor(Math.random() * 10));
                date.setMinutes(Math.floor(Math.random() * 60));
                date.setSeconds(Math.floor(Math.random() * 60));

                docs.push(generateTransaction(user._id, accountId, date));
            }

            if (docs.length) {
                await Transaction.insertMany(docs);
            }
        }

        console.log('Job completato');
    } catch (err) {
        console.error('Errore cron job:', err);
    }
});