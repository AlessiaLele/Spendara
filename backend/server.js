const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./src/routes/authRoutes');
const tinkRoutes = require('./src/routes/tinkRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const { startDailyTransactionsJob } = require('./src/jobs/dailyTransactionsJob');

const app = express();

app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => {
    res.json({ message: 'API attiva' });
});
app.use('/api/auth', authRoutes);
app.use('/api/tink', tinkRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions', transactionRoutes);


mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connesso');
        startDailyTransactionsJob();
        app.listen(process.env.PORT, () => {
            console.log(`Server avviato sulla porta ${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.error('Errore connessione MongoDB:', err);
    });