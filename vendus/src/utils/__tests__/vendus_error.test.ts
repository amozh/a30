import { describe, expect, it } from 'bun:test';
import { VendusApiError, toVendusApiError } from '../vendus_error';

/** The shape Vendus actually sends on a rejected request. */
const paramErrors = {
    errors: [
        { code: 'P001', message: 'O campo since não é permitido.' },
        { code: 'P001', message: 'O campo until não é permitido.' },
    ],
};

describe('toVendusApiError', () => {
    it.each([
        [0, /Could not reach/],
        [401, /authentication failed/],
        [403, /authorization failed/],
        [404, /not found/],
        [429, /rate limit/],
        [500, /status 500/],
    ] as Array<[number, RegExp]>)('maps status %d', (status, pattern) => {
        const error = toVendusApiError(status, { body: 'x' });
        expect(error).toBeInstanceOf(VendusApiError);
        expect(error.status).toBe(status);
        expect(error.message).toMatch(pattern);
    });

    it('passes through an existing VendusApiError', () => {
        const original = VendusApiError.notFoundError({});
        expect(toVendusApiError(500, original)).toBe(original);
    });
});

describe('API-reported error messages', () => {
    it('leads a 403 with the API message instead of guessing at permissions', () => {
        const error = toVendusApiError(403, paramErrors);
        expect(error.message).toContain('P001: O campo since não é permitido.');
        expect(error.message).toContain('P001: O campo until não é permitido.');
        expect(error.message).not.toContain('Flex or Pro');
    });

    it('keeps the permission hint on a 403 with no message body', () => {
        expect(toVendusApiError(403, {}).message).toContain('Flex or Pro');
    });

    it.each([401, 404, 429, 500] as number[])('appends API messages to a %d', (status) => {
        expect(toVendusApiError(status, paramErrors).message).toContain(
            'API response: P001: O campo since não é permitido.'
        );
    });

    it('keeps the raw body on the error for inspection', () => {
        expect(toVendusApiError(403, paramErrors).responseData).toBe(paramErrors);
    });

    it('handles plain-string and malformed error entries', () => {
        expect(toVendusApiError(500, { errors: ['boom', null, { code: 'X' }] }).message).toContain(
            'API response: boom'
        );
    });

    it('ignores bodies without an errors array', () => {
        expect(toVendusApiError(500, { errors: 'nope' }).message).not.toContain('API response');
        expect(toVendusApiError(500, null).message).not.toContain('API response');
        expect(toVendusApiError(500, { errors: [] }).message).not.toContain('API response');
    });
});
