import React, { useEffect, useMemo, useState } from 'react';
import AddTransactionForm from '../components/AddTransactionForm';
import '../styles/Dashboard.css';

function Dashboard() {
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [period, setPeriod] = useState('month');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const fetchDashboardData = async () => {
        const token = localStorage.getItem('token');

        try {
            setLoading(true);

            const profileResponse = await fetch('http://localhost:5000/api/auth/me', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const profileData = await profileResponse.json();

            if (!profileResponse.ok) {
                setMessage(profileData.message || 'Errore nel recupero profilo');
                setLoading(false);
                return;
            }

            setUser(profileData);

            const transactionsResponse = await fetch(
                `http://localhost:5000/api/transactions?period=${period}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const transactionsData = await transactionsResponse.json();

            if (!transactionsResponse.ok) {
                setMessage(transactionsData.message || 'Errore nel recupero transazioni');
                setTransactions([]);
                setLoading(false);
                return;
            }

            setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
            setMessage('');
        } catch (error) {
            console.error(error);
            setMessage('Errore nel recupero della dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const token = localStorage.getItem('token');

        const confirmed = window.confirm('Vuoi davvero eliminare questa transazione?');

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/transactions/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || 'Errore nella cancellazione');
                return;
            }

            fetchDashboardData();
        } catch (error) {
            console.error(error);
            setMessage('Errore di connessione al server');
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [period]);

    const totalExpenses = useMemo(() => {
        return transactions
            .filter((item) => item.type === 'expense')
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }, [transactions]);

    const totalIncome = useMemo(() => {
        return transactions
            .filter((item) => item.type === 'income')
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }, [transactions]);

    const balance = totalIncome - totalExpenses;

    const categoryTotals = useMemo(() => {
        const totals = {};

        transactions.forEach((item) => {
            const category = item.category || 'Altro';
            totals[category] = (totals[category] || 0) + Number(item.amount || 0);
        });

        return Object.entries(totals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    const estimatedNextMonth = (totalExpenses * 1.1).toFixed(2);
    const budgetAlerts = categoryTotals.filter((item) => item.value > 300);

    if (loading) {
        return <div className="dashboard-wrapper">Caricamento dashboard...</div>;
    }

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-header">
                <div>
                    <p className="dashboard-eyebrow">Dashboard finanziaria</p>
                    <h1>Ciao{user?.username ? `, ${user.username}` : ''} 👋</h1>
                    <p className="dashboard-subtitle">
                        Monitora spese, categorie e andamento del tuo budget.
                    </p>
                </div>

                <div className="filter-box">
                    <label htmlFor="period">Periodo</label>
                    <select
                        id="period"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option value="day">Giorno</option>
                        <option value="month">Mese</option>
                        <option value="year">Anno</option>
                    </select>
                </div>
            </div>

            {message && <div className="dashboard-alert error">{message}</div>}

            <div className="stats-grid">
                <div className="stat-card">
                    <p className="stat-label">Saldo attuale</p>
                    <h2>€ {balance.toFixed(2)}</h2>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Entrate</p>
                    <h2>€ {totalIncome.toFixed(2)}</h2>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Uscite</p>
                    <h2>€ {totalExpenses.toFixed(2)}</h2>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Transazioni</p>
                    <h2>{transactions.length}</h2>
                </div>
            </div>

            <div className="dashboard-main-grid">
                <AddTransactionForm
                    onTransactionAdded={fetchDashboardData}
                    editingTransaction={editingTransaction}
                    onEditFinished={() => setEditingTransaction(null)}
                />

                <section className="dashboard-card">
                    <div className="card-header">
                        <h3>Spese per categoria</h3>
                        <span>Distribuzione</span>
                    </div>

                    {categoryTotals.length === 0 ? (
                        <div className="empty-state">Nessuna categoria disponibile.</div>
                    ) : (
                        <div className="category-list">
                            {categoryTotals.map((category) => {
                                const percentage = totalExpenses > 0
                                    ? (category.value / totalExpenses) * 100
                                    : 0;

                                return (
                                    <div key={category.name} className="category-item">
                                        <div className="category-top">
                                            <span>{category.name}</span>
                                            <strong>€ {category.value.toFixed(2)}</strong>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="dashboard-card">
                    <div className="card-header">
                        <h3>Previsione spese</h3>
                        <span>Stima</span>
                    </div>

                    <div className="forecast-box">
                        <p>Periodo successivo</p>
                        <h2>€ {estimatedNextMonth}</h2>
                        <span>Stima iniziale calcolata sulla base delle spese correnti.</span>
                    </div>
                </section>

                <section className="dashboard-card">
                    <div className="card-header">
                        <h3>Budget e avvisi</h3>
                        <span>Soglie</span>
                    </div>

                    {budgetAlerts.length === 0 ? (
                        <div className="dashboard-alert success">
                            Nessuna categoria ha superato la soglia di € 300.
                        </div>
                    ) : (
                        <div className="alerts-list">
                            {budgetAlerts.map((item) => (
                                <div key={item.name} className="dashboard-alert warning">
                                    La categoria <strong>{item.name}</strong> ha superato € 300
                                    con un totale di € {item.value.toFixed(2)}.
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <section className="dashboard-card transactions-card">
                <div className="card-header">
                    <h3>Transazioni recenti</h3>
                    <span>Elenco movimenti</span>
                </div>

                {transactions.length === 0 ? (
                    <div className="empty-state">Non ci sono ancora transazioni.</div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                            <tr>
                                <th>Descrizione</th>
                                <th>Categoria</th>
                                <th>Data</th>
                                <th>Metodo</th>
                                <th>Importo</th>
                                <th>Azioni</th>
                            </tr>
                            </thead>
                            <tbody>
                            {transactions.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.description}</td>
                                    <td>{item.category}</td>
                                    <td>{new Date(item.date).toLocaleDateString()}</td>
                                    <td>{item.paymentMethod || '-'}</td>
                                    <td>€ {Number(item.amount).toFixed(2)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="table-action edit"
                                                onClick={() => setEditingTransaction(item)}
                                            >
                                                Modifica
                                            </button>

                                            <button
                                                className="table-action delete"
                                                onClick={() => handleDelete(item._id)}
                                            >
                                                Elimina
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default Dashboard;