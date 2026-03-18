import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';

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
            <nav className="navbar navbar-home">
                <div className="navbar-brand">Spendara</div>
            </nav>
        );
    }

    return (
        <nav className="navbar">
            <div className="navbar-brand">Spendara</div>

            <div className="navbar-links">
                <Link
                    to="/"
                    className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
                >
                    Home
                </Link>

                {!token && (
                    <>
                        <Link
                            to="/login"
                            className={location.pathname === '/login' ? 'nav-link active' : 'nav-link'}
                        >
                            Login
                        </Link>

                        <Link
                            to="/register"
                            className={location.pathname === '/register' ? 'nav-link active' : 'nav-link'}
                        >
                            Registrati
                        </Link>
                    </>
                )}

                {token && (
                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                )}
            </div>
        </nav>
    );
}

export default Navbar;