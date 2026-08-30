import { describe, expect, it } from 'bun:test';
import { VendusApiError, toVendusApiError } from '../vendus_error';

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
