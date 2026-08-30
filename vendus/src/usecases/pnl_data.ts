import { fetchDocumentsWithDetails } from '../fetchers/fetch_documents';
import { fetchPeriodReports } from '../fetchers/fetch_period_reports';
import type { PeriodReports } from '../fetchers/fetch_period_reports';
import { fetchProductCosts } from '../fetchers/fetch_product_costs';
import type { ProductCost } from '../fetchers/fetch_product_costs';
import type { EchoedPeriodParams, OnProgress, PeriodParams } from '../fetchers/types';
import { round2, toNumber } from '../utils/numbers';
import type { DocumentsGet, DocumentsGetItem, VendusApiClient } from '../vendus_api_client';

const SALES_TYPES = ['FT', 'FS', 'FR'] as const;
const CREDIT_NOTE_TYPE = 'NC';
const DOCUMENT_TYPES_FILTER = [...SALES_TYPES, CREDIT_NOTE_TYPE].join(',');

interface PnlDataParams extends PeriodParams {
    /** fetch line items per document (1 GET per document); default true */
    includeDetails?: boolean;
}

interface TypeSummary {
    count: number;
    amount_gross: number;
    amount_net: number;
}

interface PnlSummary {
    documents_by_type: Record<string, TypeSummary>;
    /** sales (FT+FS+FR) minus credit notes, after tax */
    revenue_gross: number;
    /** sales minus credit notes, before tax */
    revenue_net: number;
    credit_notes_gross: number;
}

interface PnlData {
    params: EchoedPeriodParams;
    fetched_at: string;
    summary: PnlSummary;
    reports: PeriodReports;
    product_costs: ProductCost[];
    documents: DocumentsGetItem[] | DocumentsGet[];
}

function summarizeByType(documents: DocumentsGet[]): Record<string, TypeSummary> {
    const byType: Record<string, TypeSummary> = {};
    for (const doc of documents) {
        const type = doc.type ?? 'UNKNOWN';
        byType[type] ??= { count: 0, amount_gross: 0, amount_net: 0 };
        byType[type].count += 1;
        byType[type].amount_gross = round2(byType[type].amount_gross + toNumber(doc.amount_gross));
        byType[type].amount_net = round2(byType[type].amount_net + toNumber(doc.amount_net));
    }
    return byType;
}

/**
 * All data needed for a P&L calculation over a period: sales documents and
 * credit notes (with line items — the basis for product-dependent expenses),
 * product supply prices for COGS joins, and Vendus's own server-computed
 * reports as cross-checks.
 */
async function buildPnlData(
    client: VendusApiClient,
    params: PnlDataParams,
    onProgress?: OnProgress
): Promise<PnlData> {
    const includeDetails = params.includeDetails ?? true;
    const period = { since: params.since, until: params.until, storeId: params.storeId };

    const [reports, { documents, details }, productCosts] = await Promise.all([
        fetchPeriodReports(client, period),
        fetchDocumentsWithDetails(
            client,
            { ...period, types: DOCUMENT_TYPES_FILTER, status: 'N', includeDetails },
            onProgress
        ),
        fetchProductCosts(client, { storeId: params.storeId }),
    ]);
    onProgress?.(
        `${reports.daily.length} daily rows, ${reports.products.length} product-report rows, ` +
            `${documents.length} documents, ${productCosts.length} catalog products`
    );

    const byType = summarizeByType(documents);
    const salesGross = SALES_TYPES.reduce((sum, t) => sum + (byType[t]?.amount_gross ?? 0), 0);
    const salesNet = SALES_TYPES.reduce((sum, t) => sum + (byType[t]?.amount_net ?? 0), 0);
    const creditGross = byType[CREDIT_NOTE_TYPE]?.amount_gross ?? 0;
    const creditNet = byType[CREDIT_NOTE_TYPE]?.amount_net ?? 0;

    return {
        params: {
            since: params.since,
            until: params.until,
            store_id: params.storeId ?? null,
            details: includeDetails,
        },
        fetched_at: new Date().toISOString(),
        summary: {
            documents_by_type: byType,
            revenue_gross: round2(salesGross - creditGross),
            revenue_net: round2(salesNet - creditNet),
            credit_notes_gross: creditGross,
        },
        reports,
        product_costs: productCosts,
        documents: details ?? documents,
    };
}

export { buildPnlData, summarizeByType, SALES_TYPES, CREDIT_NOTE_TYPE };
export type { PnlData, PnlDataParams, PnlSummary, TypeSummary };
