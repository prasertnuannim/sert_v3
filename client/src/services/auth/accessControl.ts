import { AccessRole } from "@/lib/auth/accessRole";

export const ACCESS_RULES: Record<string, AccessRole[]> = {
  "/account": [AccessRole.Admin],
  "/admin": [AccessRole.Admin],
  "/dashboard": [AccessRole.Admin, AccessRole.User],
  "/doctor": [AccessRole.Doctor],
  "/nurse": [AccessRole.Nurse],
};

const ROLE_REDIRECT_RULES: Record<AccessRole, string> = {
  [AccessRole.Admin]: "/account",
  [AccessRole.User]: "/dashboard",
  [AccessRole.Doctor]: "/doctor",
  [AccessRole.Nurse]: "/schedule",
  [AccessRole.Guest]: "/",
};

export function matchProtectedPath(pathname: string): string | undefined {
  return Object.keys(ACCESS_RULES)
    .sort((a, b) => b.length - a.length) // กัน route ซ้อน
    .find(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    );
}

export function resolveAccessRedirectPath(role?: AccessRole | null): string {
  return ROLE_REDIRECT_RULES[role ?? AccessRole.Guest] ?? "/";
}
