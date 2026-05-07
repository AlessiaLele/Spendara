import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    completeBankCallback,
    disconnectBankConnection,
    getBankAccounts,
    getBankConnectionStatus,
    startBankConnection,
    syncBankTransactions
} from '../api/tinkApi';

import '../styles/ConnectBank.css';

function getAuthToken() {
    const keys = ['token', 'authToken', 'accessToken', 'userToken'];
    for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) return value;
    }
    return null;
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatAmount(value, currency = 'EUR') {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency
    }).format(Number(value || 0));
}

export default function ConnectBankPage() {
    const navigate = useNavigate();
    const token = useMemo(() => getAuthToken(), []);
    const demoMode = String(import.meta.env.VITE_TINK_USE_MOCK_DATA || '').toLowerCase() === 'true';

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function loadStatus() {
        if (!token) {
            setError('Token utente mancante. Effettua il login.');
            return;
        }

        try {
            const data = await getBankConnectionStatus(token);
            setStatus(data.bankConnection || null);
        } catch (err) {
            setError(err.message || 'Errore nel caricamento dello stato banca');
        }
    }

    async function loadAccounts() {
        if (!token) return;

        try {
            const data = await getBankAccounts(token);
            setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        } catch (err) {
            setError(err.message || 'Errore nel caricamento dei conti');
        }
    }

    async function refreshAll() {
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await Promise.all([loadStatus(), loadAccounts()]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        async function handleCallbackIfPresent() {
            if (!code || !state) return false;

            try {
                setBusy(true);
                setError('');
                setMessage('Completamento collegamento in corso...');

                await completeBankCallback(code, state);

                window.history.replaceState({}, document.title, window.location.pathname);

                setMessage('Collegamento completato con successo.');
                await refreshAll();
            } catch (err) {
                setError(err.message || 'Errore durante il callback Tink');
            } finally {
                setBusy(false);
            }

            return true;
        }

        (async () => {
            const handled = await handleCallbackIfPresent();
            if (!handled) {
                await refreshAll();
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleConnect() {
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            setBusy(true);
            setError('');
            setMessage('');

            const data = await startBankConnection(token);

            if (!data?.connectUrl) {
                throw new Error('URL di collegamento non disponibile');
            }

            window.location.href = data.connectUrl;
        } catch (err) {
            setError(err.message || 'Errore durante l’avvio del collegamento');
            setBusy(false);
        }
    }

    async function handleSync(accountId = '') {
        if (!token) return;

        try {
            setBusy(true);
            setError('');
            setMessage('Sincronizzazione in corso...');

            await syncBankTransactions(token, accountId);
            await refreshAll();
            setMessage('Sincronizzazione completata con successo.');
        } catch (err) {
            setError(err.message || 'Errore durante la sincronizzazione');
        } finally {
            setBusy(false);
        }
    }

    async function handleDisconnect() {
        if (!token) return;

        try {
            setBusy(true);
            setError('');
            setMessage('');

            await disconnectBankConnection(token);

            setStatus(null);
            setAccounts([]);
            setMessage('Connessione bancaria rimossa.');
        } catch (err) {
            setError(err.message || 'Errore durante la disconnessione');
        } finally {
            setBusy(false);
        }
    }

    const isConnected = status?.status === 'connected';
    const lastSyncLabel = status?.lastSyncAt ? formatDate(status.lastSyncAt) : 'Mai';
    const accountCount = accounts.length;

    return (
        <div className="connect-bank-page">
            <div className="connect-bank-card">
                <div className="connect-bank-topbar">
                   <span className="connect-bank-badge">
                        Connessione bancaria
                   </span>
                </div>

                <div className="connect-bank-hero">
                    <div className="connect-bank-hero-copy">
                        <h1 className="connect-bank-title">
                            Un punto unico per la tua banca
                            <span>Collega, controlla e passa alla dashboard in un clic</span>
                        </h1>
                        <p className="connect-bank-subtitle">
                            Questa schermata serve solo per gestire il collegamento bancario e la sincronizzazione.
                            Tutti i dettagli operativi e finanziari restano nella dashboard.
                        </p>
                    </div>

                    <div className="connect-bank-hero-panel">
                        <div className="connect-bank-status-pill">
                            {loading ? 'Caricamento stato...' : isConnected ? 'Banca connessa' : 'Nessuna connessione attiva'}
                        </div>
                        <div className="connect-bank-hero-row">
                            <div>
                                <div className="connect-bank-hero-label">Ultima sincronizzazione</div>
                                <div className="connect-bank-hero-value">{lastSyncLabel}</div>
                            </div>
                        </div>
                        <p className="connect-bank-hero-note">
                            {isConnected
                                ? 'La connessione è attiva. Puoi sincronizzare ora oppure aprire la dashboard per analisi, grafici e transazioni.'
                                : 'Avvia il collegamento e poi usa la dashboard come centro unico per le informazioni dettagliate.'}
                        </p>
                    </div>
                </div>

                <div className="connect-bank-actions">
                    <button
                        onClick={
                            isConnected
                                ? () => navigate('/dashboard')
                                : handleConnect
                        }
                        disabled={busy}
                        className="connect-bank-primary-btn"
                    >
                        {isConnected ? 'Vai alla dashboard' : 'Collega banca'}
                    </button>
                    <button
                        onClick={() => handleSync()}
                        disabled={busy || !isConnected}
                        className="connect-bank-secondary-btn"
                    >
                        Sincronizza ora
                    </button>
                    <button
                        onClick={handleDisconnect}
                        disabled={busy || !isConnected}
                        className="connect-bank-secondary-btn"
                    >
                        Scollega
                    </button>
                </div>

                <div className="connect-bank-info-grid">
                    <div className="connect-bank-info-card">
                        <h3>1. Collega il conto</h3>
                        <p>Avvia il flusso Tink e autorizza l’accesso al tuo istituto bancario.</p>
                    </div>
                    <div className="connect-bank-info-card">
                        <h3>2. Sincronizza i dati</h3>
                        <p>Aggiorna lo stato della connessione e mantieni i conti allineati.</p>
                    </div>
                    <div className="connect-bank-info-card">
                        <h3>3. Apri la dashboard</h3>
                        <p>Vai alla dashboard per analisi complete, movimenti e lettura dei dettagli.</p>
                    </div>
                </div>

                {demoMode && (
                    <div className="connect-bank-banner connect-bank-banner-demo">
                        Modalità demo attiva: le transazioni mock vengono generate solo se{' '}
                        <code>TINK_USE_MOCK_DATA=true</code>.
                    </div>
                )}

                {message && <div className="connect-bank-banner connect-bank-banner-success">{message}</div>}

                {error && <div className="connect-bank-banner connect-bank-banner-error">{error}</div>}

                <div className="connect-bank-stats-grid">
                    <div className="connect-bank-stat-card">
                        <div className="connect-bank-stat-label">
                            Stato connessione
                        </div>

                        <div className="connect-bank-stat-value">
                            {isConnected ? 'Connesso' : 'Non connesso'}
                        </div>

                        <div className="connect-bank-stat-meta">
                            Ultimo sync: {lastSyncLabel}
                        </div>
                    </div>

                    <div className="connect-bank-stat-card">
                        <div className="connect-bank-stat-label">
                            Conti collegati
                        </div>

                        <div className="connect-bank-stat-value">
                            {accountCount}
                        </div>

                        <div className="connect-bank-stat-meta">
                            {accountCount === 1
                                ? '1 conto connesso'
                                : `${accountCount} conti connessi`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}