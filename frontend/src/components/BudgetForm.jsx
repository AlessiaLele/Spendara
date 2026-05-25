import { useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function BudgetForm({
                                       onBudgetSaved,
                                       availableCategories = []
                                   }) {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('all');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [warningThreshold, setWarningThreshold] = useState('0.8');
    const [criticalThreshold, setCriticalThreshold] = useState('0.95');
    const currentDate = useMemo(() => new Date(), []);
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    const budgetCategories = useMemo(() => {
        const nonBudgetable = new Set([
            'stipendio',
            'salary',
            'entrate',
            'income',
            'rimborso',
            'refund',
            'altre entrate',
            'cashback',
            'bonus'
        ]);
        return (availableCategories || []).filter((cat) => {
            const normalized = String(cat).trim().toLowerCase();
            return !nonBudgetable.has(normalized);
        });
    }, [availableCategories]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Token mancante. Effettua il login.');
            return;
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount < 0) {
            setError('Inserisci un importo valido.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setMessage('');

            const response = await fetch(`${API_BASE_URL}/api/budgets`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: numericAmount,
                    category,
                    month,
                    year,
                    warningThreshold: Number(warningThreshold),
                    criticalThreshold: Number(criticalThreshold),
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Errore nel salvataggio del budget');
            }

            setMessage(
                category === 'all'
                    ? 'Budget su tutte le categorie salvato con successo.'
                    : `Budget per ${category} salvato con successo.`
            );

            setAmount('');
            setCategory('all');

            if (typeof onBudgetSaved === 'function') {
                onBudgetSaved(data.budget);
            }
        } catch (err) {
            setError(err.message || 'Errore nel salvataggio del budget');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="cash-transaction-form" onSubmit={handleSubmit}>
            <div className="cash-transaction-field">
                <label htmlFor="budget-amount">Importo</label>
                <div className="currency-input-wrapper">
                    <span className="currency-symbol">€</span>
                    <input
                        id="budget-amount"
                        className="currency-input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Importo"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="cash-transaction-field">
                <label htmlFor="budget-category">Categoria</label>
                <select
                    id="budget-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="all">Tutte le categorie</option>
                    {budgetCategories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>

            <button type="submit" className="cash-transaction-button" disabled={loading}>
                {loading ? 'Salvataggio...' : 'Salva budget'}
            </button>

            {message && <div className="cash-transaction-message">{message}</div>}
            {error && <div className="cash-transaction-message" style={{ color: '#b91c1c' }}>{error}</div>}
        </form>
    );
}