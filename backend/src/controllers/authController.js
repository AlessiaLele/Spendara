const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

async function register(req, res) {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Compila tutti i campi'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: 'Utente già registrato'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        const token = generateToken(user._id);

        return res.status(201).json({
            message: 'Registrazione completata',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Errore register:', error);
        return res.status(500).json({
            message: 'Errore server in registrazione'
        });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Compila tutti i campi'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({
                message: 'Credenziali non valide'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: 'Credenziali non valide'
            });
        }

        const token = generateToken(user._id);

        return res.status(200).json({
            message: 'Login effettuato',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Errore login:', error);
        return res.status(500).json({
            message: 'Errore server in login'
        });
    }
}

async function getMe(req, res) {
    try {
        return res.status(200).json({
            user: req.user
        });
    } catch (error) {
        console.error('Errore getMe:', error);
        return res.status(500).json({
            message: 'Errore nel recupero utente'
        });
    }
}

module.exports = {
    register,
    login,
    getMe
};