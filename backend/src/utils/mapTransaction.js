function normalizeText(value = '') {
    return String(value).trim().replace(/\s+/g, ' ');
}

function normalizeCategory(category = '') {
    const normalized = normalizeText(category);

    if (!normalized) {
        return 'Uncategorized';
    }

    return normalized;
}

function normalizeAmount(amount) {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
        throw new Error('Importo non valido');
    }

    return Number(numericAmount.toFixed(2));
}

function normalizeDate(date) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error('Data non valida');
    }

    return parsedDate;
}

function normalizeTransactionInput(input = {}) {
    return {
        externalTransactionId: normalizeText(input.externalTransactionId || ''),
        accountId: normalizeText(input.accountId || ''),
        amount: normalizeAmount(input.amount),
        currencyCode: normalizeText(input.currencyCode || 'EUR').toUpperCase(),
        description: normalizeText(input.description || ''),
        date: normalizeDate(input.date),
        category: normalizeCategory(input.category),
        source: input.source || 'bank'
    };
}

module.exports = {
    normalizeText,
    normalizeCategory,
    normalizeAmount,
    normalizeDate,
    normalizeTransactionInput
};