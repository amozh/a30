import { fetchDecodeTables } from '../fetchers/fetch_decode_tables';
import type { DecodeTables } from '../fetchers/fetch_decode_tables';
import { fetchDocumentsWithDetails } from '../fetchers/fetch_documents';
import { fetchRegisterMovements } from '../fetchers/fetch_register_movements';
import type { RegisterMovements } from '../fetchers/fetch_register_movements';
import type { EchoedPeriodParams, OnProgress, PeriodParams } from '../fetchers/types';
import type { DocumentsGet, DocumentsGetItem, VendusApiClient } from '../vendus_api_client';

interface DailySalesParams extends PeriodParams {
    /** fetch full detail per document (1 GET per document); default true */
    includeDetails?: boolean;
}

interface DailySalesSummary {
    document_count: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
}

interface DailySalesData {
    params: EchoedPeriodParams;
    fetched_at: string;
    summary: DailySalesSummary;
    decode_tables: DecodeTables;
    registers: RegisterMovements[];
    documents: DocumentsGetItem[] | DocumentsGet[];
}

function countBy(documents: DocumentsGet[], key: 'type' | 'status'): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const doc of documents) {
        const value = doc[key] ?? 'UNKNOWN';
        counts[value] = (counts[value] ?? 0) + 1;
    }
    return counts;
}

/**
 * All data needed to analyze a period's sales for issues: every document (all
 * types and statuses — canceled docs and table inquiries matter), full detail
 * with items/payments/related_docs (credit note → original links), decode
 * tables, and cash movements per register.
 */
async function buildDailySales(
    client: VendusApiClient,
    params: DailySalesParams,
    onProgress?: OnProgress
): Promise<DailySalesData> {
    const includeDetails = params.includeDetails ?? true;

    const [{ documents, details }, decodeTables, registers] = await Promise.all([
        fetchDocumentsWithDetails(
            client,
            // no type/status filter: canceled docs and table inquiries matter
            { since: params.since, until: params.until, storeId: params.storeId, includeDetails },
            onProgress
        ),
        fetchDecodeTables(client),
        fetchRegisterMovements(client, { since: params.since, until: params.until }),
    ]);
    onProgress?.(`${documents.length} documents, ${registers.length} registers`);

    return {
        params: {
            since: params.since,
            until: params.until,
            store_id: params.storeId ?? null,
            details: includeDetails,
        },
        fetched_at: new Date().toISOString(),
        summary: {
            document_count: documents.length,
            by_type: countBy(documents, 'type'),
            by_status: countBy(documents, 'status'),
        },
        decode_tables: decodeTables,
        registers,
        documents: details ?? documents,
    };
}

export { buildDailySales, countBy };
export type { DailySalesData, DailySalesParams, DailySalesSummary };
