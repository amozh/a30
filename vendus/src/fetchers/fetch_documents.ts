import { mapWithConcurrency } from '../utils/concurrency';
import { fetchAllPages } from '../utils/pagination';
import type { DocumentsGet, DocumentsGetItem, VendusApiClient } from '../vendus_api_client';
import type { OnProgress, PeriodParams } from './types';

interface FetchDocumentsParams extends PeriodParams {
    /** comma-separated document type codes (e.g. "FT,FS,FR,NC"); omit for all types */
    types?: string;
    /** document status code (N/A/F); omit for all statuses */
    status?: string;
}

/** All documents in a period (paginated), document-level fields only. */
async function fetchDocuments(
    client: VendusApiClient,
    params: FetchDocumentsParams
): Promise<DocumentsGet[]> {
    return fetchAllPages((page, perPage) =>
        client.documents.list({
            since: params.since,
            until: params.until,
            type: params.types,
            status: params.status,
            store_id: params.storeId,
            page,
            per_page: perPage,
        })
    );
}

const DETAIL_CONCURRENCY = 5;

/**
 * Full detail (line items, payments, taxes, related_docs, user) for each
 * document — one GET per document; the list endpoint cannot return items.
 */
async function fetchDocumentDetails(
    client: VendusApiClient,
    documents: readonly DocumentsGet[],
    onProgress?: OnProgress
): Promise<DocumentsGetItem[]> {
    let done = 0;
    return mapWithConcurrency(documents, DETAIL_CONCURRENCY, async (doc) => {
        const detail = await client.documents.get(doc.id as number);
        done += 1;
        if (done % 50 === 0) onProgress?.(`…${done}/${documents.length} document details`);
        return detail;
    });
}

interface DocumentsWithDetails {
    /** document-level rows for every document in the period */
    documents: DocumentsGet[];
    /** full details (line items etc.), or null when includeDetails is false */
    details: DocumentsGetItem[] | null;
}

/**
 * The shared "list documents, optionally enrich with per-document detail"
 * flow used by every usecase.
 */
async function fetchDocumentsWithDetails(
    client: VendusApiClient,
    params: FetchDocumentsParams & { includeDetails?: boolean },
    onProgress?: OnProgress
): Promise<DocumentsWithDetails> {
    const documents = await fetchDocuments(client, params);
    if (!(params.includeDetails ?? true)) return { documents, details: null };
    onProgress?.(`Fetching detail for ${documents.length} documents…`);
    const details = await fetchDocumentDetails(client, documents, onProgress);
    return { documents, details };
}

export { fetchDocuments, fetchDocumentDetails, fetchDocumentsWithDetails };
export type { FetchDocumentsParams, DocumentsWithDetails };
