import { createClient, createConfig } from './generated/vendus/hey-api/client';
import type { Client } from './generated/vendus/hey-api/client';
import {
    getAccount,
    getDocuments,
    getDocumentsById,
    getDocumentsPaymentmethods,
    getDocumentsTypes,
    getProducts,
    getRegisters,
    getRegistersByIdMovements,
    getReportsDaily,
    getReportsMonthly,
    getReportsProducts,
} from './generated/vendus/hey-api/sdk.gen';
import type {
    AccountGet,
    DocumentsGet,
    DocumentsGetItem,
    DocumentsPaymentmethodsGet,
    DocumentsTypesGet,
    GetDocumentsData,
    GetProductsData,
    GetRegistersByIdMovementsData,
    GetReportsDailyData,
    GetReportsMonthlyData,
    GetReportsProductsData,
    ProductsGet,
    RegistersGet,
    RegistersMovementsGet,
    ReportsDailyGet,
    ReportsMonthlyGet,
    ReportsProductsGet,
} from './generated/vendus/hey-api/types.gen';
import { VENDUS_BASE_URL } from './constants';
import { toVendusApiError } from './utils/vendus_error';

/**
 * Pagination params are documented globally (requests.doc) but not declared
 * per-endpoint in the Vendus OpenAPI spec, so generated query types miss them.
 */
interface VendusPaginationParams {
    page?: number;
    per_page?: number;
}

// `status` is widened: the spec's enum holds display strings ("N - Normal")
// while the API accepts the codes (N/A/F).
type VendusListDocumentsQuery = Omit<NonNullable<GetDocumentsData['query']>, 'status'> &
    VendusPaginationParams & { status?: string };
type VendusListProductsQuery = NonNullable<GetProductsData['query']> & VendusPaginationParams;
type VendusRegisterMovementsQuery = NonNullable<GetRegistersByIdMovementsData['query']>;
type VendusReportsDailyQuery = NonNullable<GetReportsDailyData['query']>;
type VendusReportsMonthlyQuery = NonNullable<GetReportsMonthlyData['query']>;
type VendusReportsProductsQuery = NonNullable<GetReportsProductsData['query']>;

interface VendusApiClientOptions {
    apiKey: string;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
}

interface HeyApiResult {
    data?: unknown;
    error?: unknown;
    response: Response;
}

/**
 * The Vendus OpenAPI spec declares list responses as a single object instead
 * of an array (spec bug); `unwrap` re-types them, so list methods pass the
 * element-array type explicitly.
 */
async function unwrap<TData>(promise: Promise<HeyApiResult>): Promise<TData> {
    let result: HeyApiResult;
    try {
        result = await promise;
    } catch (error) {
        throw toVendusApiError(0, error);
    }
    if (result.error !== undefined) {
        throw toVendusApiError(result.response?.status ?? 0, result.error);
    }
    return result.data as TData;
}

class VendusApiClient {
    private readonly client: Client;

    constructor(options: VendusApiClientOptions) {
        this.client = createClient(
            createConfig({
                baseUrl: options.baseUrl ?? VENDUS_BASE_URL,
                // Official vendus-sdk-php authenticates with HTTP Basic: key as
                // username, empty password. The spec has no securitySchemes.
                headers: { Authorization: `Basic ${btoa(`${options.apiKey}:`)}` },
                fetch: options.fetchImpl,
            })
        );
    }

    readonly account = {
        get: (): Promise<AccountGet[]> => unwrap<AccountGet[]>(getAccount({ client: this.client })),
    };

    readonly documents = {
        list: (query?: VendusListDocumentsQuery): Promise<DocumentsGet[]> =>
            unwrap<DocumentsGet[]>(
                getDocuments({ client: this.client, query: query as GetDocumentsData['query'] })
            ),
        get: (id: number): Promise<DocumentsGetItem> =>
            unwrap<DocumentsGetItem>(getDocumentsById({ client: this.client, path: { id } })),
        listTypes: (): Promise<DocumentsTypesGet[]> =>
            unwrap<DocumentsTypesGet[]>(getDocumentsTypes({ client: this.client })),
        listPaymentMethods: (): Promise<DocumentsPaymentmethodsGet[]> =>
            unwrap<DocumentsPaymentmethodsGet[]>(
                getDocumentsPaymentmethods({ client: this.client })
            ),
    };

    readonly reports = {
        daily: (query: VendusReportsDailyQuery): Promise<ReportsDailyGet[]> =>
            unwrap<ReportsDailyGet[]>(getReportsDaily({ client: this.client, query })),
        monthly: (query: VendusReportsMonthlyQuery): Promise<ReportsMonthlyGet[]> =>
            unwrap<ReportsMonthlyGet[]>(getReportsMonthly({ client: this.client, query })),
        products: (query: VendusReportsProductsQuery): Promise<ReportsProductsGet[]> =>
            unwrap<ReportsProductsGet[]>(getReportsProducts({ client: this.client, query })),
    };

    readonly registers = {
        list: (): Promise<RegistersGet[]> =>
            unwrap<RegistersGet[]>(getRegisters({ client: this.client })),
        listMovements: (
            registerId: number,
            query?: VendusRegisterMovementsQuery
        ): Promise<RegistersMovementsGet[]> =>
            unwrap<RegistersMovementsGet[]>(
                getRegistersByIdMovements({
                    client: this.client,
                    // Spec omits the {id} path param, so the generated type
                    // forbids `path`; the runtime client substitutes it fine.
                    path: { id: registerId },
                    query,
                } as unknown as Parameters<typeof getRegistersByIdMovements>[0])
            ),
    };

    readonly products = {
        list: (query?: VendusListProductsQuery): Promise<ProductsGet[]> =>
            unwrap<ProductsGet[]>(
                getProducts({ client: this.client, query: query as GetProductsData['query'] })
            ),
    };
}

export { VendusApiClient, VENDUS_BASE_URL };
export type {
    VendusApiClientOptions,
    VendusPaginationParams,
    VendusListDocumentsQuery,
    VendusListProductsQuery,
    VendusRegisterMovementsQuery,
    VendusReportsDailyQuery,
    VendusReportsMonthlyQuery,
    VendusReportsProductsQuery,
};
export type {
    AccountGet,
    DocumentsGet,
    DocumentsGetItem,
    DocumentsPaymentmethodsGet,
    DocumentsTypesGet,
    ProductsGet,
    RegistersGet,
    RegistersMovementsGet,
    ReportsDailyGet,
    ReportsMonthlyGet,
    ReportsProductsGet,
};
