/**
 * The contract version, independent of any package version.
 *
 * It appears in every {@link import("./receipt.js").Receipt} so a consumer can pin
 * behavior across package upgrades (OC-1 §9.6).
 */
export const CONTRACT_VERSION = "1.0.0" as const;

export type ContractVersion = typeof CONTRACT_VERSION;
