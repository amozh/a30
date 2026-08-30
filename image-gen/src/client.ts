/**
 * Backend selection.
 *
 * The two backends bill to two entirely separate balances, which is the whole
 * reason this switch exists:
 *
 *   vertex — Vertex AI (rebranded "Gemini Enterprise Agent Platform"). Spends the
 *            GCP Free Credit on the billing account. Authenticates with
 *            Application Default Credentials, not an API key.
 *   api    — Gemini Developer API. Spends the Gemini API prepay balance. GCP
 *            Welcome/free-trial credits are explicitly NOT usable here.
 */
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_LOCATION, DEFAULT_PROJECT } from './constants';
import { getGeminiApiKey } from './utils/keychain';

type Backend = 'vertex' | 'api';

interface ResolvedClient {
    client: GoogleGenAI;
    backend: Backend;
    /** Which balance this backend draws down, for the CLI to echo back. */
    wallet: string;
}

function createVertexClient(): ResolvedClient {
    const project = process.env.GOOGLE_CLOUD_PROJECT ?? DEFAULT_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION ?? DEFAULT_LOCATION;
    return {
        // `enterprise` is the current name for this flag; `vertexai` still works
        // as a documented alias, but setting both to conflicting values throws.
        client: new GoogleGenAI({ enterprise: true, project, location }),
        backend: 'vertex',
        wallet: `GCP Free Credit (project ${project}, location ${location})`,
    };
}

function createApiClient(): ResolvedClient {
    const apiKey = process.env.GEMINI_API_KEY ?? getGeminiApiKey();
    if (!apiKey) {
        throw new Error(
            'No Gemini API key found. Set GEMINI_API_KEY or run `bun run auth` to store one ' +
                'in the Keychain — or use `--backend vertex`, which needs no key.'
        );
    }
    return {
        client: new GoogleGenAI({ apiKey }),
        backend: 'api',
        wallet: 'Gemini API prepay balance',
    };
}

function createClient(backend: Backend): ResolvedClient {
    return backend === 'vertex' ? createVertexClient() : createApiClient();
}

export { createClient, type Backend, type ResolvedClient };
