import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || 'Errore durante la registrazione');
                return;
            }

            setMessage('Registrazione completata con successo');

            // piccolo delay per vedere il messaggio
            setTimeout(() => {
                navigate('/');
            }, 1200);

        } catch (error) {
            setMessage('Errore di connessione al server');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>Registrati</h2>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={formData.username}
                        onChange={handleChange}
                    />

                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                    />

                    <button type="submit" className="auth-button">
                        Registrati
                    </button>
                </form>

                {message && <p className="auth-message">{message}</p>}
            </div>
        </div>
    );
}

export default Register;