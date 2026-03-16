import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// REGISTRAZIONE UTENTE
export const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Controllo se utente esiste già
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Utente già registrato" });
        }

        // Hash della password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Creazione utente
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        const savedUser = await newUser.save();

        // Creazione token JWT
        const token = jwt.sign(
            { id: savedUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" } // token valido 1 giorno
        );

        res.status(201).json({
            user: {
                id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email
            },
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Errore server" });
    }
};

// LOGIN UTENTE
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Controllo se utente esiste
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Utente non trovato" });
        }

        // Confronto password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Password errata" });
        }

        // Creazione token JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Errore server" });
    }
};