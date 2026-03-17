import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

function Home() {
    const navigate = useNavigate();

    return (
        <div className="home-page">
            <section className="hero-section">
                <div className="hero-badge">Benvenutə su Spendara</div>

                <h1 className="hero-title">
                    Gestisci le tue finanze
                    <span> in modo semplice e intelligente</span>
                </h1>

                <p className="hero-subtitle">
                    Tieni sotto controllo entrate e uscite, organizza le tue spese
                    e costruisci abitudini finanziarie migliori con un’interfaccia chiara e moderna.
                </p>

                <div className="hero-buttons">
                    <button className="primary-btn" onClick={() => navigate('/register')}>
                        Inizia ora
                    </button>

                    <button className="secondary-btn" onClick={() => navigate('/login')}>
                        Ho già un account
                    </button>
                </div>
            </section>

            <section className="features-section">
                <div className="feature-card">
                    <h3>Monitora le spese</h3>
                    <p>Registra facilmente ogni movimento e tieni traccia delle tue abitudini.</p>
                </div>

                <div className="feature-card">
                    <h3>Controlla il budget</h3>
                    <p>Visualizza le tue uscite e capisci meglio dove stai spendendo di più.</p>
                </div>

                <div className="feature-card">
                    <h3>Più chiarezza</h3>
                    <p>Un’interfaccia semplice per aiutarti a prendere decisioni finanziarie migliori.</p>
                </div>
            </section>
        </div>
    );
}

export default Home;