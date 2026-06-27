const { normalizeCategory } = require('../utils/normalizeCategory');
const Budget = require("../models/Budget");
const { evaluateMonthlyBudget, evaluateBudgetConsumption, evaluateCategoryBudgets } = require("./budgetService");
const User = require("../models/User");

const DAY_MS = 1000 * 60 * 60 * 24;

function diffInDays(a, b) {
    const start = new Date(a); start.setHours(0, 0, 0, 0);
    const end = new Date(b);   end.setHours(0, 0, 0, 0);
    return Math.abs(start.getTime() - end.getTime()) / DAY_MS;
}

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
            startOfDay(predictedNextDate) >= startOfDay(now) &&
            startOfDay(predictedNextDate) <= startOfDay(monthEnd);

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
function buildDailyExpenseMap(transactions, startDate, endDate, now) {
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
            const daysAgo = diffInDays(now, txDate);
            const decay = exponentialDecay(daysAgo);

            map[key] += Math.abs(tx.amount) * decay;
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

    if (ordered.length < 42) {
        return 1;
    }

    const recent = ordered.slice(-21);
    const previous = ordered.slice(-42, -21);

    const recentWeighted = weightedAverage(recent);
    const previousWeighted = weightedAverage(previous);

    if (previousWeighted <= 0) {
        return 1;
    }

    return clamp(recentWeighted / previousWeighted, 0.75, 1.25);
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

    const dailyMap = buildDailyExpenseMap(historyTransactions, historyStart, now, now);
    const weekdayProfiles = getWeekdayProfiles(dailyMap);
    const globalDailyAverage = average(Object.values(dailyMap));
    const trendFactor = getTrendFactorFromDailyMap(dailyMap);

    const dailyPredictions = [];
    let projectedVariableExpenses = 0;

    let cursor = addDays(startOfDay(now), 1);

    while (cursor <= endOfDay(monthEnd)) {
        const weekday = cursor.getDay();
        const weekdayAvg = weekdayProfiles[weekday]?.average ?? 0;
        const weekdayMedian = weekdayProfiles[weekday]?.median ?? 0;

        const blendedWeekdayValue =
            weekdayAvg > 0
                ? (weekdayAvg * 0.7) + (weekdayMedian * 0.3)
                : globalDailyAverage;

        const base = blendedWeekdayValue;
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
                projectedExpense: Number((projectedTotal * share).toFixed(2)),
                spent: Number(value.toFixed(2))
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

    const today = new Date();
    const candidateMonths = [];

// ultimi 6 mesi COMPLETI precedenti al mese corrente
    for (let i = 6; i >= 1; i--) {
        candidateMonths.push(
            new Date(
                today.getFullYear(),
                today.getMonth() - i,
                1
            )
        );
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

function weightedAverage(values) {
    if (!values.length) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    values.forEach((value, index) => {
        const weight = index + 1;
        weightedSum += value * weight;
        totalWeight += weight;
    });

    return weightedSum / totalWeight;
}

function exponentialDecay(daysAgo, lambda = 0.015) {
    return Math.exp(-lambda * daysAgo);
}

function calculateForecastScore({
                                    historyWindowDays,
                                    activeExpenseDays,
                                    recurringCount,
                                    weekdayProfiles,
                                    mape
                                }) {
    let score = 0;

    score += Math.min(historyWindowDays / 90, 1) * 30;
    score += Math.min(activeExpenseDays / 30, 1) * 25;
    score += Math.min(recurringCount / 5, 1) * 20;

    const populatedWeekdays = Object.values(weekdayProfiles).filter(
        p => p.samples >= 6
    ).length;

    score += (populatedWeekdays / 7) * 15;

    const accuracyPenalty = Math.min(mape / 50, 1) * 10;

    score -= accuracyPenalty;

    return clamp(Math.round(score), 0, 100);
}

function naiveForecast(dailyMap, remainingDays) {
    const values = Object.values(dailyMap);

    if (!values.length) return 0;

    const avg = average(values);

    return avg * remainingDays;
}

function isAnomalousExpense(amount, values) {
    const avg = average(values);
    const sd = stdDev(values);

    return amount > avg + (3 * sd);
}

function buildSpentByCategory(transactions) {
    const map = { all: 0 };

    for (const tx of transactions) {
        if (tx.amount >= 0) continue;

        const category = normalizeCategory(tx.category);
        const amount = Math.abs(Number(tx.amount || 0));

        map.all += amount;

        if (!map[category]) map[category] = 0;
        map[category] += amount;
    }

    return map;
}

function buildProjectedByCategory(categoryForecast, recurringExpenseItems) {
    const map = { all: 0 };

    for (const item of categoryForecast || []) {
        const category = normalizeCategory(item.category);
        const amount = Number(item.projectedExpense || 0);

        map.all += amount;

        if (!map[category]) map[category] = 0;
        map[category] += amount;
    }

    for (const item of recurringExpenseItems || []) {
        const category = normalizeCategory(item.category);
        const amount = Number(item.amount || 0);

        map.all += amount;

        if (!map[category]) map[category] = 0;
        map[category] += amount;
    }

    return map;
}

async function buildMonthlyForecast(allTransactions, userId) {
    const now = new Date();
    const user = await User.findById(userId).lean();

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

    let scheduledSalaryItem = null;

    if (user?.salaryAmount > 0) {
        const requestedSalaryDay = user.salaryDay || 10;

        // Clamp sull'ultimo giorno del mese corrente: evita che, ad es.,
        // un salaryDay=31 in un mese da 30 giorni trabocchi nel mese successivo.
        const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const salaryDay = Math.min(requestedSalaryDay, daysInCurrentMonth);

        const salaryDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            salaryDay,
            12, 0, 0, 0
        );

        const alreadyReceivedSalary = currentMonthTransactions.some(tx => {
            if (tx.amount <= 0) return false;

            const txDate = new Date(tx.date);

            const sameDay = txDate.getDate() === salaryDay;
            const similarAmount = Math.abs(tx.amount - user.salaryAmount) <= 5;

            return sameDay && similarAmount;
        });

        if (now < salaryDate && !alreadyReceivedSalary) {
            scheduledSalaryItem = {
                description: 'Stipendio programmato',
                category: 'income',
                amount: user.salaryAmount,
                predictedDate: salaryDate.toISOString()
            };
        }
    }

    const recurringSeries = detectRecurringTransactions(allTransactions, now, monthEnd);

    const remainingRecurringIncomeItems = recurringSeries
        .filter(item => item.direction === 'income' && item.isFutureInCurrentMonth)
        .map(item => ({
            description: item.description,
            category: item.category,
            amount: item.averageAmount,
            predictedDate: new Date(item.predictedNextDate).toISOString()
        }));

    if (scheduledSalaryItem) {
        remainingRecurringIncomeItems.push(scheduledSalaryItem);
    }

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

    const currentSpentByCategory = buildSpentByCategory(currentMonthTransactions);
    const projectedSpentByCategory = buildProjectedByCategory(
        categoryForecast,
        remainingRecurringExpenseItems
    );

    const daysRemaining = variableForecast.dailyPredictions.length;

    const naiveProjectedExpenses = naiveForecast(
        variableForecast.dailyMap,
        daysRemaining
    );

    const predictedEndBalance = Number((
        currentBalance +
        remainingRecurringIncome -
        remainingRecurringExpenses -
        variableForecast.projectedVariableExpenses
    ).toFixed(2));

    let budgetAnalysis = null;
    let categoryBudgetAnalysis = [];

    try {
        const budgetDoc = await Budget.findOne({
            userId: userId,
            month: now.getMonth(),
            year: now.getFullYear(),
        }).lean();

        if (budgetDoc) {
            const totalBudget = Number(
                budgetDoc.totalBudget ?? budgetDoc.amount ?? budgetDoc.budgetAmount ?? 0
            );

            if (budgetDoc.categoryBudgets?.length && typeof evaluateCategoryBudgets === 'function') {
                categoryBudgetAnalysis = evaluateCategoryBudgets(
                    budgetDoc.categoryBudgets,
                    currentSpentByCategory,
                    projectedSpentByCategory
                );
            }

            if (totalBudget > 0) {
                const totalProjectedExpenses =
                    currentExpenses +
                    remainingRecurringExpenses +
                    variableForecast.projectedVariableExpenses;

                // status basato sullo speso reale: in questa card (Budget per categoria)
                // spent/limit/usagePercent sono tutti reali, quindi anche il badge deve esserlo
                // per non contraddire i numeri mostrati. Il dato previsionale resta disponibile
                // in budgetAnalysis (card "Budget mensile" → Previsto a fine mese).
                const allItem = {
                    category: 'all',
                    limit: totalBudget,
                    spent: Number(currentExpenses.toFixed(2)),
                    projected: Number((totalProjectedExpenses - currentExpenses).toFixed(2)),
                    total: Number(currentExpenses.toFixed(2)),
                    remaining: Number((totalBudget - currentExpenses).toFixed(2)),
                    usagePercent: Number(((currentExpenses / totalBudget) * 100).toFixed(2)),
                    isOverBudget: currentExpenses > totalBudget,
                    status:
                        currentExpenses >= totalBudget
                            ? 'over'
                            : currentExpenses >= totalBudget * (budgetDoc.criticalThreshold ?? 0.95)
                                ? 'critical'
                                : currentExpenses >= totalBudget * (budgetDoc.warningThreshold ?? 0.8)
                                    ? 'warning'
                                    : 'ok'
                };

                categoryBudgetAnalysis = [allItem, ...categoryBudgetAnalysis];
            }

            if (typeof evaluateMonthlyBudget === 'function') {
                const daysElapsed = Math.ceil((now - monthStart) / DAY_MS);

                const daysInMonth = new Date(
                    now.getFullYear(),
                    now.getMonth() + 1,
                    0
                ).getDate();

                const totalProjectedExpenses =
                    currentExpenses +
                    remainingRecurringExpenses +
                    variableForecast.projectedVariableExpenses;

                const budgetUtilizationPct = totalBudget > 0
                    ? Number(((currentExpenses / totalBudget) * 100).toFixed(1))
                    : null;

                const projectedBudgetUtilizationPct = totalBudget > 0
                    ? Number(((totalProjectedExpenses / totalBudget) * 100).toFixed(1))
                    : null;

                const budgetStatus =
                    totalBudget <= 0
                        ? 'none'
                        : totalProjectedExpenses >= totalBudget
                            ? 'over'
                            : totalProjectedExpenses >= totalBudget * (budgetDoc?.criticalThreshold ?? 0.95)
                                ? 'critical'
                                : totalProjectedExpenses >= totalBudget * (budgetDoc?.warningThreshold ?? 0.8)
                                    ? 'warning'
                                    : 'ok';

                const budgetConsumption = evaluateBudgetConsumption({
                    budget: totalBudget,
                    spent: currentExpenses
                });

                budgetAnalysis = {
                    totalBudget,
                    spent: Number(currentExpenses.toFixed(2)),
                    remaining: Number(Math.max(totalBudget - currentExpenses, 0).toFixed(2)),
                    spentUtilizationPct: budgetConsumption.spentUtilizationPct,
                    spendingStatus: budgetConsumption.status,
                    spendingMessage: budgetConsumption.message,
                    actualIsOverBudget: budgetConsumption.isOverBudget,
                    actualIsFullySpent: budgetConsumption.isFullySpent,
                    projectedTotalExpenses: Number(totalProjectedExpenses.toFixed(2)),
                    variance: Number((totalProjectedExpenses - totalBudget).toFixed(2)),
                    variancePct: totalBudget > 0
                        ? Number((((totalProjectedExpenses - totalBudget) / totalBudget) * 100).toFixed(1))
                        : null,
                    exceeded: totalBudget > 0 ? totalProjectedExpenses > totalBudget : false,
                    warningThreshold: budgetDoc?.warningThreshold ?? 0.8,
                    criticalThreshold: budgetDoc?.criticalThreshold ?? 0.95,
                    status: budgetStatus,
                    utilizationPct: budgetUtilizationPct,
                    projectedUtilizationPct: projectedBudgetUtilizationPct,
                    monthlyEvaluation: evaluateMonthlyBudget({
                        budget: totalBudget,
                        currentExpenses,
                        daysElapsed,
                        daysInMonth,
                        projectedTotalExpenses: totalProjectedExpenses,
                    })
                };
            }
        }
    } catch (error) {
        console.warn('Budget analysis skipped:', error.message);
    }

    const backtest = calculateBacktestMetrics(allTransactions);

    const forecastScore = calculateForecastScore({
        historyWindowDays: variableForecast.historyWindowDays,
        activeExpenseDays: variableForecast.activeExpenseDays,
        recurringCount: recurringSeries.length,
        weekdayProfiles: variableForecast.weekdayProfiles,
        mape: backtest.mape
    });

    return {
        model: 'Hybrid Seasonal Financial Forecaster',
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

        forecastScore,

        recurringSummary: {
            detectedSeries: recurringSeries.length,
            futureIncomeItems: remainingRecurringIncomeItems.length,
            futureExpenseItems: remainingRecurringExpenseItems.length
        },

        recurringIncomeItems: remainingRecurringIncomeItems,
        recurringExpenseItems: remainingRecurringExpenseItems,

        budgetAnalysis,
        categoryBudgetAnalysis,

        variableModel: {
            historyDays: variableForecast.historyDays,
            historyWindowDays: variableForecast.historyWindowDays,
            trendFactor: variableForecast.trendFactor,
            weekdayProfiles: variableForecast.weekdayProfiles,
            dailyPredictions: variableForecast.dailyPredictions
        },

        baselineComparison: {
            naiveProjectedExpenses: Number(naiveProjectedExpenses.toFixed(2)),
            advancedProjectedExpenses: variableForecast.projectedVariableExpenses,
            improvement:
                naiveProjectedExpenses > 0
                    ? Number((
                        (
                            naiveProjectedExpenses -
                            variableForecast.projectedVariableExpenses
                        ) / naiveProjectedExpenses
                    ).toFixed(3))
                    : 0
        },

        explainability: {
            recurringImpact: remainingRecurringExpenses,
            variableImpact: variableForecast.projectedVariableExpenses,
            trendFactor: variableForecast.trendFactor,
            strongestCategories: categoryForecast.slice(0, 3)
        },

        categoryForecast,
        validation: backtest
    };
}

module.exports = {
    buildMonthlyForecast
};