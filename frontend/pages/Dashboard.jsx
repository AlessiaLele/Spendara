import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";


function Dashboard() {
    const [transactions, setTransactions] = useState([]);
    const [dailyBudget, setDailyBudget] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await fetch("http://localhost:3000/api/transactions", {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                const data = await res.json();

                if (!res.ok) {
                    alert("Errore, effettua login");
                    navigate("/");
                    return;
                }

                setTransactions(data);

                // calcola budget residuo se imposti un tetto (es. 1000€/mese)
                const totalSpent = data.reduce((acc, t) => acc + t.amount, 0);
                const monthlyBudget = 1000; // puoi rendere dinamico
                setDailyBudget(((monthlyBudget - totalSpent) / 30).toFixed(2));

            } catch (err) {
                console.error(err);
                alert("Errore di connessione");
            }
        };

        fetchTransactions();
    }, []);

    // Prepara i dati per il grafico per categoria
    const categoryData = transactions.reduce((acc, t) => {
        const existing = acc.find(item => item.category === t.category);
        if (existing) {
            existing.amount += t.amount;
        } else {
            acc.push({ category: t.category, amount: t.amount });
        }
        return acc;
    }, []);

    return (
        <div>
            <h2>Dashboard</h2>
            <p>Budget residuo giornaliero: {dailyBudget}€</p>
            <a href="/add-expense">Aggiungi Spesa</a>

            <h3>Spese per Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>

            <h3>Elenco Spese</h3>
            <table border="1">
                <thead>
                <tr>
                    <th>Importo</th>
                    <th>Categoria</th>
                    <th>Descrizione</th>
                    <th>Data</th>
                </tr>
                </thead>
                <tbody>
                {transactions.map(t => (
                    <tr key={t._id}>
                        <td>{t.amount}€</td>
                        <td>{t.category}</td>
                        <td>{t.description}</td>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default Dashboard;