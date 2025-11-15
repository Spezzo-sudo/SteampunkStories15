/**
 * Static credential pair used for bootstrapping offline or test sessions.
 */
export const DEFAULT_ADMIN_CREDENTIALS = {
  /** Username provisioned for the local administrator account. */
  username: 'admin',
  /** Password provisioned for the local administrator account. */
  password: 'admin1',
} as const;

/**
 * Helper returning the canonical email for the default administrator.
 */
export const getDefaultAdminEmail = (): string => `${DEFAULT_ADMIN_CREDENTIALS.username}@steampunk.local`;
