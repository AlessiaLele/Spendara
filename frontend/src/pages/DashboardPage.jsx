import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBankConnectionStatus } from '../api/tinkApi';
import { getDashboardData } from '../api/dashboardApi';
import AddCashTransactionForm from '../components/AddCashTransactionForm';
import TransactionsList from '../components/TransactionsList';
import '../styles/Dashboard.css';

function DashboardPage() {
    const navigate = useNavigate();

    const [dashboardData, setDashboardData] = useState(null);
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

            const data = await getDashboardData(token);
            console.log('DASHBOARD DATA:', data);

            setDashboardData(data);
        } catch (err) {
            console.error('ERRORE DASHBOARD:', err);
            setError(err?.response?.data?.message || err.message || 'Errore nel caricamento della dashboard');
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

    const formatSource = (source) => {
        if (source === 'cash') return 'Cash';
        if (source === 'simulated') return 'Simulata';
        return 'Banca';
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
    const recentTransactions = dashboardData?.recentTransactions || [];

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
                        <h3>Aggiungi spesa cash</h3>
                        <span>Completa le uscite non tracciate dal conto</span>
                    </div>

                    <AddCashTransactionForm onTransactionAdded={loadDashboard} />
                </div>
            </div>

            <div className="dashboard-card transactions-card">
                <div className="card-header">
                    <h3>Transazioni recenti</h3>
                    <span>Movimenti più recenti disponibili</span>
                </div>

                {recentTransactions.length === 0 ? (
                    <div className="empty-state">
                        Nessuna transazione trovata.
                        <span>
                            Dopo il collegamento del conto o l’inserimento manuale, i dati appariranno qui.
                        </span>
                    </div>
                ) : (
                    <TransactionsList transactions={recentTransactions} />
                )}
            </div>
        </div>
    );
}

export default DashboardPage;