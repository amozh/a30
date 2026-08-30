const DEFAULT_PER_PAGE = 1000; // Vendus API maximum
const DEFAULT_MAX_PAGES = 200; // runaway guard

type FetchPageFunction<T> = (page: number, perPage: number) => Promise<T[]>;

interface FetchAllPagesOptions {
    perPage?: number;
    maxPages?: number;
}

/**
 * Vendus paginates with `page`/`per_page` query params. Responses carry
 * X-Paginator-* headers, but stopping when a page comes back short of
 * `per_page` avoids needing header access through the generated client.
 */
async function fetchAllPages<T>(
    fetchPage: FetchPageFunction<T>,
    options: FetchAllPagesOptions = {}
): Promise<T[]> {
    const perPage = options.perPage ?? DEFAULT_PER_PAGE;
    const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
    const all: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
        const items = await fetchPage(page, perPage);
        all.push(...items);
        if (items.length < perPage) return all;
    }
    throw new Error(
        `fetchAllPages: exceeded ${maxPages} pages (${all.length} items); refine your filters`
    );
}

export { fetchAllPages };
export type { FetchPageFunction, FetchAllPagesOptions };
