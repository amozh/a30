/** Progress callback for long-running fetchers; silent when omitted. */
type OnProgress = (message: string) => void;

interface PeriodParams {
    /** start date, YYYY-MM-DD */
    since: string;
    /** end date (inclusive), YYYY-MM-DD */
    until: string;
    /** restrict to a single store */
    storeId?: number;
}

/** The request params echoed back in every usecase payload. */
interface EchoedPeriodParams {
    since: string;
    until: string;
    store_id: number | null;
    details: boolean;
}

export type { OnProgress, PeriodParams, EchoedPeriodParams };
