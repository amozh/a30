import { describe, expect, it } from 'bun:test';
import { mapWithConcurrency } from '../concurrency';

describe('mapWithConcurrency', () => {
    it('preserves input order regardless of completion order', async () => {
        const delays = [30, 5, 15, 1];
        const result = await mapWithConcurrency(delays, 4, async (delay) => {
            await new Promise((resolve) => setTimeout(resolve, delay));
            return delay;
        });
        expect(result).toEqual(delays);
    });

    it('never exceeds the concurrency limit', async () => {
        let inFlight = 0;
        let maxInFlight = 0;
        await mapWithConcurrency(
            Array.from({ length: 10 }, (_, i) => i),
            3,
            async () => {
                inFlight += 1;
                maxInFlight = Math.max(maxInFlight, inFlight);
                await new Promise((resolve) => setTimeout(resolve, 5));
                inFlight -= 1;
            }
        );
        expect(maxInFlight).toBeLessThanOrEqual(3);
    });

    it('handles empty input', async () => {
        expect(await mapWithConcurrency([], 5, () => Promise.resolve(1))).toEqual([]);
    });
});
