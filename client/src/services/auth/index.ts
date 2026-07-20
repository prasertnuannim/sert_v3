import type { NextAuthOptions, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { decodeSharedJwt, encodeSharedJwt } from "@/services/auth/jwtCodec";
import { AccessRole, normalizeAccessRole } from "@/lib/auth/accessRole";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant: string;
  promotion: string;
};

type BackendLoginResponse = {
  access_exp: number;
  access_token: string;
  refresh_exp: number;
  refresh_token: string;
  user: AppUser;
};

type BackendRefreshResponse = {
  email?: string;
  role?: string;
  tenant?: string;
  promotion?: string;
  access_exp: number;
  access_token: string;
  refresh_exp?: number;
  refresh_token?: string;
};

type RefreshCallResult =
  | { ok: true; data: BackendRefreshResponse }
  | { ok: false };

export type AuthError = "RefreshAccessTokenError" | "RefreshTokenExpired";

type ExtendedUser = User & {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant: string;
  promotion: string;
  accessToken?: string;
  accessTokenExp?: number;
  refreshToken?: string;
  refreshTokenExp?: number;
};

type ExtendedToken = JWT & {
  user?: AppUser;
  accessToken?: string;
  accessTokenExp?: number;
  refreshToken?: string;
  refreshTokenExp?: number;
  error?: AuthError;
};

type OAuthSyncInput = {
  provider: string;
  providerAccountId: string;
  email: string;
  name: string;
  type?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
  refreshTokenExpiresIn?: number;
};

const isExpired = (exp?: number): boolean => {
  if (!exp) return true;
  return Date.now() >= exp * 1000;
};

const accessJwtSecret = process.env.JWT_ACCESS_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const goApiUrl = process.env.GO_API_URL;
const nextAuthDebugSession = process.env.NEXTAUTH_DEBUG_SESSION === "true";
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.AUTH_GITHUB_ID;
const githubClientSecret = process.env.AUTH_GITHUB_SECRET;

if (!accessJwtSecret) {
  throw new Error("Missing JWT_ACCESS_SECRET");
}

if (nextAuthSecret && nextAuthSecret !== accessJwtSecret) {
  throw new Error("NEXTAUTH_SECRET must match JWT_ACCESS_SECRET");
}

function redactToken(token?: string): string | undefined {
  if (!token) return undefined;
  if (token.length <= 12) return "[redacted]";
  return `${token.slice(0, 6)}...[redacted]...${token.slice(-6)}`;
}

function readOptionalString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed || undefined;
}

function readOptionalNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function buildOAuthSyncInput(
  account: Record<string, unknown>,
  user: { email?: string | null; name?: string | null },
  provider: string,
  providerAccountId: string,
): OAuthSyncInput | null {
  const email = user.email?.trim();
  const name = user.name?.trim() || email;

  if (!email || !name) {
    return null;
  }

  return {
    provider,
    providerAccountId,
    email,
    name,
    type: readOptionalString(account, "type"),
    accessToken: readOptionalString(account, "access_token"),
    refreshToken: readOptionalString(account, "refresh_token"),
    expiresAt: readOptionalNumber(account, "expires_at"),
    tokenType: readOptionalString(account, "token_type"),
    scope: readOptionalString(account, "scope"),
    idToken: readOptionalString(account, "id_token"),
    sessionState: readOptionalString(account, "session_state"),
    refreshTokenExpiresIn: readOptionalNumber(account, "refresh_token_expires_in"),
  };
}

function mapBackendLoginUser(data: BackendLoginResponse): ExtendedUser | null {
  if (
    !data.user ||
    !data.access_token ||
    !data.access_exp ||
    !data.refresh_token ||
    !data.refresh_exp
  ) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    tenant: data.user.tenant ?? "",
    promotion: data.user.promotion ?? "",
    accessToken: data.access_token,
    accessTokenExp: data.access_exp,
    refreshToken: data.refresh_token,
    refreshTokenExp: data.refresh_exp,
  };
}

const refreshInFlight = new Map<string, Promise<RefreshCallResult>>();

async function requestRefresh(refreshToken: string): Promise<RefreshCallResult> {
  if (!goApiUrl) {
    return { ok: false };
  }

  const res = await fetch(`${goApiUrl}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false };
  }

  const data: BackendRefreshResponse = await res.json();
  if (!data.access_token || !data.access_exp) {
    return { ok: false };
  }

  return { ok: true, data };
}

async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  try {
    if (!token.refreshToken || !token.refreshTokenExp) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

    if (isExpired(token.refreshTokenExp)) {
      return { ...token, error: "RefreshTokenExpired" };
    }

    let inFlight = refreshInFlight.get(token.refreshToken);
    if (!inFlight) {
      inFlight = requestRefresh(token.refreshToken);
      refreshInFlight.set(token.refreshToken, inFlight);
    }

    const refreshResult = await inFlight;
    if (refreshInFlight.get(token.refreshToken) === inFlight) {
      refreshInFlight.delete(token.refreshToken);
    }

    if (!refreshResult.ok) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

    const data = refreshResult.data;

    return {
      ...token,
      user: token.user
        ? {
            ...token.user,
            email: data.email ?? token.user.email,
            role: data.role ?? token.user.role,
            tenant: data.tenant ?? token.user.tenant ?? "",
            promotion: data.promotion ?? token.user.promotion ?? "",
          }
        : token.user,
      accessToken: data.access_token,
      accessTokenExp: data.access_exp,
      refreshToken: data.refresh_token ?? token.refreshToken,
      refreshTokenExp: data.refresh_exp ?? token.refreshTokenExp,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

async function revokeRefreshToken(refreshToken?: string): Promise<void> {
  if (!goApiUrl || !refreshToken) {
    return;
  }

  try {
    await fetch(`${goApiUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
      cache: "no-store",
    });
  } catch {
    // Ignore logout revoke errors; local sign-out should still complete.
  }
}

