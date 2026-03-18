import React, { useState } from 'react';
import '../styles/Dashboard.css';

function AddTransactionForm({ onTransactionAdded }) {
    const [formData, setFormData] = useState({
        type: 'expense',
        amount: '',
        date: '',
        category: '',
        description: '',
        paymentMethod: ''
    });

    const [message, setMessage] = useState('');

    const handleAmountChange = (value) => {
        let cleanedValue = value.replace(/[^0-9.,]/g, '');

        const hasComma = cleanedValue.includes(',');
        const hasDot = cleanedValue.includes('.');

        // Non permettere virgola e punto insieme
        if (hasComma && hasDot) {
            return formData.amount;
        }

        // Permetti un solo separatore decimale
        const separator = hasComma ? ',' : hasDot ? '.' : null;

        if (separator) {
            const parts = cleanedValue.split(separator);

            // Blocca più di un separatore
            if (parts.length > 2) {
                return formData.amount;
            }

            const integerPart = parts[0];
            const decimalPart = parts[1] ?? '';

            // Massimo 2 decimali
            cleanedValue = `${integerPart}${separator}${decimalPart.slice(0, 2)}`;
        }

        return cleanedValue;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'amount') {
            const validatedAmount = handleAmountChange(value);

            setFormData({
                ...formData,
                amount: validatedAmount
            });
            return;
        }

        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');

        const normalizedAmountString = formData.amount.replace(',', '.');
        const normalizedAmount = Number(parseFloat(normalizedAmountString).toFixed(2));

        if (!formData.amount || isNaN(normalizedAmount) || normalizedAmount <= 0) {
            setMessage('Inserisci un importo valido');
            return;
        }

        if (!formData.date || !formData.category || !formData.description) {
            setMessage('Compila tutti i campi obbligatori');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    amount: normalizedAmount
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || 'Errore nell’inserimento');
                return;
            }

            setMessage('Spesa aggiunta con successo');

            setFormData({
                type: 'expense',
                amount: '',
                date: '',
                category: '',
                description: '',
                paymentMethod: ''
            });

            onTransactionAdded();
        } catch (error) {
            console.error(error);
            setMessage('Errore di connessione al server');
        }
    };

    return (
        <section className="dashboard-card">
            <div className="card-header">
                <h3>Aggiungi spesa</h3>
                <span>Nuova transazione</span>
            </div>

            <form className="transaction-form" onSubmit={handleSubmit}>
                <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                >
                    <option value="expense">Spesa</option>
                    <option value="income">Entrata</option>
                </select>
                <div className="currency-input-wrapper">
                    <span className="currency-symbol">€</span>
                    <input
                        type="text"
                        name="amount"
                        placeholder="0,00"
                        value={formData.amount}
                        onChange={handleChange}
                        inputMode="decimal"
                        className="currency-input"
                    />
                </div>

                <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                />

                <input
                    type="text"
                    name="category"
                    placeholder="Categoria"
                    value={formData.category}
                    onChange={handleChange}
                />

                <input
                    type="text"
                    name="description"
                    placeholder="Descrizione"
                    value={formData.description}
                    onChange={handleChange}
                />

                <input
                    type="text"
                    name="paymentMethod"
                    placeholder="Metodo di pagamento (opzionale)"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                />

                <button type="submit" className="primary-action-btn">
                    Salva transazione
                </button>
            </form>

            {message && <p className="form-message">{message}</p>}
        </section>
    );
}

export default AddTransactionForm;