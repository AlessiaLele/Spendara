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
    const [isError, setIsError] = useState(false);

    const currentDate = useMemo(() => new Date(), []);
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    const budgetCategories = useMemo(() => {
        const nonBudgetable = new Set([
            'stipendio', 'salary', 'entrate', 'income',
            'rimborso', 'refund', 'altre entrate', 'cashback', 'bonus'
        ]);
        return (availableCategories || []).filter((cat) => {
            const normalized = String(cat).trim().toLowerCase();
            return !nonBudgetable.has(normalized);
        });
    }, [availableCategories]);

    const handleAmountChange = (e) => {
        const rawValue = e.target.value.replace(/\s/g, '').replace(',', '.');
        if (rawValue === '' || /^\d+(\.\d{0,2})?$/.test(rawValue)) {
            setAmount(rawValue);
        }
    };

    const handleAmountBlur = () => {
        if (!amount) return;
        const numericValue = Number(amount);
        if (!Number.isFinite(numericValue) || numericValue <= 0) return;
        setAmount(numericValue.toFixed(2));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            setIsError(true);
            setMessage('Token mancante. Effettua il login.');
            return;
        }

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setIsError(true);
            setMessage('Inserisci un importo valido maggiore di 0.');
            return;
        }

        try {
            setLoading(true);
            setMessage('');
            setIsError(false);

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
                    warningThreshold: 0.8,
                    criticalThreshold: 0.95,
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Errore nel salvataggio del budget');

            setMessage(
                category === 'all'
                    ? 'Budget su tutte le categorie salvato con successo.'
                    : `Budget per "${category}" salvato con successo.`
            );
            setIsError(false);
            setAmount('');
            setCategory('all');

            if (typeof onBudgetSaved === 'function') {
                onBudgetSaved(data.budget);
            }
        } catch (err) {
            setIsError(true);
            setMessage(err.message || 'Errore nel salvataggio del budget.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="transaction-form" onSubmit={handleSubmit}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Importo mensile
                </label>
                <div className="currency-input-wrapper">
                    <span className="currency-symbol">€</span>
                    <input
                        className="currency-input"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={amount}
                        onChange={handleAmountChange}
                        onBlur={handleAmountBlur}
                        required
                    />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Categoria
                </label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="all">Tutte le categorie</option>
                    {budgetCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            <button
                type="submit"
                className="primary-action-btn"
                disabled={loading}
                style={{ marginTop: 4 }}
            >
                {loading ? 'Salvataggio...' : 'Salva budget'}
            </button>

            {message && (
                <p className={`form-message ${isError ? 'amount-expense' : 'amount-income'}`}>
                    {message}
                </p>
            )}
        </form>
    );
}