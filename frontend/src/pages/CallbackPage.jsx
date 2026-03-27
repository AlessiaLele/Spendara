import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeBankCallback } from '../api/tinkApi';

function CallbackPage() {
    const navigate = useNavigate();
    const [message, setMessage] = useState('Completamento collegamento banca...');
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const state = params.get('state');

                if (!code || !state) {
                    throw new Error('Parametri callback mancanti');
                }

                const data = await completeBankCallback(code, state);

                setMessage(data.message || 'Collegamento completato con successo');

                setTimeout(() => {
                    navigate('/dashboard');
                }, 1500);
            } catch (err) {
                setError(err.message);
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Callback Tink</h1>

            {!error && <p>{message}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default CallbackPage;