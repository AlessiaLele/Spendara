const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function parseApiResponse(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore Tink');
        }

        return data;
    }

    const text = await response.text();
    throw new Error(text?.trim() || 'Risposta non valida dal server');
}

export async function syncTransactions(token, accountId = '') {
    const params = new URLSearchParams();

    if (accountId) {
        params.set('accountId', accountId);
    }

    const res = await fetch(`${API_BASE_URL}/api/tink/sync${params.toString() ? `?${params.toString()}` : ''}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(res);
}

export async function startBankConnection(token) {
    const response = await fetch(`${API_BASE_URL}/api/tink/connect`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(response);
}

export async function completeBankCallback(code, state) {
    const queryParams = new URLSearchParams({
        code,
        state
    });

    const response = await fetch(`${API_BASE_URL}/api/tink/callback?${queryParams.toString()}`, {
        method: 'GET'
    });

    return parseApiResponse(response);
}

export async function getBankConnectionStatus(token) {
    const response = await fetch(`${API_BASE_URL}/api/tink/status`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(response);
}

export async function getBankAccounts(token) {
    const response = await fetch(`${API_BASE_URL}/api/tink/accounts`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(response);
}

export async function syncBankTransactions(token, accountId = '') {
    const params = new URLSearchParams();
    if (accountId) params.set('accountId', accountId);

    const response = await fetch(
        `${API_BASE_URL}/api/tink/sync${params.toString() ? `?${params.toString()}` : ''}`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return parseApiResponse(response);
}

export async function getBankTransactions(token, accountId = '') {
    const params = new URLSearchParams();
    if (accountId) params.set('accountId', accountId);

    const response = await fetch(
        `${API_BASE_URL}/api/tink/transactions${params.toString() ? `?${params.toString()}` : ''}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return parseApiResponse(response);
}

export async function disconnectBankConnection(token) {
    const response = await fetch(`${API_BASE_URL}/api/tink/disconnect`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(response);
}