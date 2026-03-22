import { useEffect, useState } from 'react';
import { buildApiUrl } from '../services/api';

const DEFAULT_FORM = {
    type: 'expense',
    amount: '',
    date: '',
    category: '',
    description: '',
    paymentMethod: ''
};

export default function AddTransactionForm({
                                               onSuccess,
                                               editingTransaction,
                                               onCancelEdit
                                           }) {
    const [formData, setFormData] = useState(DEFAULT_FORM);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (editingTransaction) {
            setFormData({
                type: editingTransaction.type || 'expense',
                amount: editingTransaction.amount ?? '',
                date: editingTransaction.date
                    ? new Date(editingTransaction.date).toISOString().split('T')[0]
                    : '',
                category: editingTransaction.category || '',
                description: editingTransaction.description || '',
                paymentMethod: editingTransaction.paymentMethod || ''
            });
        } else {
            setFormData(DEFAULT_FORM);
            setMessage('');
        }
    }, [editingTransaction]);

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage('');

        if (!token) {
            setMessage('Utente non autenticato');
            return;
        }

        if (
            !formData.type ||
            formData.amount === '' ||
            !formData.date ||
            !formData.category.trim() ||
            !formData.description.trim()
        ) {
            setMessage('Compila tutti i campi obbligatori');
            return;
        }

        if (Number(formData.amount) <= 0) {
            setMessage("L'importo deve essere maggiore di 0");
            return;
        }

        try {
            setLoading(true);

            const url = editingTransaction
                ? buildApiUrl(`/api/transactions/${editingTransaction._id}`)
                : buildApiUrl('/api/transactions');

            const method = editingTransaction ? 'PUT' : 'POST';

            const payload = {
                type: formData.type,
                amount: Number(formData.amount),
                date: formData.date,
                category: formData.category.trim(),
                description: formData.description.trim(),
                paymentMethod: formData.paymentMethod.trim()
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                setMessage(data.message || 'Errore durante il salvataggio della transazione');
                return;
            }

            setMessage(
                editingTransaction
                    ? 'Transazione aggiornata con successo'
                    : 'Transazione salvata con successo'
            );

            setFormData(DEFAULT_FORM);

            if (onSuccess) {
                onSuccess(data);
            }
        } catch (error) {
            console.error('Errore submit transazione:', error);
            setMessage('Errore di connessione al server');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form className="transaction-form" onSubmit={handleSubmit}>
            {editingTransaction && (
                <button
                    type="button"
                    onClick={onCancelEdit}
                    className="secondary-action-btn"
                >
                    Annulla modifica
                </button>
            )}

            <select
                name="type"
                value={formData.type}
                onChange={handleChange}
            >
                <option value="expense">Spesa</option>
                <option value="income">Entrata</option>
            </select>

            <input
                type="number"
                name="amount"
                placeholder="Importo"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
            />

            <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
            />

            <select
                name="category"
                value={formData.category}
                onChange={handleChange}
            >
                <option value="">Seleziona categoria</option>
                <option value="Cibo">Cibo</option>
                <option value="Trasporti">Trasporti</option>
                <option value="Shopping">Shopping</option>
                <option value="Casa">Casa</option>
                <option value="Salute">Salute</option>
                <option value="Intrattenimento">Intrattenimento</option>
                <option value="Stipendio">Stipendio</option>
                <option value="Svago">Svago</option>
                <option value="Altro">Altro</option>
            </select>

            <input
                type="text"
                name="description"
                placeholder="Descrizione"
                value={formData.description}
                onChange={handleChange}
            />

            <input
                type="text"
                name="paymentMethod"
                placeholder="Metodo di pagamento"
                value={formData.paymentMethod}
                onChange={handleChange}
            />

            <button
                type="submit"
                disabled={loading}
                className="primary-action-btn"
            >
                {loading
                    ? 'Salvataggio...'
                    : editingTransaction
                        ? 'Aggiorna transazione'
                        : 'Salva transazione'}
            </button>

            {message && <p className="form-message">{message}</p>}
        </form>
    );
}