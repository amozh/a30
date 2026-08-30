/**
 * Vendus API key storage in the macOS Keychain (via the `security` CLI),
 * so the key never lives in a file.
 */
const KEYCHAIN_SERVICE = 'a30-vendus-api-key';
const KEYCHAIN_ACCOUNT = process.env.USER ?? 'a30';

function runSecurity(args: string[]): { exitCode: number; stdout: string; stderr: string } {
    const result = Bun.spawnSync(['security', ...args]);
    return {
        exitCode: result.exitCode,
        stdout: new TextDecoder().decode(result.stdout).trim(),
        stderr: new TextDecoder().decode(result.stderr).trim(),
    };
}

function getVendusApiKey(): string | null {
    const result = runSecurity([
        'find-generic-password',
        '-s',
        KEYCHAIN_SERVICE,
        '-a',
        KEYCHAIN_ACCOUNT,
        '-w',
    ]);
    return result.exitCode === 0 && result.stdout ? result.stdout : null;
}

function setVendusApiKey(key: string): void {
    // -U updates the item in place if it already exists
    const result = runSecurity([
        'add-generic-password',
        '-U',
        '-s',
        KEYCHAIN_SERVICE,
        '-a',
        KEYCHAIN_ACCOUNT,
        '-w',
        key,
    ]);
    if (result.exitCode !== 0) {
        throw new Error(`Failed to store key in Keychain: ${result.stderr}`);
    }
}

function deleteVendusApiKey(): boolean {
    const result = runSecurity([
        'delete-generic-password',
        '-s',
        KEYCHAIN_SERVICE,
        '-a',
        KEYCHAIN_ACCOUNT,
    ]);
    return result.exitCode === 0;
}

export { getVendusApiKey, setVendusApiKey, deleteVendusApiKey, KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT };
