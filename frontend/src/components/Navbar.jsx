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
                {/* HOME = link normale */}
                <Link
                    to="/"
                    className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                >
                    Home
                </Link>

                {/* LOGIN / REGISTER = BOTTONI */}
                {location.pathname === '/login' && (
                    <Link to="/register" className="nav-link nav-button">
                        Registrati
                    </Link>
                )}

                {location.pathname === '/register' && (
                    <Link to="/login" className="nav-link nav-button">
                        Login
                    </Link>
                )}

                {/* LOGOUT */}
                {token && location.pathname !== '/login' && location.pathname !== '/register' && (
                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                )}
            </div>
        </nav>
    );
}

export default Navbar;