"use client";

import { useActionState, useEffect } from "react";
import FormAlert from "@/components/form/formAlert";
import FormInput from "@/components/form/formInput";
import { SubmitButton } from "@/components/form/submitButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createUserAction } from "./actions";

type CreateUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void | Promise<void>;
  tenantOptions: string[];
  promotionOptions: string[];
};

type CreateUserFormValues = {
  name: string;
  email: string;
  role: string;
  tenant: string;
  promotion: string;
};

type CreateUserFormState = {
  success?: boolean;
  error?: string;
  values: CreateUserFormValues;
};

const initialValues: CreateUserFormValues = {
  name: "",
  email: "",
  role: "user",
  tenant: "",
  promotion: "",
};

const initialState: CreateUserFormState = {
  values: initialValues,
};

async function submitCreateUser(
  _prevState: CreateUserFormState,
  formData: FormData
): Promise<CreateUserFormState> {
  const values: CreateUserFormValues = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? "user"),
    tenant: String(formData.get("tenant") ?? ""),
    promotion: String(formData.get("promotion") ?? ""),
  };

  const result = await createUserAction(formData);

  if (
    !result ||
    typeof result !== "object" ||
    !("success" in result) ||
    !result.success
  ) {
    const error =
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "Failed to create user";

    return {
      error,
      values,
    };
  }

  return {
    success: true,
    values: initialValues,
  };
}

export default function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
  tenantOptions,
  promotionOptions,
}: CreateUserDialogProps) {
  const [state, formAction, isPending] = useActionState(
    submitCreateUser,
    initialState
  );
  const tenantSelectOptions = state.values.tenant
    ? Array.from(new Set([state.values.tenant, ...tenantOptions]))
    : tenantOptions;
  const promotionSelectOptions = state.values.promotion
    ? Array.from(new Set([state.values.promotion, ...promotionOptions]))
    : promotionOptions;

  useEffect(() => {
    if (!state.success) return;

    onOpenChange(false);
    void onCreated?.();
  }, [state.success, onCreated, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a user from the admin account page.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              name="name"
              type="text"
              label="Name"
              defaultValue={state.values.name}
            />

            <FormInput
              name="email"
              type="email"
              label="Email"
              defaultValue={state.values.email}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role" className="p-1">
                Role
              </Label>
              <select
                id="role"
                name="role"
                defaultValue={state.values.role}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant" className="p-1">
                Tenant
              </Label>
              <select
                id="tenant"
                name="tenant"
                defaultValue={state.values.tenant}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">No tenant</option>
                {tenantSelectOptions.map((tenant) => (
                  <option key={tenant} value={tenant}>
                    {tenant}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promotion" className="p-1">
              Promotion
            </Label>
            <select
              id="promotion"
              name="promotion"
              defaultValue={state.values.promotion}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">No promotion</option>
              {promotionSelectOptions.map((promotion) => (
                <option key={promotion} value={promotion}>
                  {promotion}
                </option>
              ))}
            </select>
          </div>

          <SubmitButton text="Add user" isPending={isPending} />

          <FormAlert variant="error" message={state.error} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
