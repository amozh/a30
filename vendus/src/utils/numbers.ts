/** Parse a Vendus amount ("100.00" or number) into a number; 0 for missing/invalid. */
function toNumber(value: string | number | undefined): number {
    if (value === undefined) return 0;
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

export { toNumber, round2 };
