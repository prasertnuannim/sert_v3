export enum AccessRole {
  Admin = "admin",
  User = "user",
  Doctor = "doctor",
  Nurse = "nurse",
  Guest = "home",
}

export const ROLE_REDIRECT_MAP: Record<AccessRole, string> = {
  [AccessRole.Admin]: "/admin",
  [AccessRole.User]: "/dashboard",
  [AccessRole.Doctor]: "/doctor",
  [AccessRole.Nurse]: "/schedule",
  [AccessRole.Guest]: "/",
};

const ACCESS_ROLE_SET = new Set<AccessRole>(Object.values(AccessRole));

export function normalizeAccessRole(role?: string | null): AccessRole | undefined {
  if (!role) return undefined;
  const candidate = role.toLowerCase() as AccessRole;
  return ACCESS_ROLE_SET.has(candidate) ? candidate : undefined;
}

export function resolveRoleRedirectPath(role?: AccessRole | null): string {
  return ROLE_REDIRECT_MAP[role ?? AccessRole.Guest] ?? "/";
}
