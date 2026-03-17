const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connesso');
        app.listen(process.env.PORT, () => {
            console.log(`Server avviato sulla porta ${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.error('Errore connessione MongoDB:', err);
    });