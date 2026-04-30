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
            setAllTransactions(dashboardResponse.periodTransactions || []);
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
    const trend = dashboardData?.trend || [];
    const topExpenses = dashboardData?.topExpenses || [];

    const forecast = {
        model: dashboardData?.forecast?.model ?? 'seasonal_weekday_trend_v2',
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
                    <p className="stat-label">Previsione fine mese</p>
                    <h2>{formatAmount(forecast.predictedEndBalance)}</h2>
                    <p className="stat-caption">
                        Media uscite variabili: {formatAmount(forecast.averageDailyVariableExpenses)}/giorno ·
                        Mancano {forecast.daysRemaining} giorni ·
                        Affidabilità {getConfidenceLabel(forecast.confidence)}
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
                    <p className="stat-label">Saldo periodo</p>
                    <h2>{formatAmount(summary.balance)}</h2>
                    <p className="stat-caption">Entrate meno uscite nel periodo</p>
                </div>
            </div>

            <div className="dashboard-card forecast-card">
                <div className="card-header">
                    <h3>Motore previsionale</h3>
                    <span>{forecast.model}</span>
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
                            <span>Media uscite variabili giornaliere</span>
                            <span>{formatAmount(forecast.averageDailyVariableExpenses)}</span>
                        </div>
                        <div className="progress-meta">
                            <span>Giorni con uscite nello storico: {forecast.activeExpenseDays}</span>
                            <span>Trend: {forecast.variableModel.trendFactor}x</span>
                        </div>
                    </div>

                    <div className="category-item">
                        <div className="category-top">
                            <span>Uscite variabili stimate rimanenti</span>
                            <span>{formatAmount(forecast.projectedVariableExpenses)}</span>
                        </div>
                        <div className="progress-meta">
                            <span>Finestra storica: {forecast.variableModel.historyWindowDays} giorni</span>
                            <span>Orizzonte previsione: {forecast.daysRemaining} giorni</span>
                        </div>
                    </div>

                    <div className="category-item">
                        <div className="category-top">
                            <span>Previsione fine mese</span>
                            <span>{formatAmount(forecast.predictedEndBalance)}</span>
                        </div>
                        <div className="progress-meta">
                            <span>Affidabilità: {getConfidenceLabel(forecast.confidence)}</span>
                            <span>Serie ricorrenti rilevate: {forecast.recurringSummary.detectedSeries}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-main-grid">
                <div className="dashboard-card large-card">
                    <div className="card-header">
                        <h3>Validazione del modello</h3>
                        <span>Backtest sui mesi completi precedenti</span>
                    </div>

                    <div className="category-list">
                        <div className="category-item">
                            <div className="category-top">
                                <span>Mesi valutati</span>
                                <span>{forecast.validation.evaluatedMonths}</span>
                            </div>
                        </div>

                        <div className="category-item">
                            <div className="category-top">
                                <span>MAE</span>
                                <span>{formatAmount(forecast.validation.mae)}</span>
                            </div>
                            <div className="progress-meta">
                                <span>Errore medio assoluto sulle spese residue previste</span>
                            </div>
                        </div>

                        <div className="category-item">
                            <div className="category-top">
                                <span>MAPE</span>
                                <span>{forecast.validation.mape.toFixed(2)}%</span>
                            </div>
                            <div className="progress-meta">
                                <span>Errore percentuale medio sulle spese residue previste</span>
                            </div>
                        </div>
                    </div>

                    {forecast.validation.samples.length > 0 && (
                        <div className="category-list" style={{ marginTop: '16px' }}>
                            {forecast.validation.samples.map((sample) => (
                                <div key={sample.month} className="category-item">
                                    <div className="category-top">
                                        <span>{sample.month}</span>
                                        <span>
                                            Previsto {formatAmount(sample.predictedRemainingExpenses)}
                                        </span>
                                    </div>
                                    <div className="progress-meta">
                                        <span>
                                            Reale {formatAmount(sample.actualRemainingExpenses)}
                                        </span>
                                        <span>
                                            Saldo finale reale {formatAmount(sample.actualEndBalance)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dashboard-card form-card">
                    <div className="card-header">
                        <h3>Previsione per categoria</h3>
                        <span>Ripartizione delle uscite variabili attese</span>
                    </div>

                    {forecast.categoryForecast.length === 0 ? (
                        <div className="empty-state">
                            Nessuna previsione per categoria disponibile.
                            <span>Servono più dati storici sulle uscite variabili.</span>
                        </div>
                    ) : (
                        <div className="category-list">
                            {forecast.categoryForecast.map((item) => (
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
                                        <span>
                                            Peso storico: {(item.historicalShare * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboard-card forecast-card">
                <div className="forecast-recurring-grid">
                    <div className="forecast-recurring-column">
                        <div className="card-header">
                            <h3>Entrate ricorrenti previste</h3>
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
                                                Prevista il{' '}
                                                {new Date(item.predictedDate).toLocaleDateString('it-IT')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="forecast-recurring-column">
                        <div className="card-header">
                            <h3>Uscite ricorrenti previste</h3>
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
                                                Prevista il{' '}
                                                {new Date(item.predictedDate).toLocaleDateString('it-IT')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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

                    {trend.length === 0 ? (
                        <div className="empty-state">
                            Nessun trend disponibile.
                        </div>
                    ) : (
                        <div className="category-list">
                            {trend.map((item, index) => (
                                <div key={`${item.label}-${index}`} className="category-item">
                                    <div className="category-top">
                                        <span>{item.label}</span>
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

export function Dashboard({ data, refetch }) {
    const [showBudgetModal, setShowBudgetModal] = useState(false);

    return (
        <div className="space-y-6">

            {/* RIEPILOGO */}
            <div className="rounded-2xl shadow p-4 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold">Riepilogo mese</h2>
                    <p>Saldo: € {data?.summary?.balance}</p>
                    <p>Entrate: € {data?.summary?.totalIncome}</p>
                    <p>Uscite: € {data?.summary?.totalExpenses}</p>
                </div>

                <button
                    onClick={() => setShowBudgetModal(true)}
                    className="rounded-xl px-4 py-2 border"
                >
                    Imposta budget
                </button>
            </div>

            {/* MODAL */}
            {showBudgetModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">

                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Budget mensile</h3>
                            <button onClick={() => setShowBudgetModal(false)}>✕</button>
                        </div>

                        <BudgetForm
                            onSaved={() => {
                                setShowBudgetModal(false);
                                refetch?.(); // ricarica dashboard
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardPage;