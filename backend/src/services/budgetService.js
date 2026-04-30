function evaluateMonthlyBudget({
                                   budget = 0,
                                   currentExpenses = 0,
                                   daysElapsed = 0,
                                   daysInMonth = 30,
                                   projectedTotalExpenses = 0,
                               }) {
    const limit = Number(budget) || 0;

    return {
        limit,
        currentExpenses,
        daysElapsed,
        daysInMonth,
        projectedTotalExpenses,
        remaining: Number((limit - projectedTotalExpenses).toFixed(2)),
        usagePercent: limit > 0
            ? Number(((projectedTotalExpenses / limit) * 100).toFixed(2))
            : null,
        isOverBudget: projectedTotalExpenses > limit,
    };
}

function evaluateCategoryBudgets(categoryBudgets = [], categoryForecast = []) {
    const forecastMap = Object.fromEntries(
        categoryForecast.map(item => [item.category, item.projectedExpense || 0])
    );

    return categoryBudgets.map((budgetItem) => {
        const categoryName = budgetItem.category || budgetItem.name || '';
        const limit = Number(budgetItem.limit ?? budgetItem.amount ?? 0);
        const spent = Number(forecastMap[categoryName] || 0);

        return {
            category: categoryName,
            limit,
            spent,
            remaining: Number((limit - spent).toFixed(2)),
            usagePercent: limit > 0 ? Number(((spent / limit) * 100).toFixed(2)) : null,
            isOverBudget: spent > limit,
        };
    });
}

module.exports = {
    evaluateMonthlyBudget,
    evaluateCategoryBudgets,
};