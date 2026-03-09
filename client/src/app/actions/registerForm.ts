"use server";

import { registerSchema } from "@/lib/validators/auth";
import { AuthFormState } from "@/types/auth.type";

const REGISTER_FAILURE_MESSAGE = "Registration failed. Please try again.";

export async function registerUser(
  _prevState: unknown,
  formData: FormData
): Promise<AuthFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: AuthFormState["errors"] = {};

    parsed.error.errors.forEach((err) => {
      const field = err.path[0] as keyof NonNullable<AuthFormState["errors"]>;
      errors[field] = err.message;
    });

    return {
      errors,
      values: {
        name: raw.name,
        email: raw.email,
      },
    };
  }

  try {
    const res = await fetch(`${process.env.GO_API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      let message = REGISTER_FAILURE_MESSAGE;

      try {
        const data = (await res.json()) as {
          error?: string;
          message?: string;
        };
        message = data.message ?? data.error ?? REGISTER_FAILURE_MESSAGE;
      } catch {
        // keep fallback message
      }

      return {
        errors: { general: message },
        values: {
          name: parsed.data.name,
          email: parsed.data.email,
        },
      };
    }

    return {
      success: true,
      values: {
        name: parsed.data.name,
        email: parsed.data.email,
      },
    };
  } catch {
    return {
      errors: { general: "Unable to reach server. Please try again." },
      values: {
        name: parsed.data.name,
        email: parsed.data.email,
      },
    };
  }
}
