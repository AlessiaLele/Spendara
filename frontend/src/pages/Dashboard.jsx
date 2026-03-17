import React, { useEffect, useState } from 'react';
import '../styles/Login.css';

function Dashboard() {
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');

            try {
                const response = await fetch('http://localhost:5000/api/auth/me', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    setMessage(data.message);
                    return;
                }

                setUser(data);
            } catch (error) {
                setMessage('Errore nel recupero profilo');
            }
        };

        fetchProfile();
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Dashboard</h2>

            {message && <p>{message}</p>}

            {user && (
                <div>
                    <p>
                        <strong>Username:</strong> {user.username}
                    </p>
                    <p>
                        <strong>Email:</strong> {user.email}
                    </p>
                </div>
            )}
        </div>
    );
}

export default Dashboard;