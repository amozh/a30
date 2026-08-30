import { fetchAllPages } from '../utils/pagination';
import type { ProductsGet, VendusApiClient } from '../vendus_api_client';

/** Cost-relevant slice of a catalog product, for joining COGS onto sold items. */
interface ProductCost {
    id: number | undefined;
    reference: string | undefined;
    title: string | undefined;
    supply_price: string | undefined;
    gross_price: string | undefined;
    category_id: number | undefined;
    status: string | undefined;
}

/** Full product catalog (paginated). */
async function fetchProducts(
    client: VendusApiClient,
    params: { storeId?: number } = {}
): Promise<ProductsGet[]> {
    return fetchAllPages((page, perPage) =>
        client.products.list({ store_id: params.storeId, page, per_page: perPage })
    );
}

/**
 * Trimmed catalog with current supply prices. Note: line items don't record
 * historical cost, so any COGS join uses the current supply price.
 */
async function fetchProductCosts(
    client: VendusApiClient,
    params: { storeId?: number } = {}
): Promise<ProductCost[]> {
    const catalog = await fetchProducts(client, params);
    return catalog.map((p) => ({
        id: p.id,
        reference: p.reference,
        title: p.title,
        supply_price: p.prices?.prices_without_formatting?.supply ?? p.prices?.supply,
        gross_price: p.prices?.prices_without_formatting?.gross ?? p.prices?.gross,
        category_id: p.category_id,
        status: p.status,
    }));
}

export { fetchProducts, fetchProductCosts };
export type { ProductCost };
