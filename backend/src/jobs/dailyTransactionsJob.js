const cron = require('node-cron');
const BankConnection = require('../models/BankConnection');
const { syncBankConnection } = require('../services/tinkSyncService');

const DEFAULT_CRON = process.env.TINK_DAILY_SYNC_CRON || '30 2 * * *';
const DEFAULT_TIMEZONE = process.env.TINK_TIMEZONE || 'Europe/Rome';

let isJobRunning = false;

function getRomeDateKey(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: DEFAULT_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

function isSameRomeDay(a, b = new Date()) {
    return getRomeDateKey(a) === getRomeDateKey(b);
}

async function runDailyTransactionsJob({ force = false } = {}) {
    if (isJobRunning) {
        console.log('[dailyTransactionsJob] Job già in esecuzione, salto questo giro.');
        return [];
    }

    isJobRunning = true;

    try {
        const connectedBanks = await BankConnection.find({
            provider: 'tink',
            status: 'connected'
        }).lean();

        let importedTotal = 0;
        let skipped = 0;
        let failed = 0;
        const results = [];

        for (const bankConnection of connectedBanks) {
            try {
                const lastSyncAt = bankConnection.lastSyncAt ? new Date(bankConnection.lastSyncAt) : null;
                const alreadySyncedToday = lastSyncAt ? isSameRomeDay(lastSyncAt) : false;

                if (!force && alreadySyncedToday) {
                    skipped += 1;
                    results.push({
                        ok: true,
                        skipped: true,
                        userId: bankConnection.userId?.toString?.() || String(bankConnection.userId),
                        reason: 'already_synced_today'
                    });
                    continue;
                }

                const result = await syncBankConnection(bankConnection.userId.toString(), {
                    forceFullSync: !bankConnection.lastSyncAt
                });

                importedTotal += result.importedTransactions || 0;

                results.push({
                    ok: true,
                    skipped: false,
                    userId: bankConnection.userId?.toString?.() || String(bankConnection.userId),
                    importedTransactions: result.importedTransactions || 0
                });
            } catch (error) {
                failed += 1;

                console.error(
                    `[dailyTransactionsJob] Errore sync user=${bankConnection.userId}:`,
                    error.message || error
                );

                await BankConnection.findOneAndUpdate(
                    {
                        userId: bankConnection.userId,
                        provider: 'tink'
                    },
                    {
                        $set: {
                            lastSyncError: error.message || 'Errore sync automatico Tink'
                        }
                    },
                    { new: true }
                );

                results.push({
                    ok: false,
                    userId: bankConnection.userId?.toString?.() || String(bankConnection.userId),
                    error: error.message || 'Errore sync automatico Tink'
                });
            }
        }

        console.log(
            `[dailyTransactionsJob] Sync completata: ${connectedBanks.length} connessioni, ${importedTotal} transazioni importate, ${skipped} già sincronizzate oggi, ${failed} errori.`
        );

        return results;
    } catch (error) {
        console.error('[dailyTransactionsJob] Errore durante la sincronizzazione automatica:', error);
        return [];
    } finally {
        isJobRunning = false;
    }
}

function startDailyTransactionsJob() {
    cron.schedule(
        DEFAULT_CRON,
        () => {
            runDailyTransactionsJob();
        },
        {
            timezone: DEFAULT_TIMEZONE
        }
    );

    console.log(
        `[dailyTransactionsJob] Scheduler attivo: ${DEFAULT_CRON} (${DEFAULT_TIMEZONE})`
    );
}

module.exports = {
    startDailyTransactionsJob,
    runDailyTransactionsJob
};