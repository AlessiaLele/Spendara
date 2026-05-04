import { useEffect, useMemo, useState } from 'react';
import {
    completeBankCallback,
    disconnectBankConnection,
    getBankAccounts,
    getBankConnectionStatus,
    getBankTransactions,
    startBankConnection,
    syncBankTransactions
} from '../api/tinkApi';

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
    const token = useMemo(() => getAuthToken(), []);
    const demoMode = String(import.meta.env.VITE_TINK_USE_MOCK_DATA || '').toLowerCase() === 'true';

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function loadStatus() {
        if (!token) {
            setError('Token utente mancante. Effettua il login.');
            setLoading(false);
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

    async function loadTransactions(accountId = '') {
        if (!token) return;

        try {
            const data = await getBankTransactions(token, accountId);
            setTransactions(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Errore nel caricamento transazioni');
        }
    }

    async function refreshAll() {
        setError('');
        setMessage('');
        setLoading(true);

        await loadStatus();
        await loadAccounts();

        const nextAccountId = selectedAccountId || '';
        await loadTransactions(nextAccountId);

        setLoading(false);
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
            setError('Token utente mancante. Effettua il login.');
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
            setTransactions([]);
            setSelectedAccountId('');
            setMessage('Connessione bancaria rimossa.');
        } catch (err) {
            setError(err.message || 'Errore durante la disconnessione');
        } finally {
            setBusy(false);
        }
    }

    async function handleAccountChange(e) {
        const value = e.target.value;
        setSelectedAccountId(value);
        await loadTransactions(value);
    }

    const isConnected = status?.status === 'connected';

    return (
        <div className="mx-auto max-w-6xl p-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Collegamento banca</h1>
                    <p className="text-sm text-gray-500">
                        Gestisci il collegamento Tink, i conti associati e la sincronizzazione delle transazioni.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleConnect}
                        disabled={busy}
                        className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
                    >
                        Collega banca
                    </button>
                    <button
                        onClick={() => handleSync(selectedAccountId)}
                        disabled={busy || !isConnected}
                        className="rounded-xl border px-4 py-2 disabled:opacity-50"
                    >
                        Sincronizza
                    </button>
                    <button
                        onClick={handleDisconnect}
                        disabled={busy || !isConnected}
                        className="rounded-xl border px-4 py-2 disabled:opacity-50"
                    >
                        Scollega
                    </button>
                </div>
            </div>

            {demoMode && (
                <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    Modalità demo attiva: le transazioni mock vengono generate solo se <code>TINK_USE_MOCK_DATA=true</code>.
                </div>
            )}

            {message && (
                <div className="mb-4 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-900">
                    {message}
                </div>
            )}

            {error && (
                <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border p-4 shadow-sm">
                    <div className="text-sm text-gray-500">Stato connessione</div>
                    <div className="mt-1 text-lg font-semibold">
                        {isConnected ? 'Connesso' : 'Non connesso'}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                        Ultimo sync: {formatDate(status?.lastSyncAt)}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                        Errore ultimo sync: {status?.lastSyncError || '-'}
                    </div>
                </div>

                <div className="rounded-2xl border p-4 shadow-sm">
                    <div className="text-sm text-gray-500">Conti collegati</div>
                    <div className="mt-1 text-lg font-semibold">{accounts.length}</div>
                    <div className="mt-2 text-sm text-gray-600">
                        {accounts.length
                            ? 'Puoi sincronizzare il singolo conto o tutti i conti insieme.'
                            : 'Nessun conto disponibile.'}
                    </div>
                </div>

                <div className="rounded-2xl border p-4 shadow-sm">
                    <div className="text-sm text-gray-500">Transazioni caricate</div>
                    <div className="mt-1 text-lg font-semibold">{transactions.length}</div>
                    <div className="mt-2 text-sm text-gray-600">
                        Mostrate in base al conto selezionato.
                    </div>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Conti bancari</h2>
                        <p className="text-sm text-gray-500">Seleziona un conto per filtrare le transazioni.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Conto:</label>
                        <select
                            value={selectedAccountId}
                            onChange={handleAccountChange}
                            className="rounded-xl border px-3 py-2"
                            disabled={!accounts.length}
                        >
                            <option value="">Tutti i conti</option>
                            {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-sm text-gray-500">Caricamento...</div>
                ) : accounts.length ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {accounts.map((account) => (
                            <div key={account.id} className="rounded-xl border p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-semibold">{account.name}</div>
                                        <div className="text-sm text-gray-500">{account.id}</div>
                                    </div>
                                    <div className="text-right text-sm font-medium">
                                        {formatAmount(account.balance, account.currencyCode)}
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => handleSync(account.id)}
                                        disabled={busy}
                                        className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                                    >
                                        Sync conto
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedAccountId(account.id);
                                            loadTransactions(account.id);
                                        }}
                                        className="rounded-lg border px-3 py-2 text-sm"
                                    >
                                        Vedi transazioni
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">Nessun conto collegato.</div>
                )}
            </div>

            <div className="mt-6 rounded-2xl border p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Transazioni bancarie</h2>
                        <p className="text-sm text-gray-500">
                            {selectedAccountId ? 'Vista filtrata sul conto selezionato.' : 'Vista aggregata su tutti i conti.'}
                        </p>
                    </div>
                </div>

                {transactions.length ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">
                            <thead>
                            <tr className="border-b text-left text-gray-500">
                                <th className="py-2 pr-3">Data</th>
                                <th className="py-2 pr-3">Descrizione</th>
                                <th className="py-2 pr-3">Categoria</th>
                                <th className="py-2 pr-3">Conto</th>
                                <th className="py-2 pr-3 text-right">Importo</th>
                            </tr>
                            </thead>
                            <tbody>
                            {transactions.map((tx) => (
                                <tr key={tx._id || tx.externalTransactionId || tx.id} className="border-b last:border-b-0">
                                    <td className="py-2 pr-3">{formatDate(tx.date)}</td>
                                    <td className="py-2 pr-3">{tx.description || '-'}</td>
                                    <td className="py-2 pr-3">{tx.category || '-'}</td>
                                    <td className="py-2 pr-3">{tx.accountName || tx.accountId || '-'}</td>
                                    <td className="py-2 pr-3 text-right">
                                        {formatAmount(tx.amount, tx.currencyCode)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">Nessuna transazione disponibile.</div>
                )}
            </div>
        </div>
    );
}