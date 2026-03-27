import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getBankConnectionStatus,
    startBankConnection,
    syncBankTransactions
} from '../api/tinkApi';
import '../styles/ConnectBank.css';

function ConnectBankPage() {
    const navigate = useNavigate();

    const [checkingStatus, setCheckingStatus] = useState(true);
    const [loading, setLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const checkConnection = async () => {
        try {
            setError('');
            const token = localStorage.getItem('token');

            if (!token) {
                navigate('/login');
                return;
            }

            const data = await getBankConnectionStatus(token);
            setIsConnected(!!data.isConnected);
        } catch (err) {
            setError(err.message || 'Errore durante la verifica del collegamento');
        } finally {
            setCheckingStatus(false);
        }
    };

    useEffect(() => {
        checkConnection();
    }, [navigate]);

    const handleConnectBank = async () => {
        try {
            setLoading(true);
            setError('');
            setSuccessMessage('');

            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('Utente non autenticato');
            }

            const data = await startBankConnection(token);

            if (!data.connectUrl) {
                throw new Error('URL di collegamento non ricevuto');
            }

            window.location.href = data.connectUrl;
        } catch (err) {
            setError(err.message || 'Errore durante il collegamento bancario');
        } finally {
            setLoading(false);
        }
    };

    const handleSyncTransactions = async () => {
        try {
            setSyncLoading(true);
            setError('');
            setSuccessMessage('');

            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('Utente non autenticato');
            }

            const data = await syncBankTransactions(token);

            setSuccessMessage(
                data.importedTransactions > 0
                    ? `${data.importedTransactions} nuove transazioni importate con successo`
                    : 'Nessuna nuova transazione disponibile'
            );
        } catch (err) {
            setError(err.message || 'Errore durante la sincronizzazione delle transazioni');
        } finally {
            setSyncLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div className="connect-bank-page">
                <div className="connect-bank-card">
                    <p className="connect-bank-loading">
                        Verifica dello stato del conto in corso...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="connect-bank-page">
            <div className="connect-bank-card">
                <div className="connect-bank-badge">Collegamento conto</div>

                <h1 className="connect-bank-title">
                    {isConnected ? (
                        <>
                            Conto collegato
                            <span> e pronto per la sincronizzazione</span>
                        </>
                    ) : (
                        <>
                            Collega il tuo conto
                            <span> e accedi subito alla dashboard</span>
                        </>
                    )}
                </h1>

                <p className="connect-bank-subtitle">
                    {isConnected
                        ? 'Il tuo conto risulta già collegato. Da qui puoi sincronizzare eventuali nuove transazioni e poi tornare alla dashboard aggiornata.'
                        : 'Per iniziare a usare Spendara, collega il tuo conto bancario. Una volta completato il collegamento, importeremo le transazioni e costruiremo automaticamente la tua dashboard finanziaria.'}
                </p>

                <div className="connect-bank-actions">
                    {!isConnected ? (
                        <button
                            className="connect-bank-primary-btn"
                            onClick={handleConnectBank}
                            disabled={loading}
                        >
                            {loading ? 'Connessione in corso...' : 'Collega banca'}
                        </button>
                    ) : (
                        <>
                            <button
                                className="connect-bank-primary-btn"
                                onClick={handleSyncTransactions}
                                disabled={syncLoading}
                            >
                                {syncLoading ? 'Sincronizzazione in corso...' : 'Sincronizza transazioni'}
                            </button>

                            <button
                                className="connect-bank-secondary-btn"
                                onClick={() => navigate('/dashboard')}
                                type="button"
                            >
                                Vai alla dashboard
                            </button>
                        </>
                    )}
                </div>

                {error && <p className="connect-bank-error">{error}</p>}
                {successMessage && <p className="connect-bank-success">{successMessage}</p>}

                <div className="connect-bank-info-grid">
                    <div className="connect-bank-info-card">
                        <h3>Import automatico</h3>
                        <p>
                            Le transazioni vengono recuperate automaticamente dopo il collegamento
                            e possono essere sincronizzate di nuovo in seguito.
                        </p>
                    </div>

                    <div className="connect-bank-info-card">
                        <h3>Dashboard immediata</h3>
                        <p>
                            Entrate, uscite e categorie saranno visibili subito dopo la connessione
                            o dopo una nuova sincronizzazione.
                        </p>
                    </div>

                    <div className="connect-bank-info-card">
                        <h3>Spese in contanti</h3>
                        <p>
                            Potrai aggiungerle manualmente per avere una visione più completa.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ConnectBankPage;