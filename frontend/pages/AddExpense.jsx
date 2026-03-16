import { useState } from "react";

function AddExpense() {
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem("token");

            const res = await fetch("http://localhost:3000/api/transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ amount, category, description, date })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message);
                return;
            }

            alert("Spesa salvata!");
            setAmount(""); setCategory(""); setDescription(""); setDate("");

        } catch (err) {
            console.error(err);
            alert("Errore di connessione");
        }
    };

    return (
        <div>
            <h2>Aggiungi Spesa</h2>
            <form onSubmit={handleSubmit}>
                <input type="number" placeholder="Importo" value={amount} onChange={e => setAmount(e.target.value)} />
                <input type="text" placeholder="Categoria" value={category} onChange={e => setCategory(e.target.value)} />
                <input type="text" placeholder="Descrizione" value={description} onChange={e => setDescription(e.target.value)} />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                <button type="submit">Salva Spesa</button>
            </form>
        </div>
    );
}

export default AddExpense;