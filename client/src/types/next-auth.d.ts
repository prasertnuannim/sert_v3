import "next-auth";
import "next-auth/jwt";

type AuthError = "RefreshAccessTokenError" | "RefreshTokenExpired";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: AuthError;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    accessToken: string;
    accessTokenExp: number;
    refreshToken: string;
    refreshTokenExp: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    accessToken?: string;
    accessTokenExp?: number;
    refreshToken?: string;
    refreshTokenExp?: number;
    error?: AuthError;
  }
}