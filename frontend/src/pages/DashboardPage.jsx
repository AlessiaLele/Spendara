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

import { getBankConnectionStatus, syncTransactions } from '../api/tinkApi';
import { getDashboardData } from '../api/dashboardApi';
import { deleteTransaction } from '../api/transactionApi';
import AddCashTransactionForm from '../components/AddCashTransactionForm';
import TransactionsList from '../components/TransactionsList';
import BudgetForm from '../components/BudgetForm';

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
    const [selectedCategory, setSelectedCategory] = useState('all');

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(Number(amount || 0));
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

    const getConfidenceLabel = (confidence) => {
        switch (confidence) {
            case 'alta':
                return 'Alta';
            case 'media':
                return 'Media';
            case 'bassa':
            default:
                return 'Bassa';
        }
    };

    const loadDashboard = async (period = selectedPeriod, category = selectedCategory) => {
        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const connectionStatus = await getBankConnectionStatus(token);
            if (!connectionStatus?.isConnected) {
                navigate('/connect-bank');
                return;
            }

            await syncTransactions(token);
            const data = await getDashboardData(token, period, category);

            setDashboardData(data);
            setAllTransactions(data.periodTransactions || []);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Errore dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard(selectedPeriod, selectedCategory);
    }, [selectedPeriod, selectedCategory]);

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteTransaction = async (transactionId) => {
        const confirmed = window.confirm('Vuoi davvero eliminare questa transazione?');
        if (!confirmed) return;

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

            await loadDashboard(selectedPeriod, selectedCategory);
        } catch (err) {
            console.error('ERRORE DELETE TRANSACTION:', err);
            setError(err.message || 'Errore durante l’eliminazione della transazione');
        }
    };

    const handleFormSuccess = async () => {
        setEditingTransaction(null);
        await loadDashboard(selectedPeriod, selectedCategory);
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
    const trend = dashboardData?.trend || [];
    const topExpenses = dashboardData?.topExpenses || [];

    const getPeriodLabel = (period) => {
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

    const forecast = {
        currentBalance: dashboardData?.forecast?.currentBalance ?? 0,
        remainingRecurringIncome: dashboardData?.forecast?.remainingRecurringIncome ?? 0,
        remainingRecurringExpenses: dashboardData?.forecast?.remainingRecurringExpenses ?? 0,
        averageDailyVariableExpenses:
            dashboardData?.forecast?.averageDailyVariableExpenses ?? 0,
        projectedVariableExpenses:
            dashboardData?.forecast?.projectedVariableExpenses ?? 0,
        predictedEndBalance: dashboardData?.forecast?.predictedEndBalance ?? 0,
        daysRemaining: dashboardData?.forecast?.daysRemaining ?? 0,
        activeExpenseDays: dashboardData?.forecast?.activeExpenseDays ?? 0,
        confidence: dashboardData?.forecast?.confidence ?? 'bassa',
        recurringSummary: {
            detectedSeries:
                dashboardData?.forecast?.recurringSummary?.detectedSeries ?? 0,
            futureIncomeItems:
                dashboardData?.forecast?.recurringSummary?.futureIncomeItems ?? 0,
            futureExpenseItems:
                dashboardData?.forecast?.recurringSummary?.futureExpenseItems ?? 0
        },
        recurringIncomeItems: dashboardData?.forecast?.recurringIncomeItems ?? [],
        recurringExpenseItems: dashboardData?.forecast?.recurringExpenseItems ?? [],
        categoryForecast: dashboardData?.forecast?.categoryForecast ?? [],
        validation: {
            evaluatedMonths: dashboardData?.forecast?.validation?.evaluatedMonths ?? 0,
            mae: dashboardData?.forecast?.validation?.mae ?? 0,
            mape: dashboardData?.forecast?.validation?.mape ?? 0,
            samples: dashboardData?.forecast?.validation?.samples ?? []
        },
        variableModel: {
            historyDays: dashboardData?.forecast?.variableModel?.historyDays ?? 0,
            historyWindowDays:
                dashboardData?.forecast?.variableModel?.historyWindowDays ?? 0,
            trendFactor: dashboardData?.forecast?.variableModel?.trendFactor ?? 1,
            weekdayProfiles:
                dashboardData?.forecast?.variableModel?.weekdayProfiles ?? {}
        }
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
                        Monitora le transazioni importate dal conto collegato e completa il
                        quadro aggiungendo anche le spese in contanti.
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

                        <div className="period-dropdown-wrap">
                            <label htmlFor="category-select" className="period-label">
                                Categoria
                            </label>
                            <select
                                id="category-select"
                                className="period-select"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">Tutte</option>
                                {(dashboardData?.availableCategories || []).map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="hero-right">
                    <div className="hero-stat">
                        <span>Transazioni totali {formatPeriodLabel(selectedPeriod)}</span>
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
                    <p className="stat-label">Previsione fine mese</p>
                    <h2>{formatAmount(forecast.predictedEndBalance)}</h2>
                    <p className="stat-caption">
                        Media uscite variabili: {formatAmount(forecast.averageDailyVariableExpenses)}/giorno ·
                        Mancano {forecast.daysRemaining} giorni ·
                        Affidabilità {getConfidenceLabel(forecast.confidence)}
                    </p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Totale uscite {getPeriodLabel(selectedPeriod)}</p>
                    <h2>{formatAmount(summary.totalExpenses)}</h2>
                    <p className="stat-caption">
                        Uscite nel periodo {getPeriodLabel(selectedPeriod)}
                    </p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Numero transazioni {getPeriodLabel(selectedPeriod)}</p>
                    <h2>{summary.totalTransactions}</h2>
                    <p className="stat-caption">
                        Transazioni registrate nel periodo {getPeriodLabel(selectedPeriod)}
                    </p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Saldo {getPeriodLabel(selectedPeriod)}</p>
                    <h2>{formatAmount(summary.balance)}</h2>
                    <p className="stat-caption">
                        Saldo del periodo {getPeriodLabel(selectedPeriod)}
                    </p>
                </div>
            </div>

            <div className="dashboard-card forecast-card">
                <div className="card-header">
                    <div>
                        <h3>Motore previsionale</h3>
                        <p className="forecast-subtitle">
                            Stime basate sulle tue abitudini di spesa recenti
                        </p>
                    </div>

                    <span className={`forecast-badge ${forecast.confidence}`}>
                         Affidabilità {getConfidenceLabel(forecast.confidence)}
                    </span>
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
                            <span>Entrate ricorrenti rimanenti</span>
                            <span>{formatAmount(forecast.remainingRecurringIncome)}</span>
                        </div>
                        <div className="progress-meta">
                            <span>Eventi futuri rilevati: {forecast.recurringSummary.futureIncomeItems}</span>
                        </div>
                    </div>

                    <div className="category-item">
                        <div className="category-top">
                            <span>Uscite ricorrenti rimanenti</span>
                            <span>{formatAmount(forecast.remainingRecurringExpenses)}</span>
                        </div>
                        <div className="progress-meta">
                            <span>Eventi futuri rilevati: {forecast.recurringSummary.futureExpenseItems}</span>
                        </div>
                    </div>

                    <div className="category-item">
                        <div className="category-top">
                            <span>Media spese giornaliere</span>
                            <span>{formatAmount(forecast.averageDailyVariableExpenses)}</span>
                        </div>

                        <div className="progress-meta">
                            <span>Calcolata sulle spese recenti</span>
                        </div>
                    </div>

                    <div className="category-item">
                        <div className="category-top">
                            <span>Spese stimate fino a fine mese</span>
                            <span>{formatAmount(forecast.projectedVariableExpenses)}</span>
                        </div>

                        <div className="progress-meta">
                            <span>Mancano {forecast.daysRemaining} giorni alla fine del mese</span>
                        </div>
                    </div>

                    <div className="category-item">
                        <div className="category-top">
                            <span>Previsione fine mese</span>
                            <span>{formatAmount(forecast.predictedEndBalance)}</span>
                        </div>
                        <div className="progress-meta">
                            <span>
                                  Basata su entrate, uscite ricorrenti e storico transazioni
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-main-grid">
                <div className="dashboard-card large-card">
                    <div className="card-header">
                        <h3>Validazione del modello</h3>
                        <span>Errore medio e backtest storico</span>
                    </div>

                    <div className="stats-grid" style={{ marginBottom: 0 }}>
                        <div className="stat-card">
                            <p className="stat-label">MAE</p>
                            <h2>{forecast.validation.mae}</h2>
                            <p className="stat-caption">Errore assoluto medio sulle spese residue</p>
                        </div>

                        <div className="stat-card">
                            <p className="stat-label">MAPE</p>
                            <h2>{forecast.validation.mape}%</h2>
                            <p className="stat-caption">Errore percentuale medio assoluto</p>
                        </div>

                        <div className="stat-card">
                            <p className="stat-label">Mesi valutati</p>
                            <h2>{forecast.validation.evaluatedMonths}</h2>
                            <p className="stat-caption">Campioni validi del backtest</p>
                        </div>

                        <div className="stat-card">
                            <p className="stat-label">Campioni</p>
                            <h2>{forecast.validation.samples.length}</h2>
                            <p className="stat-caption">Simulazioni storiche confrontate</p>
                        </div>
                    </div>

                    {forecast.validation.samples.length > 0 && (
                        <div style={{ marginTop: '18px' }} className="trend-list">
                            {forecast.validation.samples.slice(0, 4).map((sample) => (
                                <div className="trend-row" key={sample.month}>
                                    <div>
                                        <p className="trend-title">{sample.month}</p>
                                        <span>
                                            Previste residue: {formatAmount(sample.predictedRemainingExpenses)} ·
                                            Reali residue: {formatAmount(sample.actualRemainingExpenses)}
                                        </span>
                                    </div>
                                    <strong>
                                        {formatAmount(sample.predictedEndBalance)} / {formatAmount(sample.actualEndBalance)}
                                    </strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dashboard-card large-card">
                    <div className="card-header">
                        <h3>Ricavi ricorrenti futuri</h3>
                        <span>{forecast.recurringIncomeItems.length} rilevate</span>
                    </div>

                    {forecast.recurringIncomeItems.length === 0 ? (
                        <div className="empty-state">
                            Nessuna entrata ricorrente futura rilevata.
                        </div>
                    ) : (
                        <div className="category-list">
                            {forecast.recurringIncomeItems.map((item, index) => (
                                <div
                                    key={`${item.description}-${item.predictedDate}-${index}`}
                                    className="category-item"
                                >
                                    <div className="category-top">
                                        <span>{item.description}</span>
                                        <span>{formatAmount(item.amount)}</span>
                                    </div>
                                    <div className="progress-meta">
                                        <span>{item.category}</span>
                                        <span>
                                            Prevista il {new Date(item.predictedDate).toLocaleDateString('it-IT')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboard-main-grid">
                <div className="dashboard-card large-card">
                    <div className="card-header">
                        <h3>Uscite ricorrenti future</h3>
                        <span>{forecast.recurringExpenseItems.length} rilevate</span>
                    </div>

                    {forecast.recurringExpenseItems.length === 0 ? (
                        <div className="empty-state">
                            Nessuna uscita ricorrente futura rilevata.
                        </div>
                    ) : (
                        <div className="category-list">
                            {forecast.recurringExpenseItems.map((item, index) => (
                                <div
                                    key={`${item.description}-${item.predictedDate}-${index}`}
                                    className="category-item"
                                >
                                    <div className="category-top">
                                        <span>{item.description}</span>
                                        <span>{formatAmount(item.amount)}</span>
                                    </div>
                                    <div className="progress-meta">
                                        <span>{item.category}</span>
                                        <span>
                                            Prevista il {new Date(item.predictedDate).toLocaleDateString('it-IT')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dashboard-card large-card">
                    <div className="card-header">
                        <h3>Previsione per categoria</h3>
                        <span>Distribuzione delle spese variabili previste</span>
                    </div>

                    {forecast.categoryForecast.length === 0 ? (
                        <div className="empty-state">
                            Nessuna previsione disponibile.
                        </div>
                    ) : (
                        <div className="category-list">
                            {forecast.categoryForecast.slice(0, 8).map((item) => (
                                <div key={item.category} className="category-item">
                                    <div className="category-top">
                                        <span>{item.category}</span>
                                        <span>{formatAmount(item.projectedExpense)}</span>
                                    </div>

                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${Math.min(item.historicalShare * 100, 100)}%`
                                            }}
                                        />
                                    </div>

                                    <div className="progress-meta">
                                        <span>Peso storico: {(item.historicalShare * 100).toFixed(1)}%</span>
                                        <span>Quota prevista sul totale variabile</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboard-main-grid-70-30">
                <div className="dashboard-card large-card">
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