function normalizeCategory(category) {
    const raw = String(category || '')
        .trim()
        .toLowerCase();

    const categoryMap = {
        shopping: 'Shopping',
        acquisti: 'Shopping',

        groceries: 'Spesa',
        grocery: 'Spesa',
        food: 'Spesa',
        alimentari: 'Spesa',
        spesa: 'Spesa',
        supermercato: 'Spesa',

        bills: 'Bollette',
        bollette: 'Bollette',
        utilities: 'Bollette',
        utenze: 'Bollette',

        transport: 'Trasporti',
        trasporti: 'Trasporti',
        mobility: 'Trasporti',
        viaggio: 'Trasporti',

        entertainment: 'Intrattenimento',
        intrattenimento: 'Intrattenimento',
        svago: 'Intrattenimento',
        leisure: 'Intrattenimento',

        health: 'Salute',
        salute: 'Salute',
        medical: 'Salute',

        rent: 'Affitto',
        affitto: 'Affitto',

        salary: 'Stipendio',
        stipendio: 'Stipendio',

        income: 'Entrate',
        entrate: 'Entrate',

        uncategorized: 'Non categorizzato',
        'non categorizzato': 'Non categorizzato',

        other: 'Altro',
        altro: 'Altro'
    };

    if (!raw) {
        return 'Non categorizzato';
    }

    return categoryMap[raw] || (
        raw.charAt(0).toUpperCase() + raw.slice(1)
    );
}

module.exports = {
    normalizeCategory
};