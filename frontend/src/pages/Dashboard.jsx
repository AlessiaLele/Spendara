import React, { useEffect, useMemo, useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import AddTransactionForm from '../components/AddTransactionForm';
import '../styles/Dashboard.css';

const DEFAULT_BUDGET = 1200;
const PERIOD_LABELS = {
    day: 'giorno',
    month: 'mese',
    year: 'anno'
};

const categoryIcons = {
    Cibo: '🍔',
    Trasporti: '🚗',
    Shopping: '🛒',
    Bollette: '🧾',
    Salute: '💊',
    Svago: '🎉',
    Stipendio: '💼',
    Altro: '📌'
};

const CHART_COLORS = [
    '#4F46E5',
    '#7C3AED',
    '#06B6D4',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#14B8A6',
    '#F97316',
    '#84CC16'
];

const formatCurrency = (value) => `€ ${Number(value || 0).toFixed(2)}`;

const getBudgetStorageKey = (userId) => `spendara_monthly_budget_${userId || 'guest'}`;

const getCategoryIcon = (category) => categoryIcons[category] || '📌';

const getDaysInCurrentPeriod = (period) => {
    const now = new Date();

    if (period === 'day') return 1;

    if (period === 'year') {
        const year = now.getFullYear();
        const isLeap = new Date(year, 1, 29).getMonth() === 1;
        return isLeap ? 366 : 365;
    }

    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
};

const getElapsedDaysInCurrentPeriod = (period) => {
    const now = new Date();

    if (period === 'day') return 1;

    if (period === 'year') {
        const start = new Date(now.getFullYear(), 0, 1);
        return Math.max(1, Math.floor((now - start) / 86400000) + 1);
    }

    return now.getDate();
};

const getPointLabel = (date, period) => {
    const current = new Date(date);

    if (period === 'year') {
        return current.toLocaleDateString('it-IT', { month: 'short' });
    }

    return current.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
};

const buildTrendData = (transactions, period) => {
    const expenseTransactions = transactions.filter((item) => item.type === 'expense');
    const totalsMap = new Map();

    expenseTransactions.forEach((item) => {
        const currentDate = new Date(item.date);
        const key =
            period === 'year'
                ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
                : currentDate.toISOString().split('T')[0];

        const existing = totalsMap.get(key) || { total: 0, date: currentDate };
        existing.total += Number(item.amount || 0);
        totalsMap.set(key, existing);
    });

    return Array.from(totalsMap.entries())
        .map(([key, value]) => ({
            key,
            label: getPointLabel(value.date, period),
            total: value.total,
            date: value.date
        }))
        .sort((a, b) => a.date - b.date);
};

const buildPolyline = (trendData) => {
    if (!trendData.length) return '';

    const width = 100;
    const height = 100;
    const maxValue = Math.max(...trendData.map((item) => item.total), 1);

    return trendData
        .map((item, index) => {
            const x = trendData.length === 1 ? 50 : (index / (trendData.length - 1)) * width;
            const y = height - (item.total / maxValue) * 82 - 9;
            return `${x},${Math.max(6, Math.min(94, y))}`;
        })
        .join(' ');
};

function Dashboard() {
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [period, setPeriod] = useState('month');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [budgetInput, setBudgetInput] = useState(String(DEFAULT_BUDGET));
    const [savedBudget, setSavedBudget] = useState(DEFAULT_BUDGET);

    const filteredTransactions = useMemo(() => {
        return transactions.filter((item) => {
            const description = item.description || '';
            const matchesSearch = description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [transactions, searchTerm, selectedCategory]);

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

            const budgetKey = getBudgetStorageKey(profileData.id || profileData._id);
            const persistedBudget = Number(localStorage.getItem(budgetKey) || DEFAULT_BUDGET);
            setSavedBudget(persistedBudget);
            setBudgetInput(String(persistedBudget));

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

        if (!window.confirm('Vuoi davvero eliminare questa transazione?')) {
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

    const expenseTransactions = useMemo(
        () => transactions.filter((item) => item.type === 'expense'),
        [transactions]
    );

    const totalExpenses = useMemo(() => {
        return expenseTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }, [expenseTransactions]);

    const totalIncome = useMemo(() => {
        return transactions
            .filter((item) => item.type === 'income')
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }, [transactions]);

    const balance = totalIncome - totalExpenses;
    const elapsedDays = getElapsedDaysInCurrentPeriod(period);
    const totalDays = getDaysInCurrentPeriod(period);
    const averageDailyExpense = totalExpenses / elapsedDays;
    const projectedTotal = averageDailyExpense * totalDays;
    const budgetUsedPercentage =
        savedBudget > 0 ? Math.min((totalExpenses / savedBudget) * 100, 999) : 0;
    const budgetRemaining = savedBudget - totalExpenses;

    const categoryTotals = useMemo(() => {
        const totals = {};

        expenseTransactions.forEach((item) => {
            const category = item.category || 'Altro';
            totals[category] = (totals[category] || 0) + Number(item.amount || 0);
        });

        return Object.entries(totals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [expenseTransactions]);

    const pieChartData = useMemo(() => {
        return categoryTotals.map((item) => ({
            name: item.name,
            value: Number(item.value.toFixed(2))
        }));
    }, [categoryTotals]);

    const trendData = useMemo(() => buildTrendData(transactions, period), [transactions, period]);
    const trendPolyline = useMemo(() => buildPolyline(trendData), [trendData]);

    const uniqueCategories = useMemo(
        () => Array.from(new Set(transactions.map((item) => item.category).filter(Boolean))).sort(),
        [transactions]
    );

    const categorySuggestions = useMemo(() => {
        return categoryTotals.slice(0, 5).map((item) => {
            const share = totalExpenses > 0 ? item.value / totalExpenses : 0;
            const suggestedBudget = savedBudget * share;
            const projectedCategoryExpense = projectedTotal * share;
            const isOverSuggested = item.value > suggestedBudget && suggestedBudget > 0;

            return {
                ...item,
                share,
                suggestedBudget,
                projectedCategoryExpense,
                isOverSuggested
            };
        });
    }, [categoryTotals, totalExpenses, savedBudget, projectedTotal]);

    const budgetAlerts = useMemo(() => {
        const alerts = [];

        if (savedBudget > 0 && totalExpenses > savedBudget) {
            alerts.push(
                `Hai già superato il budget del ${
                    period === 'day' ? 'giorno' : PERIOD_LABELS[period]
                } di ${formatCurrency(totalExpenses - savedBudget)}.`
            );
        } else if (savedBudget > 0 && projectedTotal > savedBudget) {
            alerts.push(
                `Con l'andamento attuale chiuderai il ${
                    PERIOD_LABELS[period]
                } sopra budget di circa ${formatCurrency(projectedTotal - savedBudget)}.`
            );
        }

        categorySuggestions.forEach((item) => {
            if (item.isOverSuggested) {
                alerts.push(
                    `La categoria ${item.name} sta consumando più del budget suggerito (${formatCurrency(
                        item.value
                    )} su ${formatCurrency(item.suggestedBudget)}).`
                );
            }
        });

        return alerts.slice(0, 4);
    }, [savedBudget, totalExpenses, projectedTotal, period, categorySuggestions]);

    const estimatedNextMonth = (totalExpenses * 1.1).toFixed(2);

    const saveBudget = () => {
        const normalized = Number(String(budgetInput).replace(',', '.'));

        if (Number.isNaN(normalized) || normalized <= 0) {
            setMessage('Inserisci un budget mensile valido');
            return;
        }

        const budgetKey = getBudgetStorageKey(user?.id || user?._id);
        localStorage.setItem(budgetKey, String(normalized));
        setSavedBudget(normalized);
        setMessage('Budget salvato con successo');
    };

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

                <section className="dashboard-card large-card">
                    <div className="card-header">
                        <h3>Spese per categoria</h3>
                        <span>Distribuzione</span>
                    </div>

                    {categoryTotals.length === 0 ? (
                        <div className="empty-state">Nessuna categoria disponibile.</div>
                    ) : (
                        <div className="category-chart-layout">
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={320}>
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            innerRadius={45}
                                            paddingAngle={2}
                                            label={({ name, percent }) =>
                                                `${name} ${(percent * 100).toFixed(0)}%`
                                            }
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${entry.name}-${index}`}
                                                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="category-list">
                                {categoryTotals.map((category, index) => {
                                    const percentage =
                                        totalExpenses > 0 ? (category.value / totalExpenses) * 100 : 0;

                                    return (
                                        <div key={category.name} className="category-item">
                                            <div className="category-top">
                                <span>
                                    <span
                                        className="legend-dot"
                                        style={{
                                            backgroundColor:
                                                CHART_COLORS[index % CHART_COLORS.length]
                                        }}
                                    />
                                    {getCategoryIcon(category.name)} {category.name}
                                </span>
                                                <strong>{formatCurrency(category.value)}</strong>
                                            </div>

                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>

                                            <div className="progress-meta">
                                                <span>{percentage.toFixed(1)}% del totale</span>
                                                <span>{formatCurrency(category.value)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
                            {budgetAlerts.map((alert) => (
                                <div key={alert} className="dashboard-alert warning">
                                    {alert}
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

                {filteredTransactions.length === 0 ? (
                    <div className="empty-state">Non ci sono ancora transazioni.
                        <span>Inserisci la prima spesa o entrata per iniziare.</span>
                    </div>
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
                            {filteredTransactions.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.description}</td>
                                    <td>{getCategoryIcon(item.category)} {item.category}</td>
                                    <td>{new Date(item.date).toLocaleDateString()}</td>
                                    <td>{item.paymentMethod || '-'}</td>
                                    <td className={item.type === 'income' ? 'amount-income' : 'amount-expense'}>
                                        {item.type === 'income' ? '+' : '-'} € {Number(item.amount).toFixed(2)}
                                    </td>
                                    <td>
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