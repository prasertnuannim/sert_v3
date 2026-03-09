"use client";

import { useActionState, useEffect, useRef } from "react";
import { registerUser } from "@/app/actions/registerForm";
import { AuthFormState } from "@/types/auth.type";
import FormInput from "@/components/form/formInput";
import FormAlert from "@/components/form/formAlert";
import { SubmitButton } from "@/components/form/submitButton";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type RegisterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const initialState: AuthFormState = {
  errors: {},
  values: { name: "", email: "", password: "", confirmPassword: "" },
};

export default function RegisterModal({
  open,
  onOpenChange,
}: RegisterModalProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction, isPending] = useActionState(
    registerUser,
    initialState
  );

  const values = state.values ?? {};

  useEffect(() => {
    if (!state.success) return;

    formRef.current?.reset();

    const timer = setTimeout(() => {
      onOpenChange(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [state.success, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>
            Sign up to get started
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          <FormInput
            name="name"
            type="text"
            label="Username"
            defaultValue={values.name ?? ""}
            error={state.errors?.name}
          />

          <FormInput
            name="email"
            type="email"
            label="Email"
            defaultValue={values.email ?? ""}
            error={state.errors?.email}
          />

          <FormInput
            name="password"
            type="password"
            label="Password"
            error={state.errors?.password}
          />

          <FormInput
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            error={state.errors?.confirmPassword}
          />

          <SubmitButton text="Register" isPending={isPending} />

          {state.errors?.general && (
            <FormAlert
              variant="error"
              message={state.errors.general}
            />
          )}

          {state.success && (
            <FormAlert
              variant="success"
              message="Registration successful!"
            />
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
