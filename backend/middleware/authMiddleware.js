import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
    try {
        // Legge il token dall'header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Token mancante o non valido" });
        }

        const token = authHeader.split(" ")[1];

        // Verifica token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Salva l'utente nella request
        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) {
            return res.status(401).json({ message: "Utente non trovato" });
        }

        next();

    } catch (error) {
        console.error(error);
        res.status(401).json({ message: "Token non valido" });
    }
};