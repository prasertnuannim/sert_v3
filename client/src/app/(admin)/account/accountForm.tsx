"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getUsersAction, updateUserAction, deleteUserAction } from "./actions";
import { FullUser } from "@/types/account.type";
import { DataTable, Column } from "@/components/form/dataTable";
import CreateUserDialog from "./createUserDialog";

const roleToText = (role: FullUser["role"] | undefined) =>
  typeof role === "string" ? role : role?.name ?? "";
type UserColumnKey = "name" | "email" | "role" | "tenant" | "promotion";

const toSelectOptions = (values: Array<string | undefined>) =>
  Array.from(
    new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

const withCurrentOption = (options: string[], value: string | undefined) => {
  const normalized = value?.trim() ?? "";
  if (!normalized || options.includes(normalized)) return options;
  return [normalized, ...options];
};

export default function AccountForm() {
  const [users, setUsers] = useState<FullUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [openCreateUser, setOpenCreateUser] = useState(false);

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

  useEffect(() => {
    syncUsers();
  }, [syncUsers]);

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

  const handleCreateUserSuccess = useCallback(async () => {
    await syncUsers();
  }, [syncUsers]);

  const tenantOptions = useMemo(
    () => toSelectOptions(users.map((user) => user.tenant)),
    [users]
  );
  const promotionOptions = useMemo(
    () => toSelectOptions(users.map((user) => user.promotion)),
    [users]
  );

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
      editor: ({ value, set }) => (
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
    {
      key: "tenant",
      header: "Tenant",
      sortable: true,
      className: "break-all max-w-[220px]",
      editor: ({ value, set }) => {
        const currentValue = typeof value === "string" ? value : "";
        const options = withCurrentOption(tenantOptions, currentValue);

        return (
          <select
            value={currentValue}
            onChange={(e) => set(e.target.value)}
            className="border px-2 py-1 rounded w-full text-sm"
          >
            <option value="">No tenant</option>
            {options.map((tenant) => (
              <option key={tenant} value={tenant}>
                {tenant}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "promotion",
      header: "Promotion",
      sortable: true,
      className: "break-all max-w-[220px]",
      editor: ({ value, set }) => {
        const currentValue = typeof value === "string" ? value : "";
        const options = withCurrentOption(promotionOptions, currentValue);

        return (
          <select
            value={currentValue}
            onChange={(e) => set(e.target.value)}
            className="border px-2 py-1 rounded w-full text-sm"
          >
            <option value="">No promotion</option>
            {options.map((promotion) => (
              <option key={promotion} value={promotion}>
                {promotion}
              </option>
            ))}
          </select>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto py-5">
      <DataTable<FullUser, UserColumnKey>
        data={users}
        columns={columns}
        onCreateClick={() => setOpenCreateUser(true)}
        createButtonText="Add user"
        initialPageSize={10}
        initialSort={{ key: "name", dir: "asc" }}
        searchPlaceholder="Search name / email / role / tenant / promotion…"
        emptyMessage={usersError ?? "No results."}
        isLoading={isUsersLoading}
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
      {openCreateUser && (
        <CreateUserDialog
          open={openCreateUser}
          onOpenChange={setOpenCreateUser}
          onCreated={handleCreateUserSuccess}
          tenantOptions={tenantOptions}
          promotionOptions={promotionOptions}
        />
      )}
    </div>
  );
}
