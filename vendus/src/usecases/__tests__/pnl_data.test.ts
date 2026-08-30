import { describe, expect, it } from 'bun:test';
import { VendusApiClient } from '../../vendus_api_client';
import { buildPnlData } from '../pnl_data';

/**
 * Fixture-driven regression test: drives buildPnlData through the real client
 * and generated code with fetch mocked at the HTTP boundary. Shapes mirror
 * live API responses captured during development.
 */

const DOCUMENTS = [
    {
        id: 1,
        type: 'FS',
        status: 'N',
        amount_gross: '10.00',
        amount_net: '8.13',
        date: '2026-06-01',
    },
    {
        id: 2,
        type: 'FS',
        status: 'N',
        amount_gross: '20.00',
        amount_net: '16.26',
        date: '2026-06-02',
    },
    {
        id: 3,
        type: 'NC',
        status: 'N',
        amount_gross: '10.00',
        amount_net: '8.13',
        date: '2026-06-02',
    },
];

const DOCUMENT_DETAILS: Record<string, unknown> = {
    '1': { ...DOCUMENTS[0], items: [{ title: 'Espresso', qty: 2 }] },
    '2': { ...DOCUMENTS[1], items: [{ title: 'Sandwich', qty: 1 }] },
    '3': { ...DOCUMENTS[2], items: [{ title: 'Sandwich', qty: -1 }], related_docs: [{ id: 2 }] },
};

const PRODUCTS = [
    {
        id: 7,
        reference: 'ESP',
        title: 'Espresso',
        category_id: 42,
        status: 'on',
        prices: { prices_without_formatting: { supply: '0.30', gross: '1.20' } },
    },
];

function routeFixture(url: string): unknown {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    const detailMatch = path.match(/\/documents\/(\d+)$/);
    if (detailMatch) return DOCUMENT_DETAILS[detailMatch[1]];
    if (path.endsWith('/documents')) return DOCUMENTS;
    if (path.endsWith('/products')) return PRODUCTS;
    if (path.endsWith('/reports/daily')) return [{ date: '2026-06-01', amount_gross: '30.00' }];
    if (path.endsWith('/reports/products')) return [{ product: { id: 7 }, qty: 3 }];
    if (path.endsWith('/reports/monthly')) return [{ month: 6, amount_gross: '20.00' }];
    throw new Error(`unexpected fixture URL: ${path}`);
}

const fetchImpl = ((input: Request | string | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    return Promise.resolve(
        new Response(JSON.stringify(routeFixture(url)), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })
    );
}) as typeof fetch;

describe('buildPnlData', () => {
    it('assembles the payload and computes revenue net of credit notes', async () => {
        const client = new VendusApiClient({ apiKey: 'test-key', fetchImpl });
        const progress: string[] = [];
        const data = await buildPnlData(client, { since: '2026-06-01', until: '2026-06-30' }, (m) =>
            progress.push(m)
        );

        // revenue = FS (10 + 20) − NC 10
        expect(data.summary.revenue_gross).toBe(20);
        expect(data.summary.revenue_net).toBe(16.26);
        expect(data.summary.credit_notes_gross).toBe(10);
        expect(data.summary.documents_by_type.FS.count).toBe(2);

        // details fetched by default: documents carry line items
        const detailed = data.documents as Array<{ items?: unknown[] }>;
        expect(detailed.every((d) => Array.isArray(d.items))).toBe(true);

        // product costs joined from nested prices
        expect(data.product_costs[0]).toMatchObject({ id: 7, supply_price: '0.30' });

        expect(data.reports.monthly[0].year).toBe(2026);
        expect(progress.length).toBeGreaterThan(0);
    });

    it('skips detail calls when includeDetails is false', async () => {
        const urls: string[] = [];
        const spyFetch = ((input: Request | string | URL) => {
            const url = input instanceof Request ? input.url : String(input);
            urls.push(new URL(url).pathname);
            return fetchImpl(input);
        }) as typeof fetch;
        const client = new VendusApiClient({ apiKey: 'test-key', fetchImpl: spyFetch });
        const data = await buildPnlData(client, {
            since: '2026-06-01',
            until: '2026-06-30',
            includeDetails: false,
        });
        expect(urls.some((u) => /\/documents\/\d+/.test(u))).toBe(false);
        const docs = data.documents as Array<{ items?: unknown[] }>;
        expect(docs.every((d) => d.items === undefined)).toBe(true);
    });
});
