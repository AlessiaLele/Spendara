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
            if (!token) return navigate('/login');

            const connectionStatus = await getBankConnectionStatus(token);
            if (!connectionStatus.isConnected) return navigate('/connect-bank');

            const data = await getDashboardData(token, period);

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
        loadDashboard(selectedPeriod);
    }, [selectedPeriod]);

    const formatAmount = (amount) =>
        new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);

    const handleDelete = async (id) => {
        if (!window.confirm('Eliminare transazione?')) return;

        try {
            const token = localStorage.getItem('token');
            await deleteTransaction(token, id);

            setAllTransactions((prev) =>
                prev.filter((tx) => tx._id !== transactionId)
            );

            if (editingTransaction?._id === id) setEditingTransaction(null);

            await loadDashboard(selectedPeriod);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (tx) => {
        setEditingTransaction(tx);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return <div className="dashboard-wrapper">Caricamento...</div>;
    }

    const summary = dashboardData?.summary || {};
    const forecast = dashboardData?.forecast || {};
    const categories = dashboardData?.categories || [];
    const trend = dashboardData?.trend || [];
    const topExpenses = dashboardData?.topExpenses || [];

    const pieData = categories.map(c => ({
        name: c.name,
        value: c.value
    }));

    return (
        <div className="dashboard-wrapper">

            {/* HEADER */}
            <div className="dashboard-header">
                <h1>Dashboard</h1>

                <div>
                    <select
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

            {error && <div className="error">{error}</div>}

            {/* SUMMARY */}
            <div className="stats-grid">
                <div className="card">
                    <h3>Saldo</h3>
                    <p>{formatAmount(summary.balance)}</p>
                </div>

                <div className="card">
                    <h3>Entrate</h3>
                    <p>{formatAmount(summary.totalIncome)}</p>
                </div>

                <div className="card">
                    <h3>Uscite</h3>
                    <p>{formatAmount(summary.totalExpenses)}</p>
                </div>

                <div className="card">
                    <h3>Previsione</h3>
                    <p>{formatAmount(forecast.predictedEndBalance)}</p>
                </div>
            </div>

            {/* PIE */}
            <div className="dashboard-card">
                <h3>Spese per categoria</h3>

                {pieData.length === 0 ? (
                    <p>Nessun dato</p>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value">
                                {pieData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={formatAmount} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* FORM + BUDGET */}
            <div className="dashboard-right-column">
                <div className="dashboard-card">
                    <AddCashTransactionForm
                        editingTransaction={editingTransaction}
                        onCancelEdit={() => setEditingTransaction(null)}
                        onTransactionAdded={loadDashboard}
                    />
                </div>

                <div className="dashboard-card">
                    <BudgetForm
                        onBudgetCreated={() => loadDashboard()}
                    />
                </div>
            </div>

            {/* TOP EXPENSES */}
            <div className="dashboard-card">
                <h3>Top spese</h3>

                {topExpenses.map(tx => (
                    <div key={tx._id}>
                        {tx.description} - {formatAmount(tx.amount)}
                    </div>
                ))}
            </div>

            {/* TREND */}
            <div className="dashboard-card">
                <h3>Trend</h3>

                {trend.map((t, i) => (
                    <div key={i}>
                        {t.label}: {formatAmount(t.net)}
                    </div>
                ))}
            </div>

            {/* TRANSACTIONS */}
            <TransactionsList
                transactions={allTransactions}
                onEditTransaction={handleEdit}
                onDeleteTransaction={handleDelete}
            />
        </div>
    );
}

export default DashboardPage;