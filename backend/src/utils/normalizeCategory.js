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

        home: 'Casa',
        housing: 'Casa',
        casa: 'Casa',

        salary: 'Stipendio',
        stipendio: 'Stipendio',

        income: 'Entrate',
        entrate: 'Entrate',

        refund: 'Rimborso',
        rimborso: 'Rimborso',

        other: 'Altro',
        altro: 'Altro'
    };

    return categoryMap[raw] || null;
}

module.exports = {
    normalizeCategory
};