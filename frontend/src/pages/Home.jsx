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
                    Collega il tuo conto e
                    <span> visualizza subito la tua dashboard finanziaria</span>
                </h1>

                <p className="hero-subtitle">
                    Spendara ti aiuta a monitorare le tue finanze partendo direttamente
                    dalle transazioni del tuo conto. Dopo l’accesso puoi collegare la banca,
                    importare i movimenti e completare il quadro aggiungendo anche le spese in contanti.
                </p>

                <div className="hero-buttons">
                    <button className="primary-btn" onClick={() => navigate('/register')}>
                        Crea un account
                    </button>

                    <button className="secondary-btn" onClick={() => navigate('/login')}>
                        Accedi
                    </button>
                </div>

                <div className="hero-note">
                    Accesso rapido ai dati • Dashboard automatica • Inserimento contanti
                </div>
            </section>

            <section className="features-section">
                <div className="feature-card">
                    <h3>Collega il tuo conto</h3>
                    <p>
                        Dopo l’autenticazione puoi connettere il tuo conto per recuperare
                        automaticamente le transazioni e iniziare subito l’analisi.
                    </p>
                </div>

                <div className="feature-card">
                    <h3>Dashboard aggiornata</h3>
                    <p>
                        Visualizza entrate, uscite, categorie di spesa e andamento temporale
                        in una dashboard chiara, costruita sui movimenti importati.
                    </p>
                </div>

                <div className="feature-card">
                    <h3>Aggiungi le spese in contanti</h3>
                    <p>
                        Completa il monitoraggio finanziario inserendo manualmente le spese
                        non tracciate dal conto, come i pagamenti in contanti.
                    </p>
                </div>
            </section>
        </div>
    );
}

export default Home;