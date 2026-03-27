const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function addCashTransaction(token, payload) {
    const response = await fetch(`${API_BASE_URL}/api/transactions/cash`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Errore durante l’inserimento della transazione cash');
    }

    return data;
}

export async function getAllTransactions(token) {
    const response = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Errore nel recupero delle transazioni');
    }

    return data;
}

export async function seedTransactions(token, days = 90) {
    const response = await fetch(`${API_BASE_URL}/api/transactions/seed`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ days })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Errore nel seed delle transazioni');
    }

    return data;
}

export async function simulateDailyTransactions(token) {
    const response = await fetch(`${API_BASE_URL}/api/transactions/simulate-daily`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Errore nella simulazione giornaliera');
    }

    return data;
}