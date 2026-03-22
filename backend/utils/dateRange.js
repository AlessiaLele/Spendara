function getDateRange(period = 'month') {
    const now = new Date();
    let start;
    let end;

    switch (period) {
        case 'day':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;

        case 'week': {
            const day = now.getDay(); // 0 = domenica, 1 = lunedì
            const diffToMonday = day === 0 ? 6 : day - 1;

            start = new Date(now);
            start.setDate(now.getDate() - diffToMonday);
            start.setHours(0, 0, 0, 0);

            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        }

        case 'year':
            start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;

        case 'month':
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
    }

    return { start, end };
}

module.exports = { getDateRange };