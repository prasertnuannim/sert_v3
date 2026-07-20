"use client";

import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil,
  Save,
  Trash2,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { ConfirmDialog } from "./confirmDialog";

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K; dir: SortDir } | null;

export type Column<T, K extends keyof T & string> = {
  key: K;
  header: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  className?: string;
  render?: (row: T) => ReactNode;
  editor?: (args: {
    row: T;
    value: T[K] | undefined;
    set: (v: T[K]) => void;
  }) => ReactNode;
};

export type RenderActionsArgs<T extends { id: string }> = {
  row: T;
  isEditing: boolean;
  startEdit: (row: T) => void;
  cancelEdit: () => void;
  saveEdit: (id: string) => void;
  hardDelete?: (id: string) => void;
};

export type DataTableProps<
  T extends { id: string },
  K extends keyof T & string
> = {
  data: T[];
  columns: Column<T, K>[];

  onCreateClick?: () => void;
  onUpdate?: (id: string, values: Partial<T>) => Promise<void> | void;
  onHardDelete?: (id: string) => Promise<void> | void;

  searchPredicate?: (row: T, term: string) => boolean;
  initialPageSize?: number;
  initialSort?: SortState<K>;
  searchPlaceholder?: string;
  createButtonText?: string;

  /** 👇 Skeleton Loading options */
  isLoading?: boolean;
  loadingRows?: number;

  renderActions?: (args: RenderActionsArgs<T>) => ReactNode;

  confirmDeleteTitle?: string;
  confirmDeleteDescription?: string;
  confirmDeleteText?: string;
  confirmDeleteClassName?: string;
  emptyMessage?: string;

  getConfirmDeleteProps?: (row: T) => {
    title?: string;
    description?: string;
    confirmText?: string;
    confirmClassName?: string;
  };
};

const toDisplayPrimitive = (raw: unknown): string => {
  if (raw == null) return "";
  if (typeof raw === "object") {
    const name = (raw as Record<string, unknown>)?.name;
    if (["string", "number", "boolean"].includes(typeof name))
      return String(name);
    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  }
  return String(raw);
};

const DEFAULT_COLUMN_MIN_WIDTH = 120;

export function DataTable<
  T extends { id: string },
  K extends keyof T & string
