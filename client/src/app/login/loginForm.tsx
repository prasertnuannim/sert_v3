"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { SubmitButton } from "@/components/form/submitButton";
import FormInput from "@/components/form/formInput";
import { LoginFormState } from "@/types/auth.type";
import FormAlert from "@/components/form/formAlert";
import { loginSchema } from "@/lib/validators/auth";
import RegisterModal from "@/components/auth/registerForm";

export default function LoginForm() {
  const router = useRouter();
  const initialState: LoginFormState = {
    errors: {},
    values: { email: "admin@example.com", password: "Admin1234" },
  };

  const [state, setState] = useState<LoginFormState>(initialState);
  const [isPending, setIsPending] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const raw = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      const errors: LoginFormState["errors"] = {};
      parsed.error.errors.forEach((err) => {
        const field = err.path[0] as keyof NonNullable<LoginFormState["errors"]>;
        errors[field] = err.message;
      });

      setState({
        errors,
        values: {
          email: raw.email,
          password: raw.password,
        },
      });
      return;
    }

    try {
      setIsPending(true);
      setState((prev) => ({
        ...prev,
        errors: {},
      }));

      const result = await signIn("credentials", {
        redirect: false,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackUrl: "/",
      });

      if (result?.error) {
        setState({
          errors: { general: "Invalid email or password" },
          values: { email: parsed.data.email },
        });
        return;
      }

      router.push(result?.url ?? "/");
      router.refresh();
    } catch {
      setState({
        errors: { general: "Unable to login. Please try again." },
        values: { email: parsed.data.email },
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-1">
        <p className="flex justify-center text-md text-black/20 font-bold">Login with Email</p>
        <FormInput
          name="email"
          type="email"
          label="Email"
          placeholder="Your email"
          defaultValue={state.values?.email}
          error={state.errors?.email}
        />
        <FormInput
          name="password"
          type="password"
          label="Password"
          placeholder="Your password"
          defaultValue={state.values?.password}
          error={state.errors?.password}
        />
        <SubmitButton text="Login" isPending={isPending} />

        {state.errors?.general && (
          <FormAlert
            variant="error"
            title="Login failed"
            message={state.errors?.general}
          />
        )}

        <div className="flex justify-end">
          <button
            type="button"
             onClick={() => setOpenRegister(true)}
            className="hover:text-gray-400 text-gray-500 transition text-sm"
          >
            Register here
          </button>
        </div>
      </form>

      <RegisterModal open={openRegister} onOpenChange={setOpenRegister} />
    </>
  );
}
