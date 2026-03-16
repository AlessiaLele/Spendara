import express from "express";
import { createTransaction } from "../controllers/transactionController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createTransaction);
router.get("/", verifyToken, getTransactions);

export default router;