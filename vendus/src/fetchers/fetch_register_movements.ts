import type { RegistersMovementsGet, VendusApiClient } from '../vendus_api_client';
import type { PeriodParams } from './types';

interface RegisterMovements {
    register_id: number | undefined;
    register_title: string | undefined;
    movements: RegistersMovementsGet[];
}

/**
 * Cash movements (open/close/in/out) per register for a period.
 * Note: covers ALL registers — the Vendus registers list has no store filter,
 * so this is not scoped by store_id even when the caller filters documents.
 */
async function fetchRegisterMovements(
    client: VendusApiClient,
    params: Pick<PeriodParams, 'since' | 'until'>
): Promise<RegisterMovements[]> {
    const registers = await client.registers.list();
    return Promise.all(
        registers.map(async (register) => ({
            register_id: register.id,
            register_title: register.title,
            movements: await client.registers.listMovements(register.id as number, {
                since: params.since,
                until: params.until,
            }),
        }))
    );
}

export { fetchRegisterMovements };
export type { RegisterMovements };
