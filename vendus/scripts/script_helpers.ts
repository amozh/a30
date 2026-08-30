/**
 * CLI-only helpers. Business logic lives in src/usecases/ and src/fetchers/ —
 * import those directly when composing custom analyses.
 */
import { InvalidArgumentError } from 'commander';
import { getVendusApiKey } from '../src/utils/keychain';
import { VendusApiClient } from '../src/vendus_api_client';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** commander argParser for YYYY-MM-DD option values */
function parseDate(value: string): string {
    if (!DATE_PATTERN.test(value)) {
        throw new InvalidArgumentError('expected YYYY-MM-DD');
    }
    return value;
}

/** commander argParser for integer option values */
function parseIntOption(value: string): number {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        throw new InvalidArgumentError('expected an integer');
    }
    return parsed;
}

/** Resolution order: VENDUS_API_KEY env var, then macOS Keychain. */
function resolveApiKey(): string {
    const fromEnv = process.env.VENDUS_API_KEY;
    if (fromEnv) return fromEnv;
    const fromKeychain = getVendusApiKey();
    if (fromKeychain) return fromKeychain;
    console.error(
        '❌ No Vendus API key found. Run `bun run auth` to store one in the Keychain (or set VENDUS_API_KEY).'
    );
    process.exit(1);
}

function createVendusClient(): VendusApiClient {
    return new VendusApiClient({ apiKey: resolveApiKey() });
}

/** Progress logger for usecases: stderr, keeping stdout clean for JSON. */
function logProgress(message: string): void {
    console.error(message);
}

async function emitOutput(payload: unknown, outPath: string | undefined): Promise<void> {
    const json = JSON.stringify(payload, null, 2);
    if (outPath) {
        await Bun.write(outPath, `${json}\n`);
        console.error(`✅ Wrote ${outPath}`);
    } else {
        console.log(json);
    }
}

export { parseDate, parseIntOption, createVendusClient, logProgress, emitOutput };
