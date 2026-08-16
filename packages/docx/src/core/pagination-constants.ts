/**
 * Pagination Constants
 * ====================
 * Safety limits and default values for the VLT Paginator.
 */

// =============================================================================
// SAFETY LIMITS (matching PDF engine)
// =============================================================================

/** Maximum rows in a table before rejecting */
export const MAX_TABLE_ROWS = 10000;

/** Maximum columns in a table before rejecting */
export const MAX_TABLE_COLS = 200;

/** Maximum cell map entries (rows * cols estimate) */
export const MAX_CELL_MAP_ENTRIES = 200000;

/** Maximum recursion depth for splitting operations */
export const MAX_SPLIT_DEPTH = 50;

/** Maximum iterations in pagination loop */
export const MAX_PAGINATION_ITERATIONS = 100000;

/** Default global timeout in milliseconds */
export const DEFAULT_GLOBAL_TIMEOUT = 30000;

/** Default heartbeat interval in milliseconds (progress must be made within this time) */
export const DEFAULT_HEARTBEAT_INTERVAL = 5000;

/** Maximum placement attempts for a single node before declaring it impossible */
export const MAX_PLACEMENT_ATTEMPTS = 10;
