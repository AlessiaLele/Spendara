import { useState } from 'react';

export default function BudgetForm({ onSaved }) {
    const [totalBudget, setTotalBudget] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');

        const res = await fetch('/api/budgets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                totalBudget: Number(totalBudget),
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || 'Errore nel salvataggio budget');
            return;
        }

        setTotalBudget('');
        onSaved?.(data.budget);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <input
                type="number"
                min="0"
                step="0.01"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="Budget mensile"
                className="w-full rounded-lg border p-2"
            />
            <button type="submit" className="rounded-lg px-4 py-2">
                Salva budget
            </button>
        </form>
    );
}