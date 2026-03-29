const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function parseApiResponse(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore API');
        }

        return data;
    }

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            text?.trim() ||
            'Il server ha risposto con un formato non valido'
        );
    }

    throw new Error(
        'Il server ha restituito una risposta non JSON. Controlla URL backend, route API e configurazione deploy.'
    );
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

export async function syncBankTransactions(token) {
    const response = await fetch(`${API_BASE_URL}/api/tink/sync`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(response);
}

export async function getBankTransactions(token) {
    const response = await fetch(`${API_BASE_URL}/api/tink/transactions`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(response);
}