import type {
    DocumentsPaymentmethodsGet,
    DocumentsTypesGet,
    VendusApiClient,
} from '../vendus_api_client';

interface DecodeTables {
    document_types: DocumentsTypesGet[];
    payment_methods: DocumentsPaymentmethodsGet[];
}

/** Code → label tables for document types and payment methods. */
async function fetchDecodeTables(client: VendusApiClient): Promise<DecodeTables> {
    const [documentTypes, paymentMethods] = await Promise.all([
        client.documents.listTypes(),
        client.documents.listPaymentMethods(),
    ]);
    return { document_types: documentTypes, payment_methods: paymentMethods };
}

export { fetchDecodeTables };
export type { DecodeTables };
