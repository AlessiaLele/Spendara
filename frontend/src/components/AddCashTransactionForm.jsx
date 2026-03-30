import React, { useEffect, useState } from 'react';
import { addCashTransaction, updateManualTransaction } from '../api/transactionApi';

const DEFAULT_FORM = {
    amount: '',
    category: '',
    description: '',
    date: ''
};

function AddCashTransactionForm({
                                    onTransactionAdded,
                                    editingTransaction,
                                    onCancelEdit
                                }) {
    const [formData, setFormData] = useState(DEFAULT_FORM);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingTransaction) {
            setFormData({
                amount: String(Math.abs(editingTransaction.amount || 0).toFixed(2)),
                category: editingTransaction.category || '',
                description: editingTransaction.description || '',
                date: editingTransaction.date
                    ? new Date(editingTransaction.date).toISOString().split('T')[0]
                    : ''
            });
            setMessage('');
            setIsError(false);
        } else {
            setFormData(DEFAULT_FORM);
            setMessage('');
            setIsError(false);
        }
    }, [editingTransaction]);

    const handleAmountChange = (e) => {
        const rawValue = e.target.value.replace(/\s/g, '').replace(',', '.');

        if (rawValue === '' || /^\d+(\.\d{0,2})?$/.test(rawValue)) {
            setFormData((prev) => ({
                ...prev,
                amount: rawValue
            }));
        }
    };

    const handleAmountBlur = () => {
        if (!formData.amount) {
            return;
        }

        const numericValue = Number(formData.amount);

        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            return;
        }

        setFormData((prev) => ({
            ...prev,
            amount: numericValue.toFixed(2)
        }));
    };

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
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

            const normalizedAmount = Number(formData.amount);

            if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
                throw new Error('Inserisci un importo valido maggiore di 0');
            }

            const payload = {
                amount: -Math.abs(Number(normalizedAmount.toFixed(2))),
                category: formData.category,
                description: formData.description,
                date: formData.date
            };

            if (editingTransaction) {
                await updateManualTransaction(token, editingTransaction._id, payload);
                setMessage('Transazione aggiornata con successo');
            } else {
                await addCashTransaction(token, payload);
                setMessage('Transazione cash aggiunta con successo');
            }

            setFormData(DEFAULT_FORM);

            if (onTransactionAdded) {
                onTransactionAdded();
            }
        } catch (error) {
            setIsError(true);
            setMessage(error.message || 'Errore durante il salvataggio della transazione');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="transaction-form" onSubmit={handleSubmit}>
            {editingTransaction && (
                <button
                    type="button"
                    onClick={onCancelEdit}
                    className="secondary-action-btn"
                >
                    Annulla modifica
                </button>
            )}

            <div className="currency-input-wrapper">
                <span className="currency-symbol">€</span>
                <input
                    className="currency-input"
                    type="text"
                    inputMode="decimal"
                    name="amount"
                    placeholder="Importo"
                    value={formData.amount}
                    onChange={handleAmountChange}
                    onBlur={handleAmountBlur}
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
                <option value="Spesa">Spesa</option>
                <option value="Cibo">Cibo</option>
                <option value="Trasporti">Trasporti</option>
                <option value="Svago">Svago</option>
                <option value="Bollette">Bollette</option>
                <option value="Shopping">Shopping</option>
                <option value="Salute">Salute</option>
                <option value="Casa">Casa</option>
                <option value="Utenze">Utenze</option>
                <option value="Altro">Altro</option>
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
                {loading
                    ? 'Salvataggio...'
                    : editingTransaction
                        ? 'Aggiorna transazione'
                        : 'Aggiungi spesa cash'}
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