function TransactionsList({
                              transactions,
                              onEditTransaction,
                              onDeleteTransaction
                          }) {
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    };

    const formatSource = (source) => {
        if (source === 'cash') return 'Cash';
        if (source === 'simulated') return 'Simulata';
        return 'Banca';
    };

    if (!transactions || transactions.length === 0) {
        return (
            <div className="empty-state">
                Nessuna transazione trovata.
                <span>
                    Dopo il collegamento del conto o l’inserimento manuale, i dati appariranno qui.
                </span>
            </div>
        );
    }

    return (
        <div className="table-wrapper">
            <table>
                <thead>
                <tr>
                    <th>Descrizione</th>
                    <th>Categoria</th>
                    <th>Data</th>
                    <th>Importo</th>
                    <th>Fonte</th>
                    <th>Azioni</th>
                </tr>
                </thead>
                <tbody>
                {transactions.map((transaction) => {
                    const isManual = transaction.source === 'cash';

                    return (
                        <tr key={transaction._id}>
                            <td>{transaction.description || 'Senza descrizione'}</td>
                            <td>{transaction.category || 'Uncategorized'}</td>
                            <td>{new Date(transaction.date).toLocaleDateString('it-IT')}</td>
                            <td
                                className={
                                    transaction.amount >= 0
                                        ? 'amount-income'
                                        : 'amount-expense'
                                }
                            >
                                {formatAmount(transaction.amount)}
                            </td>
                            <td>{formatSource(transaction.source)}</td>
                            <td>
                                {isManual ? (
                                    <div className="table-actions">
                                        <button
                                            type="button"
                                            className="edit-action-btn"
                                            onClick={() => onEditTransaction(transaction)}
                                        >
                                            Modifica
                                        </button>

                                        <button
                                            type="button"
                                            className="delete-action-btn"
                                            onClick={() => onDeleteTransaction(transaction._id)}
                                        >
                                            Elimina
                                        </button>
                                    </div>
                                ) : (
                                    '—'
                                )}
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}

export default TransactionsList;