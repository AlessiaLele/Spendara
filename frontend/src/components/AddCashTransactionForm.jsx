import React, { useState } from 'react';
import { addCashTransaction } from '../api/transactionApi';

function AddCashTransactionForm({ onTransactionAdded }) {
    const [formData, setFormData] = useState({
        amount: '',
        category: '',
        description: '',
        date: ''
    });

    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setMessage('');
            setIsError(false);

            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('Utente non autenticato');
            }

            await addCashTransaction(token, {
                amount: -Math.abs(Number(formData.amount)),
                category: formData.category,
                description: formData.description,
                date: formData.date
            });

            setMessage('Transazione cash aggiunta con successo');

            setFormData({
                amount: '',
                category: '',
                description: '',
                date: ''
            });

            if (onTransactionAdded) {
                onTransactionAdded();
            }
        } catch (error) {
            setIsError(true);
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="transaction-form" onSubmit={handleSubmit}>
            <div className="currency-input-wrapper">
                <span className="currency-symbol">€</span>
                <input
                    className="currency-input"
                    type="number"
                    step="0.01"
                    name="amount"
                    placeholder="Importo"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                />
            </div>

            <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
            >
                <option value="">Seleziona categoria</option>
                <option value="Groceries">Spesa</option>
                <option value="Food">Cibo</option>
                <option value="Transport">Trasporti</option>
                <option value="Entertainment">Svago</option>
                <option value="Bills">Bollette</option>
                <option value="Shopping">Shopping</option>
                <option value="Health">Salute</option>
                <option value="Other">Altro</option>
            </select>

            <input
                type="text"
                name="description"
                placeholder="Descrizione"
                value={formData.description}
                onChange={handleChange}
            />

            <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
            />

            <button type="submit" className="primary-action-btn" disabled={loading}>
                {loading ? 'Salvataggio...' : 'Aggiungi spesa cash'}
            </button>

            {message && (
                <p className={`form-message ${isError ? 'amount-expense' : 'amount-income'}`}>
                    {message}
                </p>
            )}
        </form>
    );
}

export default AddCashTransactionForm;