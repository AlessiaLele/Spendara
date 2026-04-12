import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { getBankConnectionStatus } from '../api/tinkApi';
import { getDashboardData } from '../api/dashboardApi';
import { deleteTransaction } from '../api/transactionApi';
import AddCashTransactionForm from '../components/AddCashTransactionForm';
import TransactionsList from '../components/TransactionsList';
import '../styles/Dashboard.css';

const COLORS = ['#4f46e5', '#7c3aed', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444'];

function DashboardPage() {
    const navigate = useNavigate();

    const [dashboardData, setDashboardData] = useState(null);
    const [allTransactions, setAllTransactions] = useState([]);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('monthly');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = async (period = selectedPeriod) => {
        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('token');

            if (!token) {
                navigate('/login');
                return;
            }

            const connectionStatus = await getBankConnectionStatus(token);

            if (!connectionStatus.isConnected) {
                navigate('/connect-bank');
                return;
            }

            const dashboardResponse = await getDashboardData(token, period);

            setDashboardData(dashboardResponse);
            setAllTransactions(dashboardResponse.allTransactions || []);
        } catch (err) {
            console.error('ERRORE DASHBOARD:', err);
            setError(err.message || 'Errore nel caricamento della dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard(selectedPeriod);
    }, [selectedPeriod]);

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    };

    const formatPeriodLabel = (period) => {
        switch (period) {
            case 'daily':
                return 'giornaliero';
            case 'weekly':
                return 'settimanale';
            case 'monthly':
                return 'mensile';
            case 'yearly':
                return 'annuale';
            default:
                return 'mensile';
        }
    };

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteTransaction = async (transactionId) => {
        const confirmed = window.confirm('Vuoi davvero eliminare questa transazione?');
        if (!confirmed) {
            return;
        }

        try {
            const token = localStorage.getItem('token');

            if (!token) {
                navigate('/login');
                return;
            }

            await deleteTransaction(token, transactionId);

            if (editingTransaction?._id === transactionId) {
                setEditingTransaction(null);
            }

            await loadDashboard(selectedPeriod);
        } catch (err) {
            console.error('ERRORE DELETE TRANSACTION:', err);
            setError(err.message || 'Errore durante l’eliminazione della transazione');
        }
    };

    const handleFormSuccess = async () => {
        setEditingTransaction(null);
        await loadDashboard(selectedPeriod);
    };

    if (loading) {
        return (
            <div className="dashboard-wrapper">
                <div className="dashboard-alert warning">
                    Caricamento dashboard in corso...
                </div>
            </div>
        );
    }

    const summary = dashboardData?.summary || {
        totalTransactions: 0,
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0
    };

    const categories = dashboardData?.categories || [];
    const monthlyTrend = dashboardData?.monthlyTrend || [];
    const topExpenses = dashboardData?.topExpenses || [];

    const forecast = dashboardData?.forecast || {
        currentBalance: 0,
        averageDailyExpenses: 0,
        projectedRemainingExpenses: 0,
        predictedEndBalance: 0,
        daysRemaining: 0,
        activeExpenseDays: 0,
        confidence: 'bassa'
    };

    const pieData = categories.map((category) => ({
        name: category.name,
        value: category.value
    }));

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-header hero">
                <div className="hero-left">
                    <p className="dashboard-eyebrow">Panoramica finanziaria</p>
                    <h1>La tua dashboard</h1>
                    <p className="dashboard-subtitle">
                        Monitora le transazioni importate dal conto collegato e completa
                        il quadro aggiungendo anche le spese in contanti.
                    </p>

                    <div className="hero-actions">
                        <button
                            className="primary-action-btn"
                            onClick={() => navigate('/connect-bank')}
                        >
                            Gestisci collegamento conto
                        </button>

                        <div className="period-dropdown-wrap">
                            <label htmlFor="period-select" className="period-label">
                                Periodo
                            </label>
                            <select
                                id="period-select"
                                className="period-select"
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                            >
                                <option value="daily">Giornaliero</option>
                                <option value="weekly">Settimanale</option>
                                <option value="monthly">Mensile</option>
                                <option value="yearly">Annuale</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="hero-right">
                    <div className="hero-stat">
                        <span>Transazioni totali ({formatPeriodLabel(selectedPeriod)})</span>
                        <strong>{summary.totalTransactions}</strong>
                    </div>

                    <div className="hero-stat">
                        <span>Previsione fine mese</span>
                        <strong>{formatAmount(forecast.predictedEndBalance)}</strong>
                    </div>
                </div>
            </div>

            {error && <div className="dashboard-alert error">{error}</div>}

            <div className="stats-grid">
                <div className="stat-card">
                    <p className="stat-label">Previsione mese</p>
                    <h2>{formatAmount(forecast.predictedEndBalance)}</h2>
                    <p className="stat-caption">
                        Media uscite: {formatAmount(forecast.averageDailyExpenses)}/giorno ·
                        Mancano {forecast.daysRemaining} giorni ·
                        Affidabilità {forecast.confidence}
                    </p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Totale uscite</p>
                    <h2>{formatAmount(summary.totalExpenses)}</h2>
                    <p className="stat-caption">Filtrate per periodo selezionato</p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Numero transazioni</p>
                    <h2>{summary.totalTransactions}</h2>
                    <p className="stat-caption">Solo periodo selezionato</p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Saldo</p>
                    <h2>{formatAmount(summary.balance)}</h2>
                    <p className="stat-caption">Entrate meno uscite nel periodo</p>
                </div>
            </div>

            <div className="dashboard-card forecast-card">
                <div className="card-header">
                    <h3>Come viene calcolata la previsione</h3>
                    <span>Prima versione del motore previsionale</span>
                </div>

                <div className="category-list">
                    <div className="category-item">
                        <div className="category-top">
                            <span>Saldo corrente del mese</span>
                            <span>{formatAmount(forecast.currentBalance)}</span>
                        </div>
                    </div>

                    <div className="category-item">
                        <div className="category-top">
                            <span>Media uscite giornaliere</span>
                            <span>{formatAmount(forecast.averageDailyExpenses)}</span>
                        </div>
                    </div>

                    <div className="category-item">
                        <div className="category-top">
                            <span>Uscite stimate rimanenti</span>
                            <span>{formatAmount(forecast.projectedRemainingExpenses)}</span>
                        </div>
                    </div>

                    <div className="category-item">
                        <div className="category-top">
                            <span>Previsione fine mese</span>
                            <span>{formatAmount(forecast.predictedEndBalance)}</span>
                        </div>
                        <div className="progress-meta">
                            <span>Giorni rimanenti: {forecast.daysRemaining}</span>
                            <span>Affidabilità: {forecast.confidence}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="dashboard-main-grid-70-30"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '70% 30%',
                    gap: '24px',
                    alignItems: 'stretch'
                }}
            >
                <div
                    className="dashboard-card large-card"
                    style={{ width: '100%', minWidth: 0 }}
                >
                    <div className="card-header">
                        <h3>Spese per categoria</h3>
                        <span>Distribuzione nel periodo selezionato</span>
                    </div>

                    {pieData.length === 0 ? (
                        <div className="empty-state">
                            Nessun dato disponibile.
                            <span>Non ci sono spese nel periodo selezionato.</span>
                        </div>
                    ) : (
                        <div className="category-chart-layout compact-category-layout">
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={95}
                                            label
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${entry.name}-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatAmount(value)} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="category-list">
                                {categories.map((category, index) => {
                                    const percentage =
                                        summary.totalExpenses > 0
                                            ? (category.value / summary.totalExpenses) * 100
                                            : 0;

                                    return (
                                        <div className="category-item" key={category.name}>
                                            <div className="category-top">
                                                <span>
                                                    <span
                                                        className="legend-dot"
                                                        style={{
                                                            backgroundColor: COLORS[index % COLORS.length]
                                                        }}
                                                    />
                                                    {category.name}
                                                </span>
                                                <span>{formatAmount(category.value)}</span>
                                            </div>

                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${Math.min(percentage, 100)}%`
                                                    }}
                                                />
                                            </div>

                                            <div className="progress-meta">
                                                <span>{percentage.toFixed(1)}% del totale uscite</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="dashboard-card form-card">
                    <div className="card-header">
                        <h3>{editingTransaction ? 'Modifica spesa cash' : 'Aggiungi spesa cash'}</h3>
                        <span>
                            {editingTransaction
                                ? 'Aggiorna la transazione selezionata'
                                : 'Completa le uscite non tracciate dal conto'}
                        </span>
                    </div>

                    <AddCashTransactionForm
                        onTransactionAdded={handleFormSuccess}
                        editingTransaction={editingTransaction}
                        onCancelEdit={() => setEditingTransaction(null)}
                    />
                </div>
            </div>

            <div className="dashboard-main-grid">
                <div className="dashboard-card large-card">
                    <div className="card-header">
                        <h3>Trend periodo</h3>
                        <span>Aggiornato in base al filtro selezionato</span>
                    </div>

                    {monthlyTrend.length === 0 ? (
                        <div className="empty-state">
                            Nessun trend disponibile.
                        </div>
                    ) : (
                        <div className="category-list">
                            {monthlyTrend.map((item) => (
                                <div key={item.month} className="category-item">
                                    <div className="category-top">
                                        <span>{item.month}</span>
                                        <span>{formatAmount(item.net)}</span>
                                    </div>

                                    <div className="progress-meta">
                                        <span>Entrate: {formatAmount(item.income)}</span>
                                        <span>Uscite: {formatAmount(item.expenses)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dashboard-card form-card">
                    <div className="card-header">
                        <h3>Top spese</h3>
                        <span>Solo nel periodo selezionato</span>
                    </div>

                    {topExpenses.length === 0 ? (
                        <div className="empty-state">
                            Nessuna spesa disponibile.
                        </div>
                    ) : (
                        <div className="category-list">
                            {topExpenses.map((transaction) => (
                                <div
                                    key={transaction._id || transaction.externalTransactionId}
                                    className="category-item"
                                >
                                    <div className="category-top">
                                        <span>{transaction.description || 'Senza descrizione'}</span>
                                        <span>{formatAmount(Math.abs(transaction.amount))}</span>
                                    </div>

                                    <div className="progress-meta">
                                        <span>{transaction.category || 'Uncategorized'}</span>
                                        <span>{new Date(transaction.date).toLocaleDateString('it-IT')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboard-card transactions-card">
                <div className="card-header">
                    <h3>Tutte le transazioni del periodo</h3>
                    <span>Le transazioni cash possono essere modificate o eliminate</span>
                </div>

                <TransactionsList
                    transactions={allTransactions}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                />
            </div>
        </div>
    );
}

export default DashboardPage;