/**
 * Generate images from a prompt. Run `--help` for usage.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { createClient, type Backend } from '../src/client';
import { DEFAULT_MODEL, DEFAULT_OUTPUT_DIR, IMAGE_MODELS, type ModelAlias } from '../src/constants';
import { extensionForMimeType, generateImage, loadReferenceImage } from '../src/image_generation';

/** Commander collector for repeatable options. */
function collect(value: string, previous: string[]): string[] {
    return previous.concat([value]);
}

/** Turns a prompt into a short, filesystem-safe filename stem. */
function slugify(prompt: string): string {
    return (
        prompt
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || 'image'
    );
}

function timestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

const program = new Command();
program
    .name('generate')
    .description(
        'Generate images with Gemini image models.\n\n' +
            'Backends bill to different balances: `vertex` (default) spends the GCP Free\n' +
            'Credit, `api` spends the Gemini API prepay balance.'
    )
    .argument('[prompt]', 'what to generate (or use --prompt-file)')
    .option('-m, --model <alias>', `model: ${Object.keys(IMAGE_MODELS).join(' | ')}`, DEFAULT_MODEL)
    .option('-b, --backend <backend>', 'vertex | api', 'vertex')
    .option('-a, --aspect-ratio <ratio>', 'e.g. 1:1, 16:9, 9:16, 3:4')
    .option('-s, --size <size>', '1K | 2K | 4K')
    .option('-n, --count <n>', 'how many images to generate', '1')
    .option('-o, --out <dir>', 'output directory', DEFAULT_OUTPUT_DIR)
    .option('-f, --prompt-file <path>', 'read the prompt from a file (for long art direction)')
    .option(
        '-r, --reference <path>',
        'reference image to match style against (repeatable)',
        collect,
        []
    )
    .option('--label <label>', 'tag included in the output filename, for A/B runs')
    .showHelpAfterError()
    .action(async (promptArg: string | undefined, options) => {
        const prompt = options.promptFile
            ? readFileSync(options.promptFile, 'utf8').trim()
            : promptArg;
        if (!prompt) {
            console.error('❌ Provide a prompt argument or --prompt-file.');
            process.exit(1);
        }

        const alias = options.model as ModelAlias;
        const model = IMAGE_MODELS[alias];
        if (!model) {
            console.error(
                `❌ Unknown model "${options.model}". Choose one of: ${Object.keys(IMAGE_MODELS).join(', ')}`
            );
            process.exit(1);
        }

        const backend = options.backend as Backend;
        if (backend !== 'vertex' && backend !== 'api') {
            console.error(`❌ Unknown backend "${options.backend}". Use "vertex" or "api".`);
            process.exit(1);
        }

        const count = Number.parseInt(options.count, 10);
        if (!Number.isInteger(count) || count < 1) {
            console.error(`❌ --count must be a positive integer, got "${options.count}".`);
            process.exit(1);
        }

        const references = (options.reference as string[]).map(loadReferenceImage);

        const { client, wallet } = createClient(backend);
        console.error(`Model:   ${model}`);
        console.error(`Billing: ${wallet}`);
        if (references.length > 0) console.error(`Refs:    ${references.length}`);

        mkdirSync(options.out, { recursive: true });
        const stem = `${timestamp()}-${options.label ? `${slugify(options.label)}-` : ''}${slugify(prompt)}`;

        for (let i = 0; i < count; i++) {
            const progress = count > 1 ? ` (${i + 1}/${count})` : '';
            console.error(`Generating${progress}…`);
            const { images, text } = await generateImage(client, {
                prompt,
                model,
                aspectRatio: options.aspectRatio,
                imageSize: options.size,
                references,
            });

            for (const [j, image] of images.entries()) {
                const suffix =
                    count > 1 || images.length > 1 ? `-${i + 1}${j > 0 ? `-${j + 1}` : ''}` : '';
                const path = join(
                    options.out,
                    `${stem}${suffix}.${extensionForMimeType(image.mimeType)}`
                );
                writeFileSync(path, image.bytes);
                console.log(path);
            }
            if (text.length > 0) console.error(`  ${text.join(' ')}`);
        }
    });

await program.parseAsync();
