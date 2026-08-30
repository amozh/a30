import { describe, expect, it } from 'bun:test';
import { round2, toNumber } from '../numbers';

describe('toNumber', () => {
    it('parses Vendus amount strings', () => {
        expect(toNumber('100.00')).toBe(100);
        expect(toNumber('15.90')).toBe(15.9);
    });

    it('passes numbers through', () => {
        expect(toNumber(12.5)).toBe(12.5);
    });

    it('returns 0 for missing or invalid values', () => {
        expect(toNumber(undefined)).toBe(0);
        expect(toNumber('not-a-number')).toBe(0);
    });
});

describe('round2', () => {
    it('rounds to cents', () => {
        expect(round2(26110.456)).toBe(26110.46);
        expect(round2(0.1 + 0.2)).toBe(0.3);
    });
});
