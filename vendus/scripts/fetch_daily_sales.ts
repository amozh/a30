/**
 * CLI shell for the daily-sales usecase (src/usecases/daily_sales.ts).
 * Run with --help for full usage; see README.md for context.
 */
import { Command } from 'commander';
import { buildDailySales } from '../src/usecases/daily_sales';
import {
    createVendusClient,
    emitOutput,
    logProgress,
    parseDate,
    parseIntOption,
} from './script_helpers';

interface DailySalesCliOptions {
    date: string;
    until?: string;
    storeId?: number;
    skipDetails: boolean;
    out?: string;
}

const program = new Command();
program
    .name('fetch_daily_sales')
    .description(
        'Fetch Vendus data to analyze daily sales for issues: credit notes\n' +
            'and their originals, suspected duplicated orders, canceled\n' +
            'documents, cash movements.\n\n' +
            'Pulls, from the Vendus API:\n' +
            '  /documents                 all docs in the period, all types\n' +
            '  /documents/{id}            items, payments, related_docs\n' +
            '                             (credit note - original link)\n' +
            '  /documents/types           decode table for type codes\n' +
            '  /documents/paymentmethods  decode table for payment codes\n' +
            '  /registers/{id}/movements  cash in/out/open/close\n\n' +
            'API key: VENDUS_API_KEY env var, or Keychain (`bun run auth`).\n' +
            'JSON goes to stdout (or --out); progress goes to stderr.'
    )
    .requiredOption('--date <date>', 'day to analyze, YYYY-MM-DD', parseDate)
    .option('--until <date>', 'extend into a range ending this day (inclusive)', parseDate)
    .option('--store-id <id>', 'restrict to a single store', parseIntOption)
    .option('--skip-details', 'skip per-document detail calls (1 request per document)', false)
    .option('--out <path>', 'write JSON to this file instead of stdout')
    .showHelpAfterError();

async function main(): Promise<void> {
    program.parse();
    const {
        date: since,
        until = since,
        storeId,
        skipDetails,
        out,
    } = program.opts<DailySalesCliOptions>();

    const client = createVendusClient();
    console.error(
        `Fetching sales data for ${since}..${until}${storeId ? ` (store ${storeId})` : ''}`
    );
    const data = await buildDailySales(
        client,
        { since, until, storeId, includeDetails: !skipDetails },
        logProgress
    );
    await emitOutput(data, out);
}

main().catch((error) => {
    console.error('❌', error instanceof Error ? error.message : error);
    process.exit(1);
});
