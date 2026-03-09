import { goApiFetch } from "@/lib/auth/goApi";

type AuthInput = {
  accessToken: string;
};

async function extractApiError(res: Response, fallback: string) {
  try {
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await res.json()) as {
        error?: string;
        message?: string;
      };
      return payload.message ?? payload.error ?? fallback;
    }

    const text = await res.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export const userService = {
  async create(data: { name: string; email: string; role: string }, auth: AuthInput) {
    const res = await goApiFetch("/users", {
      method: "POST",
      body: JSON.stringify(data),
      accessToken: auth.accessToken,
    });

    if (!res.ok) {
      throw new Error(await extractApiError(res, "Failed to create user"));
    }

    return res.json();
  },

  async getAll(params: { page?: number; limit?: number }, auth: AuthInput) {
    const query = new URLSearchParams();

    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const res = await goApiFetch(`/users?${query.toString()}`, {
      method: "GET",
      accessToken: auth.accessToken,
    });

    if (!res.ok) {
      throw new Error(await extractApiError(res, "Failed to fetch users"));
    }

    return res.json();
  },

  async getById(id: string, auth: AuthInput) {
    const res = await goApiFetch(`/users/${id}`, {
      method: "GET",
      accessToken: auth.accessToken,
    });

    if (!res.ok) {
      throw new Error(await extractApiError(res, "Failed to fetch user"));
    }

    return res.json();
  },

  async update(id: string, data: unknown, auth: AuthInput) {
    const res = await goApiFetch(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      accessToken: auth.accessToken,
    });

    if (!res.ok) {
      throw new Error(await extractApiError(res, "Failed to update user"));
    }

    return res.json();
  },

  async delete(id: string, auth: AuthInput) {
    const res = await goApiFetch(`/users/${id}`, {
      method: "DELETE",
      accessToken: auth.accessToken,
    });

    if (!res.ok) {
      throw new Error(await extractApiError(res, "Failed to delete user"));
    }

    return null;
  },
};
