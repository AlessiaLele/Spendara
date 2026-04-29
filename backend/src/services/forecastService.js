const { normalizeCategory } = require('../utils/normalizeCategory');
const Budget = require("../models/budget").default;
const { evaluateMonthlyBudget, evaluateCategoryBudgets } = require("./budgetService");

const DAY_MS = 1000 * 60 * 60 * 24;

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function diffInDays(a, b) {
    return Math.abs(startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS;
}

function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

function stdDev(values) {
    if (values.length <= 1) return 0;
    const avg = average(values);
    const variance = average(values.map(v => (v - avg) ** 2));
    return Math.sqrt(variance);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function meanAbsoluteError(actual, predicted) {
    if (!actual.length || actual.length !== predicted.length) return 0;

    let sum = 0;
    for (let i = 0; i < actual.length; i++) {
        sum += Math.abs(actual[i] - predicted[i]);
    }

    return sum / actual.length;
}

function meanAbsolutePercentageError(actual, predicted) {
    if (!actual.length || actual.length !== predicted.length) return 0;

    const validPairs = actual
        .map((a, i) => ({ a, p: predicted[i] }))
        .filter(item => item.a > 0);

    if (!validPairs.length) return 0;

    const sum = validPairs.reduce((acc, item) => {
        return acc + Math.abs((item.a - item.p) / item.a);
    }, 0);

    return (sum / validPairs.length) * 100;
}

function normalizeText(value = '') {
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\d+/g, ' ')
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function createEmptyWeekdayProfiles() {
    return {
        0: { average: 0, median: 0, stdDev: 0, samples: 0 },
        1: { average: 0, median: 0, stdDev: 0, samples: 0 },
        2: { average: 0, median: 0, stdDev: 0, samples: 0 },
        3: { average: 0, median: 0, stdDev: 0, samples: 0 },
        4: { average: 0, median: 0, stdDev: 0, samples: 0 },
        5: { average: 0, median: 0, stdDev: 0, samples: 0 },
        6: { average: 0, median: 0, stdDev: 0, samples: 0 }
    };
}

/**
 * Chiave "larga" per riconoscere movimenti ricorrenti
 * senza vincolare l'importo ad essere identico.
 */
function getRecurringGroupKey(transaction) {
    const normalizedDescription = normalizeText(transaction.description);
    const direction = transaction.amount >= 0 ? 'income' : 'expense';
    const category = normalizeCategory(transaction.category);

    return `${direction}__${category}__${normalizedDescription}`;
}

/**
 * Rileva serie ricorrenti con intervallo circa mensile.
 * Criteri:
 * - almeno 3 occorrenze
 * - intervallo medio tra 25 e 35 giorni
 * - variazione importi contenuta
 */
function detectRecurringTransactions(allTransactions, now, monthEnd) {
    const candidates = allTransactions.filter((transaction) => {
        const txDate = new Date(transaction.date);
        const ageInDays = diffInDays(now, txDate);
        const normalizedDescription = normalizeText(transaction.description);

        return (
            ageInDays <= 180 &&
            normalizedDescription.length >= 4
        );
    });

    const groups = {};

    for (const tx of candidates) {
        const key = getRecurringGroupKey(tx);
        if (!groups[key]) groups[key] = [];
        groups[key].push(tx);
    }

    const recurringSeries = [];

    for (const group of Object.values(groups)) {
        if (group.length < 3) continue;

        const sorted = [...group].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const intervals = [];
        for (let i = 1; i < sorted.length; i++) {
            intervals.push(
                diffInDays(new Date(sorted[i].date), new Date(sorted[i - 1].date))
            );
        }

        const avgInterval = average(intervals);
        const isMonthlyLike = avgInterval >= 25 && avgInterval <= 35;
        if (!isMonthlyLike) continue;

        const amounts = sorted.map(item => Math.abs(item.amount));
        const avgAmount = average(amounts);

        const spreadRatio = avgAmount > 0
            ? (Math.max(...amounts) - Math.min(...amounts)) / avgAmount
            : 0;

        if (spreadRatio > 0.2) continue;

        const lastTx = sorted[sorted.length - 1];
        const predictedNextDate = addDays(new Date(lastTx.date), Math.round(avgInterval));
        const isFutureInCurrentMonth =
            predictedNextDate > now && predictedNextDate <= monthEnd;

        recurringSeries.push({
            key: getRecurringGroupKey(lastTx),
            description: lastTx.description || 'Movimento ricorrente',
            category: normalizeCategory(lastTx.category),
            direction: lastTx.amount >= 0 ? 'income' : 'expense',
            averageAmount: Number(avgAmount.toFixed(2)),
            occurrences: sorted.length,
            averageIntervalDays: Number(avgInterval.toFixed(1)),
            predictedNextDate,
            isFutureInCurrentMonth
        });
    }

    return recurringSeries;
}

/**
 * Mappa giornaliera delle uscite.
 * Inserisce anche i giorni senza spese come 0.
 */
function buildDailyExpenseMap(transactions, startDate, endDate) {
    const map = {};
    let cursor = startOfDay(startDate);
    const safeEnd = endOfDay(endDate);

    while (cursor <= safeEnd) {
        map[cursor.toISOString().slice(0, 10)] = 0;
        cursor = addDays(cursor, 1);
    }

    for (const tx of transactions) {
        if (tx.amount >= 0) continue;

        const txDate = new Date(tx.date);
        const key = startOfDay(txDate).toISOString().slice(0, 10);

        if (map[key] !== undefined) {
            map[key] += Math.abs(tx.amount);
        }
    }

    return map;
}

/**
 * Costruisce profili settimanali:
 * media / mediana / deviazione standard per ciascun giorno della settimana.
 * Gli outlier alti vengono attenuati con filtro avg + 2*stdDev.
 */
function getWeekdayProfiles(dailyMap) {
    const weekdayBuckets = {
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    for (const [dateKey, amount] of Object.entries(dailyMap)) {
        const weekday = new Date(dateKey).getDay();
        weekdayBuckets[weekday].push(amount);
    }

    const weekdayProfiles = {};

    for (const [weekday, values] of Object.entries(weekdayBuckets)) {
        if (!values.length) {
            weekdayProfiles[weekday] = {
                average: 0,
                median: 0,
                stdDev: 0,
                samples: 0
            };
            continue;
        }

        const avg = average(values);
        const sd = stdDev(values);

        const filtered = sd > 0
            ? values.filter(v => v <= avg + 2 * sd)
            : values;

        const usable = filtered.length ? filtered : values;

        weekdayProfiles[weekday] = {
            average: Number(average(usable).toFixed(2)),
            median: Number(median(usable).toFixed(2)),
            stdDev: Number(stdDev(usable).toFixed(2)),
            samples: usable.length
        };
    }

    return weekdayProfiles;
}

/**
 * Trend recente: confronta ultime 4 settimane con le 4 precedenti.
 * Viene limitato tra 0.8 e 1.2 per evitare effetti eccessivi.
 */
function getTrendFactorFromDailyMap(dailyMap) {
    const ordered = Object.entries(dailyMap)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([, amount]) => amount);

    if (ordered.length < 56) {
        return 1;
    }

    const recent = ordered.slice(-28);
    const previous = ordered.slice(-56, -28);

    const recentAvg = average(recent);
    const previousAvg = average(previous);

    if (previousAvg <= 0) {
        return 1;
    }

    return clamp(recentAvg / previousAvg, 0.8, 1.2);
}

/**
 * Previsione delle spese variabili:
 * - storico 90 giorni
 * - profilo per giorno della settimana
 * - trend correttivo
 */
function buildFutureVariableExpenseForecast({
                                                nonRecurringExpenseTransactions,
                                                now,
                                                monthEnd,
                                                historyDays = 90
                                            }) {
    const historyStart = addDays(startOfDay(now), -(historyDays - 1));

    const historyTransactions = nonRecurringExpenseTransactions.filter((tx) => {
        const txDate = new Date(tx.date);
        return txDate >= historyStart && txDate <= now;
    });

    if (!historyTransactions.length) {
        return {
            historyStart,
            historyDays,
            activeExpenseDays: 0,
            historyWindowDays: 0,
            weekdayProfiles: createEmptyWeekdayProfiles(),
            trendFactor: 1,
            globalDailyAverage: 0,
            projectedVariableExpenses: 0,
            dailyPredictions: [],
            dailyMap: {}
        };
    }

    const dailyMap = buildDailyExpenseMap(historyTransactions, historyStart, now);
    const weekdayProfiles = getWeekdayProfiles(dailyMap);
    const globalDailyAverage = average(Object.values(dailyMap));
    const trendFactor = getTrendFactorFromDailyMap(dailyMap);

    const dailyPredictions = [];
    let projectedVariableExpenses = 0;

    let cursor = addDays(startOfDay(now), 1);

    while (cursor <= endOfDay(monthEnd)) {
        const weekday = cursor.getDay();
        const weekdayAvg = weekdayProfiles[weekday]?.average ?? 0;
        const base = weekdayAvg > 0 ? weekdayAvg : globalDailyAverage;
        const predicted = Number((base * trendFactor).toFixed(2));

        dailyPredictions.push({
            date: startOfDay(cursor).toISOString(),
            weekday,
            predictedExpense: predicted
        });

        projectedVariableExpenses += predicted;
        cursor = addDays(cursor, 1);
    }

    projectedVariableExpenses = Number(projectedVariableExpenses.toFixed(2));

    const activeExpenseDays = Object.values(dailyMap).filter(v => v > 0).length;
    const historyWindowDays = Object.keys(dailyMap).length;

    return {
        historyStart,
        historyDays,
        activeExpenseDays,
        historyWindowDays,
        weekdayProfiles,
        trendFactor: Number(trendFactor.toFixed(3)),
        globalDailyAverage: Number(globalDailyAverage.toFixed(2)),
        projectedVariableExpenses,
        dailyPredictions,
        dailyMap
    };
}

/**
 * Previsione per categoria sulle spese variabili:
 * distribuisce il totale previsto in base alla quota storica delle categorie.
 */
function buildCategoryForecast(
    nonRecurringExpenseTransactions,
    now,
    projectedTotal,
    historyDays = 90
) {
    const historyStart = addDays(startOfDay(now), -(historyDays - 1));

    const categoryTotals = {};
    let total = 0;

    for (const tx of nonRecurringExpenseTransactions) {
        const txDate = new Date(tx.date);
        if (txDate < historyStart || txDate > now) continue;

        const category = normalizeCategory(tx.category);
        const value = Math.abs(tx.amount);

        if (!categoryTotals[category]) categoryTotals[category] = 0;
        categoryTotals[category] += value;
        total += value;
    }

    return Object.entries(categoryTotals)
        .map(([category, value]) => {
            const share = total > 0 ? value / total : 0;
            return {
                category,
                historicalShare: Number(share.toFixed(4)),
                projectedExpense: Number((projectedTotal * share).toFixed(2))
            };
        })
        .sort((a, b) => b.projectedExpense - a.projectedExpense);
}

function getForecastConfidence({
                                   historyWindowDays,
                                   activeExpenseDays,
                                   recurringCount,
                                   weekdayProfiles
                               }) {
    const populatedWeekdays = Object.values(weekdayProfiles).filter(
        p => p.samples >= 6
    ).length;

    if (
        historyWindowDays >= 75 &&
        activeExpenseDays >= 25 &&
        recurringCount >= 2 &&
        populatedWeekdays >= 5
    ) {
        return 'alta';
    }

    if (
        historyWindowDays >= 45 &&
        activeExpenseDays >= 12 &&
        populatedWeekdays >= 3
    ) {
        return 'media';
    }

    return 'bassa';
}

/**
 * Simula una previsione al cutoffDate e la confronta con il reale
 * sul resto del mese.
 */
function simulateForecastForDate(allTransactions, cutoffDate) {
    const now = new Date(cutoffDate);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const transactionsUpToCutoff = allTransactions.filter((tx) => {
        const d = new Date(tx.date);
        return d <= now;
    });

    const currentMonthTransactions = transactionsUpToCutoff.filter((tx) => {
        const d = new Date(tx.date);
        return d >= monthStart && d <= now;
    });

    const currentIncome = currentMonthTransactions
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);

    const currentExpenses = currentMonthTransactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const currentBalance = currentIncome - currentExpenses;

    const recurringSeries = detectRecurringTransactions(
        transactionsUpToCutoff,
        now,
        monthEnd
    );

    const remainingRecurringIncome = recurringSeries
        .filter(item => item.direction === 'income' && item.isFutureInCurrentMonth)
        .reduce((sum, item) => sum + item.averageAmount, 0);

    const remainingRecurringExpenses = recurringSeries
        .filter(item => item.direction === 'expense' && item.isFutureInCurrentMonth)
        .reduce((sum, item) => sum + item.averageAmount, 0);

    const recurringKeys = new Set(recurringSeries.map(item => item.key));

    const nonRecurringExpenseTransactions = transactionsUpToCutoff.filter((tx) => {
        const recurringKey = getRecurringGroupKey(tx);
        return tx.amount < 0 && !recurringKeys.has(recurringKey);
    });

    const variableForecast = buildFutureVariableExpenseForecast({
        nonRecurringExpenseTransactions,
        now,
        monthEnd,
        historyDays: 90
    });

    const predictedRemainingExpenses = Number((
        remainingRecurringExpenses + variableForecast.projectedVariableExpenses
    ).toFixed(2));

    const predictedEndBalance = Number((
        currentBalance +
        remainingRecurringIncome -
        predictedRemainingExpenses
    ).toFixed(2));

    const remainingActualTransactions = allTransactions.filter((tx) => {
        const d = new Date(tx.date);
        return d > now && d <= monthEnd;
    });

    const actualRemainingExpenses = Number(
        remainingActualTransactions
            .filter(tx => tx.amount < 0)
            .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
            .toFixed(2)
    );

    const actualMonthTransactions = allTransactions.filter((tx) => {
        const d = new Date(tx.date);
        return d >= monthStart && d <= monthEnd;
    });

    const actualIncome = actualMonthTransactions
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);

    const actualExpenses = actualMonthTransactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const actualEndBalance = Number((actualIncome - actualExpenses).toFixed(2));

    return {
        cutoffDate: now.toISOString(),
        predictedRemainingExpenses,
        actualRemainingExpenses,
        predictedEndBalance,
        actualEndBalance
    };
}

