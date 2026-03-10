"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AccessRole } from "@/lib/auth/accessRole";
import { userService } from "@/services/userService";
import { withAuthAction, type AuthContext } from "@/services/security/safeAction";

export type FullUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant: string;
  promotion: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AccountActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type UsersPageResult = {
  data: FullUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  role: z.string().trim().min(1, "Role is required"),
  tenant: z.string().trim().optional().default(""),
  promotion: z.string().trim().optional().default(""),
});

const updateUserSchema = createUserSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const backendUserSchema = z
  .object({
    id: z.string(),
    name: z.string().optional().default(""),
    email: z.string().optional().default(""),
    role: z.string().optional().default("user"),
    tenant: z.string().optional().default(""),
    promotion: z.string().optional().default(""),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "An unexpected error occurred";

const parseNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toUser = (input: unknown): FullUser => {
  const parsed = backendUserSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid user payload from backend");
  }

  return {
    id: parsed.data.id,
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    tenant: parsed.data.tenant,
    promotion: parsed.data.promotion,
    createdAt: parsed.data.createdAt ?? parsed.data.created_at,
    updatedAt: parsed.data.updatedAt ?? parsed.data.updated_at,
  };
};

const normalizeUsersResult = (
  input: unknown,
  fallbackPage: number,
  fallbackLimit: number,
): UsersPageResult => {
  if (Array.isArray(input)) {
    return {
      data: input.map(toUser),
      page: fallbackPage,
      limit: fallbackLimit,
      total: input.length,
      totalPages: Math.max(1, Math.ceil(input.length / fallbackLimit)),
    };
  }

  if (input && typeof input === "object") {
    const payload = input as {
      data?: unknown;
      users?: unknown;
      list?: unknown;
      page?: unknown;
      limit?: unknown;
      total?: unknown;
      totalPages?: unknown;
      total_pages?: unknown;
    };

    const rawUsers = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.users)
        ? payload.users
        : Array.isArray(payload.list)
          ? payload.list
          : [];

    const page = parseNumber(payload.page, fallbackPage);
    const limit = parseNumber(payload.limit, fallbackLimit);
    const total = parseNumber(payload.total, rawUsers.length);
    const totalPages = parseNumber(
      payload.totalPages ?? payload.total_pages,
      Math.max(1, Math.ceil(total / limit)),
    );

    return {
      data: rawUsers.map(toUser),
      page,
      limit,
      total,
      totalPages,
    };
  }

  throw new Error("Invalid users response from backend");
};

const createUser = async (
  auth: AuthContext,
  formData: FormData,
): Promise<AccountActionResult<FullUser>> => {
  const parsed = createUserSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
    tenant: String(formData.get("tenant") ?? ""),
    promotion: String(formData.get("promotion") ?? ""),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const user = toUser(await userService.create(parsed.data, { accessToken: auth.accessToken }));
    revalidatePath("/account");
    return { success: true, data: user };
  } catch (error: unknown) {
    return { success: false, error: toErrorMessage(error) };
  }
};

const getUsers = async (
  auth: AuthContext,
  raw?: unknown,
): Promise<AccountActionResult<UsersPageResult>> => {
  const parsed = paginationSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const result = await userService.getAll(parsed.data, { accessToken: auth.accessToken });
    const normalized = normalizeUsersResult(result, parsed.data.page, parsed.data.limit);
    return { success: true, data: normalized };
  } catch (error: unknown) {
    return { success: false, error: toErrorMessage(error) };
  }
};

const updateUser = async (
  auth: AuthContext,
  userId: string,
  data: unknown,
): Promise<AccountActionResult<FullUser>> => {
  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const updated = toUser(
      await userService.update(userId, parsed.data, { accessToken: auth.accessToken }),
    );
    revalidatePath("/account");
    return { success: true, data: updated };
  } catch (error: unknown) {
    return { success: false, error: toErrorMessage(error) };
  }
};

const deleteUser = async (
  auth: AuthContext,
  userId: string,
): Promise<AccountActionResult<null>> => {
  try {
    await userService.delete(userId, { accessToken: auth.accessToken });
    revalidatePath("/account");
    return { success: true, data: null };
  } catch (error: unknown) {
    return { success: false, error: toErrorMessage(error) };
  }
};

export const createUserAction = withAuthAction(createUser, {
  roles: [AccessRole.Admin],
});

export const getUsersAction = withAuthAction(getUsers, {
  roles: [AccessRole.Admin],
});

export const updateUserAction = withAuthAction(updateUser, {
  roles: [AccessRole.Admin],
});

export const deleteUserAction = withAuthAction(deleteUser, {
  roles: [AccessRole.Admin],
});
