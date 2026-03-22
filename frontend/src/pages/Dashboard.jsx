import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend
} from 'recharts';
import AddTransactionForm from '../components/AddTransactionForm';
import { buildApiUrl } from '../services/api';
import '../styles/Dashboard.css';

const COLORS = ['#4f46e5', '#7c3aed', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444'];

export default function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [period, setPeriod] = useState('month');
    const [monthlyBudget, setMonthlyBudget] = useState(
        Number(localStorage.getItem('monthlyBudget')) || 0
    );

    const [analytics, setAnalytics] = useState(null);
    const [transactions, setTransactions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [error, setError] = useState('');

    const [editingTransaction, setEditingTransaction] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!token) return;
        fetchAnalytics();
        fetchTransactions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, monthlyBudget]);

    async function fetchInitialData() {
        try {
            setLoading(true);
            setError('');

            await Promise.all([
                fetchUser(),
                fetchAnalytics(),
                fetchTransactions()
            ]);
        } catch (err) {
            console.error(err);
            setError('Errore durante il caricamento della dashboard');
        } finally {
            setLoading(false);
        }
    }

    async function fetchUser() {
        const response = await fetch(buildApiUrl('/api/auth/me'), {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            handleLogout();
            return;
        }

        if (!response.ok) {
            throw new Error('Errore nel recupero utente');
        }

        const data = await response.json();
        setUser(data);
    }

    async function fetchAnalytics() {
        try {
            setAnalyticsLoading(true);

            const response = await fetch(
                buildApiUrl(`/api/analytics/overview?period=${period}&budget=${monthlyBudget}`),
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.status === 401) {
                handleLogout();
                return;
            }

            if (!response.ok) {
                throw new Error('Errore nel recupero analytics');
            }

            const data = await response.json();
            setAnalytics(data);
        } catch (err) {
            console.error(err);
            setError('Errore durante il caricamento delle statistiche');
        } finally {
            setAnalyticsLoading(false);
        }
    }

    async function fetchTransactions() {
        try {
            setTransactionsLoading(true);

            const response = await fetch(
                buildApiUrl(`/api/transactions?period=${period}`),
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.status === 401) {
                handleLogout();
                return;
            }

            if (!response.ok) {
                throw new Error('Errore nel recupero transazioni');
            }

            const data = await response.json();
            setTransactions(data);
        } catch (err) {
            console.error(err);
            setError('Errore durante il caricamento delle transazioni');
        } finally {
            setTransactionsLoading(false);
        }
    }

    function handleLogout() {
        localStorage.removeItem('token');
        navigate('/login');
    }

    function handleBudgetChange(e) {
        const value = Number(e.target.value) || 0;
        setMonthlyBudget(value);
        localStorage.setItem('monthlyBudget', value.toString());
    }

    function getDateRange(period) {
        const now = new Date();

        let start;
        let end;

        if (period === 'day') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }

        if (period === 'week') {
            const currentDay = now.getDay(); // 0 = domenica, 1 = lunedì, ...
            const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;

            start = new Date(now);
            start.setDate(now.getDate() - diffToMonday);
            start.setHours(0, 0, 0, 0);

            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        }

        if (period === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        if (period === 'year') {
            start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        }

        return { start, end };
    }

    async function handleDeleteTransaction(id) {
        const confirmed = window.confirm('Vuoi davvero eliminare questa transazione?');
        if (!confirmed) return;

        try {
            const response = await fetch(buildApiUrl(`/api/transactions/${id}`), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                handleLogout();
                return;
            }

            if (!response.ok) {
                throw new Error("Errore durante l'eliminazione");
            }

            await Promise.all([fetchAnalytics(), fetchTransactions()]);
        } catch (err) {
            console.error(err);
            setError("Errore durante l'eliminazione della transazione");
        }
    }

    function handleEditTransaction(transaction) {
        setEditingTransaction(transaction);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleFormSuccess() {
        setEditingTransaction(null);
        fetchAnalytics();
        fetchTransactions();
    }

    const filteredTransactions = useMemo(() => {
        return transactions.filter((transaction) => {
            const matchesSearch =
                !searchTerm ||
                transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory =
                !selectedCategory || transaction.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [transactions, searchTerm, selectedCategory]);

    const availableCategories = useMemo(() => {
        return [...new Set(transactions.map((t) => t.category).filter(Boolean))];
    }, [transactions]);

    const categoryData = analytics?.categoryTotals || [];
    const trendData = analytics?.trend || [];

    const incomeCaptionByPeriod = {
        day: 'Totale entrate giornaliere',
        week: 'Totale entrate settimanali',
        month: 'Totale entrate mensili',
        year: 'Totale entrate annuali'
    };

    const expenseCaptionByPeriod = {
        day: 'Totale uscite giornaliere',
        week: 'Totale uscite settimanali',
        month: 'Totale uscite mensili',
        year: 'Totale uscite annuali'
    };

    const balanceCaptionByPeriod = {
        day: 'Saldo giornaliero',
        week: 'Saldo settimanale',
        month: 'Saldo mensile',
        year: 'Saldo annuale'
    };

    const forecastCaptionByPeriod = {
        day: 'Proiezione di fine giornata',
        week: 'Proiezione di fine settimana',
        month: 'Proiezione di fine mese',
        year: 'Proiezione di fine anno'
    };

    const budgetFillWidth = Math.min(analytics?.budget?.usedPercentage || 0, 100);
    const budgetStatusClass =
        !analytics?.budget?.monthlyBudget
            ? 'warning'
            : analytics.budget.exceeded
                ? 'danger'
                : analytics.budget.usedPercentage >= 80
                    ? 'warning'
                    : 'success';

    if (loading) {
        return <div className="dashboard-wrapper">Caricamento dashboard...</div>;
    }

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-header hero">
                <div className="hero-left">
                    <p className="dashboard-eyebrow">Spendara</p>

                    <h1>
                        Ciao{user?.username ? `, ${user.username}` : ''} 👋
                    </h1>

                    <p className="dashboard-subtitle">
                        Ecco una panoramica aggiornata delle tue finanze.
                    </p>

                    <div className="hero-actions">
                        <button
                            className="primary-action-btn"
                            onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
                        >
                            + Nuova transazione
                        </button>
                    </div>
                </div>

                <div className="hero-right">
                    <div className="hero-stat">
                        <span>Saldo attuale</span>
                        <strong>
                            {analytics ? `€ ${analytics.totals.balance.toFixed(2)}` : '...'}
                        </strong>
                    </div>

                    <div className="hero-stat">
                        <span>Spese periodo</span>
                        <strong>
                            {analytics ? `€ ${analytics.totals.expenses.toFixed(2)}` : '...'}
                        </strong>
                    </div>
                </div>
            </div>

            {error && <div className="dashboard-alert error">{error}</div>}

            <div className="filters-toolbar">
                <div className="filter-box">
                    <label>Periodo</label>
                    <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                        <option value="day">Giorno</option>
                        <option value="week">Settimana</option>
                        <option value="month">Mese</option>
                        <option value="year">Anno</option>
                    </select>
                </div>

                <div className="filter-box">
                    <label>Budget mensile (€)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={monthlyBudget}
                        onChange={handleBudgetChange}
                        placeholder="Inserisci budget"
                    />
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <p className="stat-label">Entrate</p>
                    <h2>
                        {analyticsLoading || !analytics
                            ? '...'
                            : `€ ${analytics.totals.income.toFixed(2)}`}
                    </h2>
                    <p className="stat-caption">{incomeCaptionByPeriod[period]}</p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Spese</p>
                    <h2>
                        {analyticsLoading || !analytics
                            ? '...'
                            : `€ ${analytics.totals.expenses.toFixed(2)}`}
                    </h2>
                    <p className="stat-caption">{expenseCaptionByPeriod[period]}</p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Saldo</p>
                    <h2>
                        {analyticsLoading || !analytics
                            ? '...'
                            : `€ ${analytics.totals.balance.toFixed(2)}`}
                    </h2>
                    <p className="stat-caption">{balanceCaptionByPeriod[period]}</p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">{forecastCaptionByPeriod[period]}</p>
                    <h2>
                        {analyticsLoading || !analytics
                            ? '...'
                            : `€ ${analytics.forecast.projectedTotal.toFixed(2)}`}
                    </h2>
                </div>
            </div>

            <div className="dashboard-top-content-grid">
                <div className="dashboard-card large-card form-card">
                    <div className="card-header">
                        <div className="card-header-stack">
                            <h3>{editingTransaction ? 'Modifica transazione' : 'Nuova transazione'}</h3>
                            <p>
                                Inserisci entrate e spese per mantenere aggiornata la dashboard.
                            </p>
                        </div>
                    </div>

                    <AddTransactionForm
                        onSuccess={handleFormSuccess}
                        editingTransaction={editingTransaction}
                        onCancelEdit={() => setEditingTransaction(null)}
                    />
                </div>

                <div className="dashboard-card large-card">
                    <div className="card-header">
                        <div className="card-header-stack">
                            <h3>Spese per categoria</h3>
                            <p>
                                {period === 'day' && 'Distribuzione delle spese di oggi'}
                                {period === 'week' && 'Distribuzione delle spese della settimana corrente'}
                                {period === 'month' && 'Distribuzione delle spese del mese corrente'}
                                {period === 'year' && "Distribuzione delle spese dell'anno corrente"}
                            </p>
                        </div>
                    </div>

                    {analyticsLoading ? (
                        <div className="empty-state">Caricamento grafico categorie...</div>
                    ) : categoryData.length === 0 ? (
                        <div className="empty-state">
                            Nessun dato disponibile.
                            <span>Aggiungi almeno una spesa per visualizzare il grafico.</span>
                        </div>
                    ) : (
                        <div className="category-chart-layout compact-category-layout">
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            dataKey="total"
                                            nameKey="category"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            label
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${entry.category}-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="category-list">
                                {categoryData.map((item, index) => {
                                    const percentage =
                                        analytics?.totals?.expenses > 0
                                            ? (item.total / analytics.totals.expenses) * 100
                                            : 0;

                                    return (
                                        <div className="category-item" key={item.category}>
                                            <div className="category-top">
                                    <span>
                                        <span
                                            className="legend-dot"
                                            style={{
                                                backgroundColor: COLORS[index % COLORS.length]
                                            }}
                                        />
                                        {item.category}
                                    </span>
                                                <span>€ {item.total.toFixed(2)}</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                />
                                            </div>
                                            <div className="progress-meta">
                                                <span>{percentage.toFixed(1)}% del totale spese</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="dashboard-card large-card">
                    <div className="card-header">
                        <div className="card-header-stack">
                            <h3>Andamento spese</h3>
                            <p>Vista aggregata per {period === 'year' ? 'mese' : 'giorno'}</p>
                        </div>
                    </div>

                    {analyticsLoading ? (
                        <div className="empty-state">Caricamento andamento spese...</div>
                    ) : trendData.length === 0 ? (
                        <div className="empty-state">
                            Nessun dato disponibile.
                            <span>Inserisci transazioni per visualizzare il trend.</span>
                        </div>
                    ) : (
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                                    <Legend />
                                    <Bar
                                        dataKey="total"
                                        name="Spese (€)"
                                        fill="#4f46e5"
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboard-secondary-grid">
                <div className="dashboard-card">
                    <div className="card-header">
                        <div className="card-header-stack">
                            <h3>Previsione</h3>
                            <p>Stima basata sulle spese registrate fino a oggi</p>
                        </div>
                    </div>

                    {analyticsLoading || !analytics ? (
                        <div className="empty-state">Caricamento previsione...</div>
                    ) : (
                        <div className="forecast-box">
                            <p>Media giornaliera delle spese</p>
                            <h2>€ {analytics.forecast.averageDailyExpense.toFixed(2)}</h2>
                            <span>
                                Se il trend corrente continua, la spesa totale prevista a fine periodo
                                sarà di <strong>€ {analytics.forecast.projectedTotal.toFixed(2)}</strong>.
                            </span>
                        </div>
                    )}
                </div>

                <div className="dashboard-card">
                    <div className="card-header">
                        <div className="card-header-stack">
                            <h3>Budget</h3>
                            <p>Monitoraggio del budget mensile impostato</p>
                        </div>
                    </div>

                    {analyticsLoading || !analytics ? (
                        <div className="empty-state">Caricamento budget...</div>
                    ) : (
                        <div className="budget-box">
                            <div className="budget-summary">
                                <div className="budget-card primary">
                                    <p>Budget mensile</p>
                                    <h3>€ {analytics.budget.monthlyBudget.toFixed(2)}</h3>
                                </div>

                                <div className="budget-card info">
                                    <p>Budget utilizzato</p>
                                    <h3>{analytics.budget.usedPercentage.toFixed(2)}%</h3>
                                </div>

                                <div className="budget-card success">
                                    <p>Budget residuo</p>
                                    <h3>€ {analytics.budget.remaining.toFixed(2)}</h3>
                                </div>
                            </div>

                            <div className="budget-progress-box">
                                <div className="budget-progress-header">
                                    <span>Utilizzo del budget</span>
                                    <span>{analytics.budget.usedPercentage.toFixed(2)}%</span>
                                </div>

                                <div className="budget-progress">
                                    <div
                                        className="budget-progress-fill"
                                        style={{ width: `${budgetFillWidth}%` }}
                                    />
                                </div>
                            </div>

                            <div className="budget-status-row">
                                <span className={`badge ${budgetStatusClass}`}>
                                    {!analytics.budget.monthlyBudget
                                        ? 'Budget non impostato'
                                        : analytics.budget.exceeded
                                            ? 'Budget superato'
                                            : analytics.budget.usedPercentage >= 80
                                                ? 'Attenzione al limite'
                                                : 'In linea con il budget'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboard-card transactions-card">
                <div className="card-header">
                    <div className="card-header-stack">
                        <h3>Transazioni</h3>
                        <p>Elenco delle transazioni registrate nel periodo selezionato</p>
                    </div>
                </div>

                <div className="table-toolbar">
                    <div className="filter-box">
                        <label>Cerca per descrizione</label>
                        <input
                            type="text"
                            placeholder="Es. supermercato"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="filter-box">
                        <label>Filtra per categoria</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">Tutte le categorie</option>
                            {availableCategories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {transactionsLoading ? (
                    <div className="empty-state">Caricamento transazioni...</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="empty-state">
                        Nessuna transazione trovata.
                        <span>Prova a cambiare i filtri oppure ad aggiungere una nuova transazione.</span>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Categoria</th>
                                <th>Descrizione</th>
                                <th>Metodo di pagamento</th>
                                <th>Importo</th>
                                <th>Azioni</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredTransactions.map((transaction) => (
                                <tr key={transaction._id}>
                                    <td>
                                        {new Date(transaction.date).toLocaleDateString('it-IT')}
                                    </td>
                                    <td>
                                        {transaction.type === 'income' ? 'Entrata' : 'Spesa'}
                                    </td>
                                    <td>{transaction.category}</td>
                                    <td>{transaction.description}</td>
                                    <td>{transaction.paymentMethod || '-'}</td>
                                    <td
                                        className={
                                            transaction.type === 'income'
                                                ? 'amount-income'
                                                : 'amount-expense'
                                        }
                                    >
                                        € {Number(transaction.amount).toFixed(2)}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleEditTransaction(transaction)}
                                            className="table-action edit"
                                        >
                                            Modifica
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDeleteTransaction(transaction._id)
                                            }
                                            className="table-action delete"
                                        >
                                            Elimina
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}