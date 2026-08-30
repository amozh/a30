import { VENDUS_BASE_URL } from '../constants';

interface VendusApiErrorOptions {
    status: number;
    responseData?: unknown;
    cause?: unknown;
}

/**
 * Vendus reports problems as `{"errors":[{"code":"P001","message":"…"}]}`, and uses
 * 403 for plain parameter-validation failures as well as real permission problems.
 * Surfacing these messages is the difference between "this query param is not
 * allowed here" and a misleading guess about the key's permissions.
 */
function describeApiErrors(responseData: unknown): string | null {
    if (typeof responseData !== 'object' || responseData === null) return null;
    const { errors } = responseData as { errors?: unknown };
    if (!Array.isArray(errors)) return null;
    const described = errors
        .map((entry): string | null => {
            if (typeof entry === 'string') return entry || null;
            if (typeof entry !== 'object' || entry === null) return null;
            const { code, message } = entry as { code?: unknown; message?: unknown };
            if (typeof message !== 'string' || !message) return null;
            return typeof code === 'string' && code ? `${code}: ${message}` : message;
        })
        .filter((entry): entry is string => entry !== null);
    return described.length > 0 ? described.join('; ') : null;
}

/** Appends the API's own error messages to our generic explanation, when it sent any. */
function withApiDetail(base: string, responseData: unknown): string {
    const detail = describeApiErrors(responseData);
    return detail ? `${base} API response: ${detail}` : base;
}

class VendusApiError extends Error {
    readonly status: number;
    readonly responseData?: unknown;
    readonly cause?: unknown;

    constructor(message: string, options: VendusApiErrorOptions) {
        super(message);
        this.name = 'VendusApiError';
        this.status = options.status;
        this.responseData = options.responseData;
        this.cause = options.cause;
        Object.setPrototypeOf(this, VendusApiError.prototype);
    }

    static connectionError(cause: unknown): VendusApiError {
        return new VendusApiError(
            'Could not reach the Vendus API. Check your network connection.',
            { status: 0, cause }
        );
    }

    static authenticationError(responseData: unknown): VendusApiError {
        return new VendusApiError(
            withApiDetail(
                `Vendus API authentication failed (401). Check that VENDUS_API_KEY is set and valid. Keys are generated per user under Apps > API. Docs: ${VENDUS_BASE_URL}`,
                responseData
            ),
            { status: 401, responseData }
        );
    }

    static authorizationError(responseData: unknown): VendusApiError {
        // A 403 carrying error messages is usually a rejected request (bad or
        // unsupported query params), not a permissions problem — lead with what
        // the API actually said and keep the plan/permission hint for when it
        // said nothing.
        const detail = describeApiErrors(responseData);
        return new VendusApiError(
            detail
                ? `Vendus API rejected the request (403). API response: ${detail}`
                : 'Vendus API authorization failed (403). The API key user lacks permission for this resource, or your plan does not include API access (requires Flex or Pro).',
            { status: 403, responseData }
        );
    }

    static notFoundError(responseData: unknown): VendusApiError {
        return new VendusApiError(
            withApiDetail('Vendus API resource not found (404).', responseData),
            {
                status: 404,
                responseData,
            }
        );
    }

    static rateLimitError(responseData: unknown): VendusApiError {
        return new VendusApiError(
            withApiDetail(
                'Vendus API rate limit exceeded (429). Wait and retry; reduce request frequency.',
                responseData
            ),
            { status: 429, responseData }
        );
    }

    static requestError(status: number, responseData: unknown): VendusApiError {
        return new VendusApiError(
            withApiDetail(`Vendus API request failed with status ${status}.`, responseData),
            { status, responseData }
        );
    }
}

function toVendusApiError(status: number, error: unknown): VendusApiError {
    if (error instanceof VendusApiError) return error;
    switch (status) {
        case 0:
            return VendusApiError.connectionError(error);
        case 401:
            return VendusApiError.authenticationError(error);
        case 403:
            return VendusApiError.authorizationError(error);
        case 404:
            return VendusApiError.notFoundError(error);
        case 429:
            return VendusApiError.rateLimitError(error);
        default:
            return VendusApiError.requestError(status, error);
    }
}

export { VendusApiError, toVendusApiError };
