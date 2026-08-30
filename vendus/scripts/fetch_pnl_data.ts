/**
 * CLI shell for the P&L data usecase (src/usecases/pnl_data.ts).
 * Run with --help for full usage; see README.md for context.
 */
import { Command } from 'commander';
import { buildPnlData } from '../src/usecases/pnl_data';
import {
    createVendusClient,
    emitOutput,
    logProgress,
    parseDate,
    parseIntOption,
} from './script_helpers';

interface PnlCliOptions {
    since: string;
    until: string;
    storeId?: number;
    skipDetails: boolean;
    out?: string;
}

const program = new Command();
program
    .name('fetch_pnl_data')
    .description(
        'Fetch Vendus data for a P&L calculation over a period.\n\n' +
            'Pulls, from the Vendus API:\n' +
            '  /documents          every sales document (FT, FS, FR) and credit note (NC)\n' +
            '  /documents/{id}     line items per document (product, qty, amounts) — the\n' +
            '                      basis for product-dependent expenses (COGS)\n' +
            '  /products           catalog with supply prices, to join costs onto items sold\n' +
            '  /reports/daily      per-day gross/net/profit (server-computed cross-check)\n' +
            '  /reports/products   per-product revenue and profit for the period\n' +
            '  /reports/monthly    month totals for each year the period touches\n\n' +
            'API key: VENDUS_API_KEY env var, or Keychain via `bun run auth`.\n' +
            'JSON goes to stdout (or --out); progress goes to stderr.'
    )
    .requiredOption('--since <date>', 'start of the period, YYYY-MM-DD', parseDate)
    .requiredOption('--until <date>', 'end of the period (inclusive), YYYY-MM-DD', parseDate)
    .option('--store-id <id>', 'restrict to a single store', parseIntOption)
    .option('--skip-details', 'skip per-document line-item calls (1 request per document)', false)
    .option('--out <path>', 'write JSON to this file instead of stdout')
    .showHelpAfterError();

async function main(): Promise<void> {
    program.parse();
    const { since, until, storeId, skipDetails, out } = program.opts<PnlCliOptions>();

    const client = createVendusClient();
    console.error(
        `Fetching P&L data for ${since}..${until}${storeId ? ` (store ${storeId})` : ''}`
    );
    const data = await buildPnlData(
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
