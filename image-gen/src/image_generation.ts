/**
 * Image generation over `generateContent`.
 *
 * Gemini image models return image bytes as inline data parts alongside any
 * commentary text, so a response has to be walked rather than read from a
 * dedicated images field (the old Imagen `generateImages()` shape).
 */
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { GoogleGenAI, Part } from '@google/genai';

interface ReferenceImage {
    bytes: Buffer;
    mimeType: string;
}

interface GenerateImageOptions {
    prompt: string;
    /** Full model ID, e.g. `gemini-3.1-flash-image`. */
    model: string;
    /** One of 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9. */
    aspectRatio?: string;
    /** One of 1K, 2K, 4K. Defaults to 1K server-side. */
    imageSize?: string;
    /**
     * Images to condition on — style anchors, or the subject to edit. The model
     * accepts up to 14. Order matters: earlier images carry more weight.
     */
    references?: ReferenceImage[];
}

/** Reads a reference image off disk, inferring its mime type from the extension. */
function loadReferenceImage(path: string): ReferenceImage {
    const extension = extname(path).toLowerCase().replace('.', '');
    const subtype = extension === 'jpg' ? 'jpeg' : extension;
    return { bytes: readFileSync(path), mimeType: `image/${subtype || 'png'}` };
}

interface GeneratedImage {
    bytes: Buffer;
    mimeType: string;
}

interface GenerateImageResult {
    images: GeneratedImage[];
    /** Any text the model returned alongside the image. */
    text: string[];
}

/** Maps an image mime type onto a file extension for saving. */
function extensionForMimeType(mimeType: string): string {
    const subtype = mimeType.split('/')[1] ?? 'png';
    return subtype === 'jpeg' ? 'jpg' : subtype;
}

async function generateImage(
    client: GoogleGenAI,
    options: GenerateImageOptions
): Promise<GenerateImageResult> {
    const parts: Part[] = (options.references ?? []).map((reference) => ({
        inlineData: {
            data: reference.bytes.toString('base64'),
            mimeType: reference.mimeType,
        },
    }));
    parts.push({ text: options.prompt });

    const response = await client.models.generateContent({
        model: options.model,
        contents: [{ role: 'user', parts }],
        config: {
            responseModalities: ['IMAGE'],
            imageConfig: {
                aspectRatio: options.aspectRatio,
                imageSize: options.imageSize,
            },
        },
    });

    const images: GeneratedImage[] = [];
    const text: string[] = [];

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
            images.push({
                bytes: Buffer.from(part.inlineData.data, 'base64'),
                mimeType: part.inlineData.mimeType ?? 'image/png',
            });
        } else if (part.text) {
            text.push(part.text);
        }
    }

    if (images.length === 0) {
        // A safety block returns a well-formed response with no image parts, so
        // surface whatever the model said instead of failing silently.
        const reason = response.candidates?.[0]?.finishReason;
        const detail = text.length > 0 ? ` Model said: ${text.join(' ')}` : '';
        throw new Error(
            `No image returned (finishReason: ${reason ?? 'unknown'}).${detail} ` +
                'This usually means a safety filter blocked the prompt.'
        );
    }

    return { images, text };
}

export {
    generateImage,
    loadReferenceImage,
    extensionForMimeType,
    type GenerateImageOptions,
    type GeneratedImage,
    type ReferenceImage,
};
