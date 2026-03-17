import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (location.pathname === '/') {
        return (
            <nav
                style={{
                    padding: '18px 30px',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff'
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        color: '#4f46e5',
                        fontSize: '28px',
                        fontWeight: '700'
                    }}
                >
                    Spendara
                </h2>
            </nav>
        );
    }

    return (
        <nav
            style={{
                padding: '12px 20px',
                borderBottom: '1px solid #ccc',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}
        >
            <Link to="/" style={{ textDecoration: 'none' }}>
                Home
            </Link>

            {!token && (
                <>
                    <Link to="/login" style={{ textDecoration: 'none' }}>
                        Login
                    </Link>

                    <Link to="/register" style={{ textDecoration: 'none' }}>
                        Registrati
                    </Link>
                </>
            )}

            {token && <button onClick={handleLogout}>Logout</button>}
        </nav>
    );
}

export default Navbar;