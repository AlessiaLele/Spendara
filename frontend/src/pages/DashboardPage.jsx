import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBankConnectionStatus } from '../api/tinkApi';
import { getDashboardData } from '../api/dashboardApi';
import { getAllTransactions, deleteTransaction } from '../api/transactionApi';
import AddCashTransactionForm from '../components/AddCashTransactionForm';
import TransactionsList from '../components/TransactionsList';
import '../styles/Dashboard.css';

function DashboardPage() {
    const navigate = useNavigate();

    const [dashboardData, setDashboardData] = useState(null);
    const [allTransactions, setAllTransactions] = useState([]);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = async () => {
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

            const [dashboardResponse, transactionsResponse] = await Promise.all([
                getDashboardData(token),
                getAllTransactions(token)
            ]);

            setDashboardData(dashboardResponse);
            setAllTransactions(transactionsResponse);
        } catch (err) {
            console.error('ERRORE DASHBOARD:', err);
            setError(err.message || 'Errore nel caricamento della dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
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

            await loadDashboard();
        } catch (err) {
            console.error('ERRORE DELETE TRANSACTION:', err);
            setError(err.message || 'Errore durante l’eliminazione della transazione');
        }
    };

    const handleFormSuccess = async () => {
        setEditingTransaction(null);
        await loadDashboard();
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
        balance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        monthlyNet: 0
    };

    const categories = dashboardData?.categories || [];
    const monthlyTrend = dashboardData?.monthlyTrend || [];
    const topExpenses = dashboardData?.topExpenses || [];

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
                    </div>
                </div>

                <div className="hero-right">
                    <div className="hero-stat">
                        <span>Transazioni totali</span>
                        <strong>{summary.totalTransactions}</strong>
                    </div>

                    <div className="hero-stat">
                        <span>Saldo stimato</span>
                        <strong>{formatAmount(summary.balance)}</strong>
                    </div>
                </div>
            </div>

            {error && <div className="dashboard-alert error">{error}</div>}

            <div className="stats-grid">
                <div className="stat-card">
                    <p className="stat-label">Totale entrate</p>
                    <h2>{formatAmount(summary.totalIncome)}</h2>
                    <p className="stat-caption">Movimenti positivi disponibili</p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Totale uscite</p>
                    <h2>{formatAmount(summary.totalExpenses)}</h2>
                    <p className="stat-caption">Movimenti negativi disponibili</p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Numero transazioni</p>
                    <h2>{summary.totalTransactions}</h2>
                    <p className="stat-caption">Banca + inserimenti manuali + simulate</p>
                </div>

                <div className="stat-card">
                    <p className="stat-label">Saldo</p>
                    <h2>{formatAmount(summary.balance)}</h2>
                    <p className="stat-caption">Entrate meno uscite</p>
                </div>
            </div>

            <div className="dashboard-main-grid">
                <div className="dashboard-card large-card">
                    <div className="card-header">
                        <h3>Categorie principali</h3>
                        <span>Distribuzione attuale</span>
                    </div>

                    {categories.length === 0 ? (
                        <div className="empty-state">
                            Nessuna categoria disponibile.
                            <span>Importa o aggiungi transazioni per visualizzare la distribuzione.</span>
                        </div>
                    ) : (
                        <div className="category-list">
                            {categories.slice(0, 5).map((category) => (
                                <div key={category.name} className="category-item">
                                    <div className="category-top">
                                        <span>{category.name}</span>
                                        <span>{formatAmount(category.value)}</span>
                                    </div>

                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${summary.totalExpenses > 0
                                                    ? (category.value / summary.totalExpenses) * 100
                                                    : 0}%`
                                            }}
                                        />
                                    </div>

                                    <div className="progress-meta">
                                        <span>Peso sul totale uscite</span>
                                        <span>
                                            {summary.totalExpenses > 0
                                                ? `${((category.value / summary.totalExpenses) * 100).toFixed(1)}%`
                                                : '0%'}
                                        </span>
                                    </div>
                                </div>
                            ))}
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
                        <h3>Trend ultimi 6 mesi</h3>
                        <span>Entrate, uscite e netto per mese</span>
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
                        <span>Movimenti negativi più pesanti</span>
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
                    <h3>Tutte le transazioni</h3>
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