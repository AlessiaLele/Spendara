import express from "express";
import {  getTransactions, createTransaction } from "../controllers/transactionController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createTransaction);
router.get("/", verifyToken, getTransactions);

export default router;