async function syncOAuthUser(input: OAuthSyncInput): Promise<ExtendedUser | null> {
  if (!goApiUrl) {
    return null;
  }

  try {
    const res = await fetch(`${goApiUrl}/auth/oauth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: input.provider,
        provider_account_id: input.providerAccountId,
        email: input.email,
        name: input.name,
        type: input.type,
        access_token: input.accessToken,
        refresh_token: input.refreshToken,
        expires_at: input.expiresAt,
        token_type: input.tokenType,
        scope: input.scope,
        id_token: input.idToken,
        session_state: input.sessionState,
        refresh_token_expires_in: input.refreshTokenExpiresIn,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const data: BackendLoginResponse = await res.json();
    return mapBackendLoginUser(data);
  } catch {
    return null;
  }
}

function buildOAuthUser(user: Partial<ExtendedUser>, fallbackId?: string): AppUser {
  const email = user.email?.trim() ?? "";
  const name = user.name?.trim() || email || "User";
  const role = normalizeAccessRole(user.role) ?? AccessRole.User;

  return {
    id: user.id?.trim() || fallbackId || email || "oauth-user",
    email,
    name,
    role,
    tenant: user.tenant ?? "",
    promotion: user.promotion ?? "",
  };
}

const providers: NextAuthOptions["providers"] = [];

if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
        },
      },
    })
  );
}

if (githubClientId && githubClientSecret) {
  providers.push(
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    })
  );
}

providers.push(
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials): Promise<ExtendedUser | null> {
      try {
        const email = credentials?.email?.trim();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        if (!goApiUrl) {
          return null;
        }

        const res = await fetch(`${goApiUrl}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
          cache: "no-store",
        });

        if (!res.ok) {
          return null;
        }

        const data: BackendLoginResponse = await res.json();
        return mapBackendLoginUser(data);
      } catch {
        return null;
      }
    },
  })
);

export const authOptions: NextAuthOptions = {
  secret: accessJwtSecret,
  session: {
    strategy: "jwt",
  },
  jwt: {
    encode: encodeSharedJwt,
    decode: decodeSharedJwt,
  },
  pages: {
    signIn: "/login",
  },
  providers,
  events: {
    async signOut({ token }) {
      const currentToken = token as ExtendedToken;
      await revokeRefreshToken(currentToken.refreshToken);
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      const provider = account.provider?.trim();
      const providerAccountId = account.providerAccountId?.trim();
      const oauthUser = user as ExtendedUser;
      const oauthSyncInput =
        provider && providerAccountId
          ? buildOAuthSyncInput(
              account as Record<string, unknown>,
              oauthUser,
              provider,
              providerAccountId
            )
          : null;

      if (!oauthSyncInput) {
        return "/login?error=OAuthAccountSyncFailed";
      }

      const syncedUser = await syncOAuthUser(oauthSyncInput);

      if (!syncedUser) {
        return "/login?error=OAuthAccountSyncFailed";
      }

      Object.assign(oauthUser, syncedUser);
      return true;
    },

    async jwt({ token, user, account }) {
      const currentToken = token as ExtendedToken;

      if (user) {
        const currentUser = user as ExtendedUser;
        const hasBackendTokens = Boolean(
          currentUser.accessToken && currentUser.refreshToken
        );

        if (!hasBackendTokens) {
          return {
            ...currentToken,
            user: buildOAuthUser(
              currentUser,
              account?.providerAccountId ?? currentToken.user?.id
            ),
            accessToken: undefined,
            accessTokenExp: undefined,
            refreshToken: undefined,
            refreshTokenExp: undefined,
            error: undefined,
          };
        }

        return {
          ...currentToken,
          user: {
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role,
            tenant: currentUser.tenant,
            promotion: currentUser.promotion,
          },
          accessToken: currentUser.accessToken,
          accessTokenExp: currentUser.accessTokenExp,
          refreshToken: currentUser.refreshToken,
          refreshTokenExp: currentUser.refreshTokenExp,
          error: undefined,
        };
      }

      const hasBackendTokens = Boolean(
        currentToken.accessTokenExp ||
          currentToken.refreshToken ||
          currentToken.refreshTokenExp
      );

      if (!hasBackendTokens) {
        return currentToken;
      }

      if (!isExpired(currentToken.accessTokenExp)) {
        return currentToken;
      }

      return refreshAccessToken(currentToken);
    },

    async session({ session, token }) {
      const currentToken = token as ExtendedToken;

      session.user = currentToken.user as typeof session.user;
      session.accessToken = currentToken.accessToken;
      session.error = currentToken.error;

      if (nextAuthDebugSession) {
        console.log("[next-auth][session]", {
          userId: session.user?.id,
          email: session.user?.email,
          role: session.user?.role,
          tenant: session.user?.tenant,
          promotion: session.user?.promotion,
          error: session.error,
          accessTokenExp: currentToken.accessTokenExp,
          refreshTokenExp: currentToken.refreshTokenExp,
          accessToken: redactToken(currentToken.accessToken),
          refreshToken: redactToken(currentToken.refreshToken),
          at: new Date().toISOString(),
        });
      }

      return session;
    },
  },
};
