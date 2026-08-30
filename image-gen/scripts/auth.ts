/**
 * Manage the Gemini API key in the macOS Keychain. Run `--help` for usage.
 *
 * Only the `api` backend uses this key. The default `vertex` backend authenticates
 * with Application Default Credentials (`gcloud auth application-default login`)
 * and needs nothing stored here.
 */
import { password } from '@inquirer/prompts';
import { Command } from 'commander';
import {
    KEYCHAIN_ACCOUNT,
    KEYCHAIN_SERVICE,
    deleteGeminiApiKey,
    getGeminiApiKey,
    setGeminiApiKey,
} from '../src/utils/keychain';

function maskKey(key: string): string {
    return key.length <= 8 ? '****' : `${key.slice(0, 4)}…${key.slice(-4)}`;
}

const program = new Command();
program
    .name('auth')
    .description(
        'Store the Gemini API key in the macOS Keychain.\n' +
            `Keychain item: service "${KEYCHAIN_SERVICE}", account "${KEYCHAIN_ACCOUNT}".\n` +
            'The key is resolved as: GEMINI_API_KEY env var, then Keychain.'
    )
    .showHelpAfterError();

program
    .command('set', { isDefault: true })
    .description('interactively store (or replace) the API key')
    .action(async () => {
        const existing = getGeminiApiKey();
        if (existing) console.error(`A key is already stored (${maskKey(existing)}).`);
        const key = (
            await password({
                message: 'Paste your Gemini API key (aistudio.google.com/apikey):',
                mask: '*',
            })
        ).trim();
        if (!key) {
            console.error('❌ Empty key — nothing stored.');
            process.exit(1);
        }
        setGeminiApiKey(key);
        console.error(`✅ Stored in Keychain as ${KEYCHAIN_SERVICE} (${maskKey(key)}).`);
    });

program
    .command('status')
    .description('show whether a key is stored (masked)')
    .action(() => {
        const key = getGeminiApiKey();
        if (!key) {
            console.error(`No key stored in Keychain (service ${KEYCHAIN_SERVICE}).`);
            if (process.env.GEMINI_API_KEY) {
                console.error('ℹ️  GEMINI_API_KEY is set in the environment, though.');
            }
            process.exit(1);
        }
        console.error(`Key stored: ${maskKey(key)}`);
    });

program
    .command('clear')
    .description('delete the stored key from the Keychain')
    .action(() => {
        if (deleteGeminiApiKey()) {
            console.error('✅ Key removed from Keychain.');
        } else {
            console.error('Nothing to remove — no key stored.');
        }
    });

await program.parseAsync();
