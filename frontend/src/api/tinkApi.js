const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function startBankConnection(token) {
    const response = await fetch(`${API_BASE_URL}/api/tink/connect`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Errore durante l’avvio del collegamento banca');
    }

    return data;
}

export async function completeBankCallback(code, state) {
    const queryParams = new URLSearchParams({
        code,
        state
    });

    const response = await fetch(`${API_BASE_URL}/api/tink/callback?${queryParams.toString()}`, {
        method: 'GET'
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Errore durante il completamento della callback');
    }

    return data;
}

export async function getBankConnectionStatus(token) {
    const response = await fetch(`${API_BASE_URL}/api/tink/status`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Errore nel recupero stato collegamento banca');
    }

    return data;
}

export async function syncBankTransactions(token) {
    const response = await fetch(`${API_BASE_URL}/api/tink/sync`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Errore durante la sincronizzazione bancaria');
    }

    return data;
}

export async function getBankTransactions(token) {
    const response = await fetch(`${API_BASE_URL}/api/tink/transactions`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Errore nel recupero delle transazioni bancarie');
    }

    return data;
}