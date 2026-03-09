"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { getUsersAction, updateUserAction, deleteUserAction, createUserAction as baseCreateUserAction } from "./actions";
import { FullUser } from "@/types/account.type";
import { DataTable, Column } from "@/components/form/dataTable";

const roleToText = (role: FullUser["role"] | undefined) =>
  typeof role === "string" ? role : role?.name ?? "";
type UserColumnKey = "name" | "email" | "role";

export default function AccountForm() {
  const [users, setUsers] = useState<FullUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (): Promise<FullUser[]> => {
    const result = await getUsersAction({ page: 1, limit: 100 });
    if (!result?.success) {
      setUsersError(result?.error ?? "Failed to fetch users");
      return [];
    }
    setUsersError(null);

    const payload = result.data as { data?: unknown } | undefined;
    return Array.isArray(payload?.data) ? (payload.data as FullUser[]) : [];
  }, []);

  const syncUsers = useCallback(async () => {
    setIsUsersLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } finally {
      setIsUsersLoading(false);
    }
  }, [fetchUsers]);

  const createUserAction = async (state: FullUser[], formData: FormData): Promise<FullUser[]> => {
    const result = await baseCreateUserAction(formData);
    if (result?.success) {
      const updated = await fetchUsers();
      return updated;
    }
    return state;
  };
  const [state, , isCreatePending] = useActionState<FullUser[], FormData>(createUserAction, users);

  useEffect(() => {
    syncUsers();
  }, [syncUsers]);

  useEffect(() => {
    if (state && state.length >= users.length) {
      setUsers(state);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateUser = async (id: string, values: Partial<FullUser>) => {
    const upd: Record<string, unknown> = {
      ...values,
    };

    if (values.role !== undefined) {
      const role = roleToText(values.role);
      if (role) upd.role = role;
      else delete upd.role;
    }

    await updateUserAction(id, upd);
    await syncUsers();
  };

  const handleHardDeleteUser = async (id: string) => {
    await deleteUserAction(id);
    await syncUsers();
  };

  const columns: Column<FullUser, UserColumnKey>[] = [
    { key: "name", header: "Name", sortable: true,className: "break-all max-w-[260px]" },
    { key: "email", header: "Email", sortable: true,  className: "break-all max-w-[260px]" },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (u) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            roleToText(u.role) === "admin" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
          }`}
        >
          {roleToText(u.role)}
        </span>
      ),
      editor: ({ row, value, set }) => (
        <select
          value={roleToText(value)}
          onChange={(e) => set(e.target.value)}
          className="border px-2 py-1 rounded w-full text-sm"
        >
          <option value="admin">admin</option>
          <option value="user">user</option>
        </select>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-5">
      <DataTable<FullUser, UserColumnKey>
        data={users}
        columns={columns}
        initialPageSize={10}
        initialSort={{ key: "name", dir: "asc" }}
        searchPlaceholder="Search name / email / role…"
        emptyMessage={usersError ?? "No results."}
        isLoading={isUsersLoading || isCreatePending}
        onUpdate={handleUpdateUser}
        onHardDelete={handleHardDeleteUser}
        confirmDeleteTitle="Delete this user permanently?"
        confirmDeleteDescription="This action cannot be undone."
        confirmDeleteText="Delete"
        confirmDeleteClassName="bg-red-600 text-white hover:bg-red-700 cursor-pointer"
        getConfirmDeleteProps={(row) => ({
          title: `Permanently delete “${row.name ?? row.email ?? row.id}”?`,
          description: "This record will be removed from the system forever.",
          confirmText: "Confirm delete",
        })}
      />
    </div>
  );
}
