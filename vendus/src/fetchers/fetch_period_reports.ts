import type {
    ReportsDailyGet,
    ReportsMonthlyGet,
    ReportsProductsGet,
    VendusApiClient,
} from '../vendus_api_client';
import type { PeriodParams } from './types';

interface PeriodReports {
    /** per-day gross/net/profit/qty/returns (server-computed) */
    daily: ReportsDailyGet[];
    /** per-product revenue and profit for the period */
    products: ReportsProductsGet[];
    /** month-level totals for each year the period touches */
    monthly: Array<{ year: number; months: ReportsMonthlyGet[] }>;
}

/** Vendus server-computed reports for a period — cheap cross-checks for P&L. */
async function fetchPeriodReports(
    client: VendusApiClient,
    params: PeriodParams
): Promise<PeriodReports> {
    const years: number[] = [];
    for (let y = Number(params.since.slice(0, 4)); y <= Number(params.until.slice(0, 4)); y++) {
        years.push(y);
    }
    const [daily, products, monthly] = await Promise.all([
        client.reports.daily({
            start_date: params.since,
            end_date: params.until,
            store_id: params.storeId,
        }),
        client.reports.products({
            start_date: params.since,
            end_date: params.until,
            store_id: params.storeId,
        }),
        Promise.all(
            years.map(async (year) => ({
                year,
                months: await client.reports.monthly({ year, store_id: params.storeId }),
            }))
        ),
    ]);
    return { daily, products, monthly };
}

export { fetchPeriodReports };
export type { PeriodReports };
