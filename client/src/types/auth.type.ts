import type { NextAuthOptions, Session } from "next-auth";
import type { ReactNode } from "react";

export type AuthCallbacks = NonNullable<NextAuthOptions["callbacks"]>;

export type AuthFormState = {
  errors?: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  };
  values?: {
    name?: string | null;
    email?: string | null;
    password?: string | null;
    confirmPassword?: string | null;
  };
  success?: boolean;
};

export type LoginFormState = {
  errors?: {
    email?: string;
    password?: string;
    general?: string;
  };
  values?: {
    email: string;
    password?: string;
  };
  success?: boolean;
};

export type LoginCredentialsInput = Partial<Record<"email" | "password", unknown>> &
  Partial<NonNullable<LoginFormState["values"]>>;
export type AuthSignInCallbackParams = Parameters<
  NonNullable<AuthCallbacks["signIn"]>
>[0];
export type AuthJwtCallbackParams = Parameters<NonNullable<AuthCallbacks["jwt"]>>[0];
export type AuthSessionCallbackParams = Parameters<
  NonNullable<AuthCallbacks["session"]>
>[0];

export type AppSessionProviderProps = {
  session: Session | null;
  children: ReactNode;
};
