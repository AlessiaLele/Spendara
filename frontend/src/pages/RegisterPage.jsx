import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Login.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function RegisterPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setMessage('');
            setIsError(false);

            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                setIsError(true);
                setMessage(data.message || 'Errore durante la registrazione');
                return;
            }

            setMessage('Registrazione completata con successo. Verrai reindirizzata al login.');

            setTimeout(() => {
                navigate('/login');
            }, 1200);
        } catch (error) {
            setIsError(true);
            setMessage('Errore di connessione al server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Crea il tuo account</h1>
                    <p>
                        Registrati per iniziare a usare Spendara, collegare il tuo conto
                        e accedere alla dashboard delle tue transazioni.
                    </p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label htmlFor="name">Nome</label>
                    <input
                        id="name"
                        type="text"
                        name="name"
                        placeholder="Inserisci il tuo nome"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />

                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        placeholder="Inserisci la tua email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        placeholder="Crea una password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Registrazione in corso...' : 'Registrati'}
                    </button>
                </form>

                {message && (
                    <p className={`auth-message ${isError ? 'error' : ''}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}

export default RegisterPage;