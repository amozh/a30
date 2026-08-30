/**
 * Model IDs and defaults for Gemini image generation.
 *
 * The Imagen family (`imagen-4.0-*`) and its `generateImages()` API shut down on
 * 2026-08-17. The models below replace it and are driven by `generateContent()`,
 * which returns image bytes as inline data parts rather than a dedicated field.
 */

/** Short aliases so the CLI does not force full model IDs on the caller. */
const IMAGE_MODELS = {
    'flash-lite': 'gemini-3.1-flash-lite-image',
    flash: 'gemini-3.1-flash-image',
    pro: 'gemini-3-pro-image',
    'flash-legacy': 'gemini-2.5-flash-image',
} as const;

type ModelAlias = keyof typeof IMAGE_MODELS;

const DEFAULT_MODEL: ModelAlias = 'flash';

/**
 * Vertex location. `global` is the only endpoint that serves the whole current
 * image line-up — `gemini-3-pro-image` in particular was not on EU regions as of
 * mid-2026. Override with GOOGLE_CLOUD_LOCATION if data residency demands it.
 */
const DEFAULT_LOCATION = 'global';

/**
 * The GCP project holding the "GCP Free Credit" balance that Vertex draws on.
 * GOOGLE_CLOUD_PROJECT overrides it.
 */
const DEFAULT_PROJECT = 'gen-lang-client-0880150256';

const DEFAULT_OUTPUT_DIR = 'output';

export {
    IMAGE_MODELS,
    DEFAULT_MODEL,
    DEFAULT_LOCATION,
    DEFAULT_PROJECT,
    DEFAULT_OUTPUT_DIR,
    type ModelAlias,
};
