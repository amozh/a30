import { describe, expect, it } from 'bun:test';
import { fetchAllPages } from '../pagination';

describe('fetchAllPages', () => {
    it('stops when a page comes back short of per_page', async () => {
        const pages = [Array(3).fill('a'), ['b']];
        const calls: number[] = [];
        const result = await fetchAllPages(
            (page) => {
                calls.push(page);
                return Promise.resolve(pages[page - 1] ?? []);
            },
            { perPage: 3 }
        );
        expect(result).toHaveLength(4);
        expect(calls).toEqual([1, 2]);
    });

    it('returns a single short page immediately', async () => {
        const result = await fetchAllPages(() => Promise.resolve(['only']), { perPage: 100 });
        expect(result).toEqual(['only']);
    });

    it('throws after maxPages full pages', async () => {
        await expect(
            fetchAllPages(() => Promise.resolve(Array(2).fill('x')), { perPage: 2, maxPages: 3 })
        ).rejects.toThrow(/exceeded 3 pages/);
    });
});