>({
  data,
  columns,
  onCreateClick,
  onUpdate,
  onHardDelete,
  searchPredicate,
  initialPageSize = 10,
  initialSort = null,
  searchPlaceholder = "Search…",
  createButtonText = "Add",

  /** Skeleton */
  isLoading = false,
  loadingRows = 8,

  renderActions,
  confirmDeleteTitle = "Delete permanently?",
  confirmDeleteDescription = "This action cannot be undone.",
  confirmDeleteText = "Delete",
  confirmDeleteClassName = "bg-red-600 text-white hover:bg-red-700",
  emptyMessage = "No results.",
  getConfirmDeleteProps,
}: DataTableProps<T, K>) {
  // --- State ---
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<K>>(initialSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [resizedColumnWidths, setResizedColumnWidths] = useState<
    Partial<Record<K, number>>
  >({});

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<T>>({});
  const showActions = Boolean(renderActions || onUpdate || onHardDelete);
  const resizeStateRef = useRef<{
    key: K;
    startX: number;
    startWidth: number;
    minWidth: number;
    maxWidth?: number;
  } | null>(null);
  const columnWidths = useMemo(
    () =>
      columns.reduce((acc, col) => {
        const width = resizedColumnWidths[col.key] ?? col.width;
        if (typeof width === "number") {
          acc[col.key] = width;
        }
        return acc;
      }, {} as Partial<Record<K, number>>),
    [columns, resizedColumnWidths]
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const active = resizeStateRef.current;
      if (!active) return;

      const nextWidth = Math.round(
        Math.min(
          active.maxWidth ?? Number.POSITIVE_INFINITY,
          Math.max(active.minWidth, active.startWidth + event.clientX - active.startX)
        )
      );

      setResizedColumnWidths((prev) =>
        prev[active.key] === nextWidth
          ? prev
          : {
              ...prev,
              [active.key]: nextWidth,
            }
      );
    };

    const stopResize = () => {
      if (!resizeStateRef.current) return;
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
      stopResize();
    };
  }, []);

  // --- Search ---
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase();

    const isMatch = (row: T) => {
      if (searchPredicate) return searchPredicate(row, term);
      for (const col of columns) {
        if (col.searchable === false) continue;
        const raw = row[col.key];
        const s = toDisplayPrimitive(raw).toLowerCase();
        if (s.includes(term)) return true;
      }
      return false;
    };

    return data.filter(isMatch);
  }, [data, search, columns, searchPredicate]);

  // --- Sort ---
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { key, dir } = sort;
    const mult = dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[key];
      const bv = b[key];

      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * mult;
      }
      return (
        toDisplayPrimitive(av).localeCompare(
          toDisplayPrimitive(bv),
          undefined,
          { sensitivity: "base" }
        ) * mult
      );
    });
  }, [filtered, sort]);

  // --- Pagination ---
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);

  const pageRows = useMemo(
    () => sorted.slice(startIdx, endIdx),
    [sorted, startIdx, endIdx]
  );

  // --- Sort toggle ---
  const toggleSort = (key: K, enabled?: boolean) => {
    if (!enabled) return;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  // --- Inline Edit ---
  const startEdit = (row: T) => {
    setEditingRowId(row.id);
    const initialDraft = columns.reduce((acc, col) => {
      acc[col.key] = row[col.key];
      return acc;
    }, {} as Partial<T>);
    setDraft(initialDraft);
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setDraft({});
  };
  const saveEdit = async (id: string) => {
    if (onUpdate && Object.keys(draft).length > 0) {
      await onUpdate(id, draft as Partial<T>);
    }

    cancelEdit();
  };
  const hardDelete = async (id: string) => {
    if (onHardDelete) await onHardDelete(id);
  };
  const setDraftField = <Key extends keyof T & string>(
    key: Key,
    value: T[Key]
  ) => setDraft((p) => ({ ...p, [key]: value }));

  const getColumnMinWidth = (col: Column<T, K>) =>
    col.minWidth ??
    Math.min(
      typeof col.width === "number" ? col.width : DEFAULT_COLUMN_MIN_WIDTH,
      DEFAULT_COLUMN_MIN_WIDTH
    );

  const getColumnStyle = (col: Column<T, K>): React.CSSProperties | undefined => {
    const width = columnWidths[col.key] ?? col.width;
    const minWidth = getColumnMinWidth(col);

    if (
      typeof width !== "number" &&
      typeof minWidth !== "number" &&
      typeof col.maxWidth !== "number"
    ) {
      return undefined;
    }

    return {
      width: typeof width === "number" ? `${width}px` : undefined,
      minWidth: typeof minWidth === "number" ? `${minWidth}px` : undefined,
      maxWidth: typeof col.maxWidth === "number" ? `${col.maxWidth}px` : undefined,
    };
  };

  const startResize = (
    col: Column<T, K>,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const headerCell = event.currentTarget.parentElement;
    const startWidth =
      columnWidths[col.key] ??
      headerCell?.getBoundingClientRect().width ??
      col.width ??
      getColumnMinWidth(col);

    resizeStateRef.current = {
      key: col.key,
      startX: event.clientX,
      startWidth,
      minWidth: getColumnMinWidth(col),
      maxWidth: col.maxWidth,
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const defaultEditor = <Key extends keyof T & string>(key: Key) => {
    const v = draft[key] as T[Key];
    if (typeof v === "boolean") {
      return (
        <input
          type="checkbox"
          checked={Boolean(v)}
          onChange={(e) =>
            setDraftField(key, e.target.checked as T[typeof key])
          }
        />
      );
    }
    if (typeof v === "number") {
      return (
        <input
          type="number"
          value={String(v)}
          onChange={(e) =>
            setDraftField(
              key,
              e.target.value === ""
                ? ("" as T[typeof key])
                : (Number(e.target.value) as T[typeof key])
            )
          }
          className="border px-2 py-1 rounded w-full text-sm"
        />
      );
    }
    return (
      <input
        value={String(v ?? "")}
        onChange={(e) => setDraftField(key, e.target.value as T[typeof key])}
        className="border px-2 py-1 rounded w-full text-sm"
      />
    );
  };

  const SortIcon = ({ col }: { col: K }) => {
    if (!sort || sort.key !== col) return <ArrowUpDown size={14} />;
    return sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  // --- Default Actions ---
  const defaultRenderActions = ({
    row,
    isEditing,
    startEdit,
    cancelEdit,
    saveEdit,
    hardDelete,
  }: RenderActionsArgs<T>) => {
    if (isEditing) {
      return (
        <div className="flex gap-2 justify-center">
          <button onClick={() => saveEdit(row.id)} className="text-green-600 cursor-pointer">
            <Save size={18} />
          </button>
          <button onClick={cancelEdit} className="text-gray-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>
      );
    }

    const dyn = getConfirmDeleteProps?.(row) ?? {};
    const title = dyn.title ?? confirmDeleteTitle;
    const description = dyn.description ?? confirmDeleteDescription;
    const confirmText = dyn.confirmText ?? confirmDeleteText;
    const confirmClassName = dyn.confirmClassName ?? confirmDeleteClassName;

    return (
      <div className="flex gap-2 justify-center">
        {onUpdate && (
          <button onClick={() => startEdit(row)} className="text-blue-600 cursor-pointer">
            <Pencil size={18} />
          </button>
        )}

        {onHardDelete && (
          <ConfirmDialog
            trigger={
              <button className="text-red-600 cursor-pointer">
                <Trash2 size={18} />
              </button>
            }
            title={title}
            description={description}
            confirmText={confirmText}
            confirmClassName={confirmClassName}
            onConfirm={() => hardDelete?.(row.id)}
          />
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------
  // 🟥 RENDER START
  // -------------------------------------------------------------------

  return (
    <div className="rounded-md border min-h-[250px] flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-4 py-3">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded px-3 py-1 text-sm w-full md:w-64"
        />

        {onCreateClick && (
          <button
            onClick={onCreateClick}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            {createButtonText}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <colgroup>
            {columns.map((col) => (
              <col
                key={`col-${String(col.key)}`}
                style={getColumnStyle(col)}
              />
            ))}
            {showActions && <col style={{ width: "112px", minWidth: "112px" }} />}
          </colgroup>
          <thead className="bg-gray-100">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="relative border px-4 py-2 pr-5 text-left"
                  style={getColumnStyle(col)}
                >
                  <button
                    onClick={() => toggleSort(col.key, col.sortable)}
                    className={`inline-flex items-center gap-1 ${
                      col.sortable ? "hover:underline cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {col.header} {col.sortable && <SortIcon col={col.key} />}
                  </button>
                  {col.resizable !== false && (
                    <div
                      role="separator"
                      aria-label={`Resize ${col.header} column`}
                      aria-orientation="vertical"
                      onPointerDown={(event) => startResize(col, event)}
                      className="absolute inset-y-0 right-0 flex w-3 cursor-col-resize touch-none select-none items-stretch justify-center"
                    >
                      <span className="my-1 w-px bg-transparent transition-colors hover:bg-gray-300" />
                    </div>
                  )}
                </th>
              ))}
              {showActions && (
                <th className="border px-4 py-2 text-center">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {/* 🟦 Skeleton rows */}
            {isLoading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="border px-4 py-2"
                      style={getColumnStyle(col)}
                    >
                      <SkeletonCell
                        width={
                          col.key === "name"
                            ? "w-2/3"
                            : col.key === "email"
                            ? "w-full"
                            : "w-1/2"
                        }
                      />
                    </td>
                  ))}
                  {showActions && (
                    <td className="border px-4 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <SkeletonCell width="w-4" />
                        <SkeletonCell width="w-4" />
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : pageRows.length ? (
              pageRows.map((row) => {
                const isEditing = editingRowId === row.id;
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {columns.map((col) => {
                      const value = isEditing
                        ? (draft as T)[col.key]
                        : row[col.key];
                      return (
                        <td
                          key={`${row.id}-${String(col.key)}`}
                          className={`border px-4 py-2 ${col.className ?? ""}`}
                          style={getColumnStyle(col)}
                        >
                          {isEditing
                            ? col.editor
                              ? col.editor({
                                  row,
                                  value,
                                  set: (v: T[K]) => setDraftField(col.key, v),
                                })
                              : defaultEditor(col.key)
                            : col.render
                            ? col.render(row)
                            : toDisplayPrimitive(value)}
                        </td>
                      );
                    })}

                    {showActions && (
                      <td className="border px-4 py-2 text-center">
                        {(renderActions ?? defaultRenderActions)({
                          row,
                          isEditing,
                          startEdit,
                          cancelEdit,
                          saveEdit,
                          hardDelete,
                        })}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (showActions ? 1 : 0)}
                  className="text-center py-4 text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Footer */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t mt-auto">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            {total ? `${startIdx + 1}–${endIdx} of ${total}` : "0 of 0"}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              {[5, 10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center">
          <button
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            onClick={() => setPage(1)}
            disabled={safePage <= 1}
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-2 text-sm">
            Page <span className="font-medium">{safePage}</span> / {totalPages}
          </span>
          <button
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            <ChevronRight size={18} />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonCell({ width = "w-3/4" }: { width?: string }) {
  return (
    <div
      className={`
        h-4 ${width} rounded
        bg-linear-to-r
        from-gray-200 via-gray-300 to-gray-200
        bg-size-[400px_100%]
        animate-[shimmer_3s_ease-in-out_infinite]
      `}
    />
  );
}
