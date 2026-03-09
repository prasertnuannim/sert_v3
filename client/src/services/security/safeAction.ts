import { getAuthSession } from "@/services/auth/session";
import { AccessRole } from "@/lib/auth/accessRole";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type AuthActionOptions = {
  roles?: AccessRole[];
};

export type AuthContext = {
  userId: string;
  role: AccessRole;
  accessToken: string;
};

export function withAuthAction<TArgs extends unknown[], TResult>(
  action: (auth: AuthContext, ...args: TArgs) => Promise<TResult>,
  options?: AuthActionOptions,
) {
  return async (...args: TArgs): Promise<TResult | ActionResult> => {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (!session.accessToken) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (session.error) {
      return {
        success: false,
        error: session.error,
      };
    }

    if (options?.roles?.length) {
      const hasRole = options.roles.includes(session.user.role as AccessRole);

      if (!hasRole) {
        return {
          success: false,
          error: "Forbidden",
        };
      }
    }

    return action(
      {
        userId: session.user.id,
        role: session.user.role as AccessRole,
        accessToken: session.accessToken,
      },
      ...args,
    );
  };
}
