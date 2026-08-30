import { describe, expect, it } from 'bun:test';
import type { DocumentsGet } from '../../vendus_api_client';
import { countBy } from '../daily_sales';
import { summarizeByType } from '../pnl_data';

const doc = (type: string, gross: string, net: string, status = 'N'): DocumentsGet =>
    ({ type, amount_gross: gross, amount_net: net, status }) as DocumentsGet;

describe('summarizeByType', () => {
    it('sums amounts and counts per document type, rounded to cents', () => {
        const byType = summarizeByType([
            doc('FS', '10.10', '8.21'),
            doc('FS', '5.15', '4.19'),
            doc('NC', '3.30', '2.68'),
        ]);
        expect(byType.FS).toEqual({ count: 2, amount_gross: 15.25, amount_net: 12.4 });
        expect(byType.NC).toEqual({ count: 1, amount_gross: 3.3, amount_net: 2.68 });
    });

    it('buckets documents without a type as UNKNOWN', () => {
        const byType = summarizeByType([{ amount_gross: '1.00' } as DocumentsGet]);
        expect(byType.UNKNOWN.count).toBe(1);
    });

    it('is safe against float accumulation drift', () => {
        const docs = Array.from({ length: 100 }, () => doc('FS', '0.10', '0.10'));
        expect(summarizeByType(docs).FS.amount_gross).toBe(10);
    });
});

describe('countBy', () => {
    it('counts by type and status', () => {
        const docs = [doc('FS', '1', '1'), doc('FS', '1', '1'), doc('NC', '1', '1', 'A')];
        expect(countBy(docs, 'type')).toEqual({ FS: 2, NC: 1 });
        expect(countBy(docs, 'status')).toEqual({ N: 2, A: 1 });
    });
});
