import { VENDUS_BASE_URL } from '../constants';

interface VendusApiErrorOptions {
    status: number;
    responseData?: unknown;
    cause?: unknown;
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
            `Vendus API authentication failed (401). Check that VENDUS_API_KEY is set and valid. Keys are generated per user under Apps > API. Docs: ${VENDUS_BASE_URL}`,
            { status: 401, responseData }
        );
    }

    static authorizationError(responseData: unknown): VendusApiError {
        return new VendusApiError(
            'Vendus API authorization failed (403). The API key user lacks permission for this resource, or your plan does not include API access (requires Flex or Pro).',
            { status: 403, responseData }
        );
    }

    static notFoundError(responseData: unknown): VendusApiError {
        return new VendusApiError('Vendus API resource not found (404).', {
            status: 404,
            responseData,
        });
    }

    static rateLimitError(responseData: unknown): VendusApiError {
        return new VendusApiError(
            'Vendus API rate limit exceeded (429). Wait and retry; reduce request frequency.',
            { status: 429, responseData }
        );
    }

    static requestError(status: number, responseData: unknown): VendusApiError {
        return new VendusApiError(`Vendus API request failed with status ${status}.`, {
            status,
            responseData,
        });
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
