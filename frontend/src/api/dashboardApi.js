const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function parseApiResponse(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore nel recupero dei dati dashboard');
        }

        return data;
    }

    const text = await response.text();
    throw new Error(text?.trim() || 'Risposta non valida dal server');
}

export async function getDashboardData(token, period = 'monthly') {
    const query = new URLSearchParams({ period });

    const response = await fetch(`${API_BASE_URL}/api/dashboard?${query.toString()}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return parseApiResponse(response);
}