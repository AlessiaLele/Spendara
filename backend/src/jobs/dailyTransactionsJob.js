const cron = require('node-cron');
const { syncAllConnectedBankConnections } = require('../services/tinkSyncService');

const DEFAULT_CRON = process.env.TINK_DAILY_SYNC_CRON || '30 2 * * *';
const DEFAULT_TIMEZONE = process.env.TINK_TIMEZONE || 'Europe/Rome';

async function runDailyTransactionsJob() {
    try {
        const results = await syncAllConnectedBankConnections();
        const imported = results.filter(result => result.ok).reduce((sum, result) => sum + (result.importedTransactions || 0), 0);
        const failed = results.filter(result => !result.ok).length;

        console.log(`[dailyTransactionsJob] Sync completata: ${results.length} connessioni, ${imported} transazioni importate, ${failed} errori.`);
        return results;
    } catch (error) {
        console.error('[dailyTransactionsJob] Errore durante la sincronizzazione automatica:', error);
        return [];
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

    setTimeout(() => {
        runDailyTransactionsJob();
    }, 5000);
}

module.exports = { startDailyTransactionsJob, runDailyTransactionsJob };