/**
 * Backtest su mesi passati:
 * per ogni mese completo disponibile, simula una previsione al giorno 15
 * e confronta col valore effettivo del resto del mese.
 */
function calculateBacktestMetrics(allTransactions) {
    if (!allTransactions.length) {
        return {
            evaluatedMonths: 0,
            mae: 0,
            mape: 0,
            samples: []
        };
    }

    const sorted = [...allTransactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstDate = new Date(sorted[0].date);
    const today = new Date();

    const monthCursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const candidateMonths = [];

    while (monthCursor < today) {
        candidateMonths.push(new Date(monthCursor));
        monthCursor.setMonth(monthCursor.getMonth() + 1);
    }

    const samples = [];

    for (const monthStart of candidateMonths) {
        const year = monthStart.getFullYear();
        const month = monthStart.getMonth();

        const simulatedCutoff = new Date(year, month, 15, 12, 0, 0, 0);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

        if (simulatedCutoff >= today) continue;
        if (monthEnd >= endOfDay(today)) continue;

        const monthTransactions = allTransactions.filter((tx) => {
            const d = new Date(tx.date);
            return d >= monthStart && d <= monthEnd;
        });

        if (monthTransactions.length < 5) continue;

        const sample = simulateForecastForDate(allTransactions, simulatedCutoff);

        samples.push({
            month: `${year}-${String(month + 1).padStart(2, '0')}`,
            predictedRemainingExpenses: sample.predictedRemainingExpenses,
            actualRemainingExpenses: sample.actualRemainingExpenses,
            predictedEndBalance: sample.predictedEndBalance,
            actualEndBalance: sample.actualEndBalance
        });
    }

    const actual = samples.map(s => s.actualRemainingExpenses);
    const predicted = samples.map(s => s.predictedRemainingExpenses);

    const mae = meanAbsoluteError(actual, predicted);
    const mape = meanAbsolutePercentageError(actual, predicted);

    return {
        evaluatedMonths: samples.length,
        mae: Number(mae.toFixed(2)),
        mape: Number(mape.toFixed(2)),
        samples
    };
}

async function buildMonthlyForecast(allTransactions, userId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const currentMonthTransactions = allTransactions.filter((tx) => {
        const d = new Date(tx.date);
        return d >= monthStart && d <= now;
    });

    const currentIncome = currentMonthTransactions
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);

    const currentExpenses = currentMonthTransactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const currentBalance = Number((currentIncome - currentExpenses).toFixed(2));

    const recurringSeries = detectRecurringTransactions(allTransactions, now, monthEnd);

    const remainingRecurringIncomeItems = recurringSeries
        .filter(item => item.direction === 'income' && item.isFutureInCurrentMonth)
        .map(item => ({
            description: item.description,
            category: item.category,
            amount: item.averageAmount,
            predictedDate: new Date(item.predictedNextDate).toISOString()
        }));

    const remainingRecurringExpenseItems = recurringSeries
        .filter(item => item.direction === 'expense' && item.isFutureInCurrentMonth)
        .map(item => ({
            description: item.description,
            category: item.category,
            amount: item.averageAmount,
            predictedDate: new Date(item.predictedNextDate).toISOString()
        }));

    const remainingRecurringIncome = Number(
        remainingRecurringIncomeItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
    );

    const remainingRecurringExpenses = Number(
        remainingRecurringExpenseItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
    );

    const recurringKeys = new Set(recurringSeries.map(item => item.key));

    const nonRecurringExpenseTransactions = allTransactions.filter((tx) => {
        const recurringKey = getRecurringGroupKey(tx);
        return tx.amount < 0 && !recurringKeys.has(recurringKey);
    });

    const variableForecast = buildFutureVariableExpenseForecast({
        nonRecurringExpenseTransactions,
        now,
        monthEnd,
        historyDays: 90
    });

    const categoryForecast = buildCategoryForecast(
        nonRecurringExpenseTransactions,
        now,
        variableForecast.projectedVariableExpenses,
        90
    );

    const daysRemaining = variableForecast.dailyPredictions.length;

    const predictedEndBalance = Number((
        currentBalance +
        remainingRecurringIncome -
        remainingRecurringExpenses -
        variableForecast.projectedVariableExpenses
    ).toFixed(2));

    const nowMonth = now.getMonth();
    const nowYear = now.getFullYear();

    const budgetDoc = await Budget.findOne({
        userId: userId,
        month: nowMonth,
        year: nowYear,
    });

    let budgetAnalysis = null;

    let categoryBudgetAnalysis = [];

    if (budgetDoc && budgetDoc.categoryBudgets?.length) {
        categoryBudgetAnalysis = evaluateCategoryBudgets(
            categoryForecast,
            budgetDoc.categoryBudgets
        );
    }

    if (budgetDoc) {
        const daysElapsed = Math.ceil(
            (now - monthStart) / (1000 * 60 * 60 * 24)
        );

        const daysInMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
        ).getDate();

        const totalProjectedExpenses =
            currentExpenses +
            remainingRecurringExpenses +
            variableForecast.projectedVariableExpenses;

        budgetAnalysis = evaluateMonthlyBudget({
            budget: budgetDoc.totalBudget,
            currentExpenses,
            daysElapsed,
            daysInMonth,
            projectedTotalExpenses: totalProjectedExpenses,
        });
    }

    const backtest = calculateBacktestMetrics(allTransactions);

    return {
        model: 'seasonal_weekday_trend_v2',
        currentBalance,
        remainingRecurringIncome,
        remainingRecurringExpenses,
        averageDailyVariableExpenses: variableForecast.globalDailyAverage,
        projectedVariableExpenses: variableForecast.projectedVariableExpenses,
        predictedEndBalance,
        daysRemaining,
        activeExpenseDays: variableForecast.activeExpenseDays,

        confidence: getForecastConfidence({
            historyWindowDays: variableForecast.historyWindowDays,
            activeExpenseDays: variableForecast.activeExpenseDays,
            recurringCount:
                remainingRecurringIncomeItems.length + remainingRecurringExpenseItems.length,
            weekdayProfiles: variableForecast.weekdayProfiles
        }),

        recurringSummary: {
            detectedSeries: recurringSeries.length,
            futureIncomeItems: remainingRecurringIncomeItems.length,
            futureExpenseItems: remainingRecurringExpenseItems.length
        },

        recurringIncomeItems: remainingRecurringIncomeItems,
        recurringExpenseItems: remainingRecurringExpenseItems,

        budgetAnalysis,
        budgetAnalysis,
        categoryBudgetAnalysis,

        variableModel: {
            historyDays: variableForecast.historyDays,
            historyWindowDays: variableForecast.historyWindowDays,
            trendFactor: variableForecast.trendFactor,
            weekdayProfiles: variableForecast.weekdayProfiles,
            dailyPredictions: variableForecast.dailyPredictions
        },

        categoryForecast,
        validation: backtest
    };
}

module.exports = {
    buildMonthlyForecast
};