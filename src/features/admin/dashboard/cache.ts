/**
 * Tag de cache del dashboard. Las métricas del overview se cachean con este tag
 * (ver getOverviewStats); las mutaciones que cambian esos números llaman a
 * revalidateTag(DASHBOARD_CACHE_TAG) para invalidarlo al instante.
 *
 * Vive en un módulo normal (no 'use server') para poder importarse desde las
 * server actions y desde el fetch cacheado sin restricciones.
 */
export const DASHBOARD_CACHE_TAG = 'dashboard'
