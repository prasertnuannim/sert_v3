"use client";

type Props = {
  message?: string;
  title?: string;
  variant?: "error" | "success" | "info" | "warning";
  className?: string;
};

const styles = {
  error:
    "border-red-300 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-200",
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200",
  info: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-200",
  warning:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200",
};

export default function FormAlert({
  message,
  title,
  variant = "error",
  className = "",
}: Props) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-md border px-3 py-2 text-sm shadow-sm ${styles[variant]} ${className}`}
    >
      <div className="flex flex-col items-center-safe">
        {title && <div className="mb-0.5 font-semibold">{title}</div>}
        <p>{message}</p>
      </div>
    </div>
  );
}
