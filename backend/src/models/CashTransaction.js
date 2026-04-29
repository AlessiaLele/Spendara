import mongoose from "mongoose";

const cashTransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ["income", "expense"],
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const CashTransaction = mongoose.model(
    "CashTransaction",
    cashTransactionSchema
);

export default CashTransaction;