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
    throw new Error(text?.trim() || 'Risposta non valida dal server');
}

export async function addCashTransaction(token, payload) {
    const response = await fetch(`${API_BASE_URL}/api/transactions/cash`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    return parseApiResponse(response);
}

export async function getAllTransactions(token) {
    const response = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(response);
}

export async function updateTransactionCategory(token, transactionId, category) {
    const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}/category`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ category })
    });

    return parseApiResponse(response);
}

export async function updateManualTransaction(token, transactionId, payload) {
    const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}/manual`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    return parseApiResponse(response);
}

export async function deleteTransaction(token, transactionId) {
    const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(response);
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

    return parseApiResponse(response);
}

export async function simulateDailyTransactions(token) {
    const response = await fetch(`${API_BASE_URL}/api/transactions/simulate-daily`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(response);
}