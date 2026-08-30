/**
 * Manage the Vendus API key in the macOS Keychain. Run `--help` for usage.
 */
import { confirm, password } from '@inquirer/prompts';
import { Command } from 'commander';
import {
    KEYCHAIN_ACCOUNT,
    KEYCHAIN_SERVICE,
    deleteVendusApiKey,
    getVendusApiKey,
    setVendusApiKey,
} from '../src/utils/keychain';
import { VendusApiClient } from '../src/vendus_api_client';
import { VendusApiError } from '../src/utils/vendus_error';

function maskKey(key: string): string {
    return key.length <= 8 ? '****' : `${key.slice(0, 4)}…${key.slice(-4)}`;
}

async function validateKey(key: string): Promise<'valid' | 'invalid' | 'unverifiable'> {
    try {
        await new VendusApiClient({ apiKey: key }).account.get();
        return 'valid';
    } catch (error) {
        if (error instanceof VendusApiError && (error.status === 401 || error.status === 403)) {
            console.error(`  ${error.message}`);
            return 'invalid';
        }
        console.error(`  Could not verify key (${error instanceof Error ? error.message : error})`);
        return 'unverifiable';
    }
}

const program = new Command();
program
    .name('auth')
    .description(
        'Store the Vendus API key in the macOS Keychain.\n' +
            `Keychain item: service "${KEYCHAIN_SERVICE}", account "${KEYCHAIN_ACCOUNT}".\n` +
            'Fetch scripts resolve the key as: VENDUS_API_KEY env var, then Keychain.'
    )
    .showHelpAfterError();

program
    .command('set', { isDefault: true })
    .description('interactively store (or replace) the API key; validates it against the live API')
    .action(async () => {
        const existing = getVendusApiKey();
        if (existing) console.error(`A key is already stored (${maskKey(existing)}).`);
        const key = (
            await password({
                message: 'Paste your Vendus API key (Vendus app > Apps > API):',
                mask: '*',
            })
        ).trim();
        if (!key) {
            console.error('❌ Empty key — nothing stored.');
            process.exit(1);
        }
        console.error('Validating key against the Vendus API…');
        const verdict = await validateKey(key);
        if (verdict === 'valid') {
            console.error('✅ Key is valid.');
        } else {
            const storeAnyway = await confirm({
                message:
                    verdict === 'invalid'
                        ? 'The API rejected this key. Store it anyway?'
                        : 'Could not reach the API to verify. Store it anyway?',
                default: verdict === 'unverifiable',
            });
            if (!storeAnyway) {
                console.error('Nothing stored.');
                process.exit(1);
            }
        }
        setVendusApiKey(key);
        console.error(`✅ Stored in Keychain as ${KEYCHAIN_SERVICE} (${maskKey(key)}).`);
    });

program
    .command('status')
    .description('show whether a key is stored (masked) and whether it works')
    .action(async () => {
        const key = getVendusApiKey();
        if (!key) {
            console.error(`No key stored in Keychain (service ${KEYCHAIN_SERVICE}).`);
            if (process.env.VENDUS_API_KEY) {
                console.error('ℹ️  VENDUS_API_KEY is set in the environment, though.');
            }
            process.exit(1);
        }
        console.error(`Key stored: ${maskKey(key)}`);
        console.error('Validating against the Vendus API…');
        const verdict = await validateKey(key);
        console.error(verdict === 'valid' ? '✅ Key works.' : `❌ Validation result: ${verdict}`);
    });

program
    .command('clear')
    .description('delete the stored key from the Keychain')
    .action(() => {
        if (deleteVendusApiKey()) {
            console.error('✅ Key removed from Keychain.');
        } else {
            console.error('Nothing to remove — no key stored.');
        }
    });

await program.parseAsync();
