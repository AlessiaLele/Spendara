import { useState } from 'react';

function BudgetForm({ onBudgetCreated }) {
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState('monthly');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!category || !amount) {
            setMessage('Compila tutti i campi');
            return;
        }

        try {
            setLoading(true);
            setMessage('');

            const token = localStorage.getItem('token');

            const response = await fetch('/api/budgets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    category,
                    amount: Number(amount),
                    period
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Errore nel salvataggio del budget');
            }

            setCategory('');
            setAmount('');
            setPeriod('monthly');
            setMessage('Budget salvato con successo');

            if (onBudgetCreated) {
                onBudgetCreated();
            }
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'Errore nel salvataggio del budget');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="cash-transaction-card">
            <h3 className="cash-transaction-title">Imposta budget</h3>

            <form className="cash-transaction-form" onSubmit={handleSubmit}>
                <div className="cash-transaction-field">
                    <label>Categoria</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Es. Food"
                    />
                </div>

                <div className="cash-transaction-field">
                    <label>Importo</label>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                    />
                </div>

                <div className="cash-transaction-field">
                    <label>Periodo</label>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option value="monthly">Mensile</option>
                        <option value="weekly">Settimanale</option>
                        <option value="yearly">Annuale</option>
                    </select>
                </div>

                <button
                    type="submit"
                    className="cash-transaction-button"
                    disabled={loading}
                >
                    {loading ? 'Salvataggio...' : 'Salva budget'}
                </button>

                {message && (
                    <p className="cash-transaction-message">
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
}

export default BudgetForm;