"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type SubmitButtonProps = {
  text: string;
  className?: string;
  isPending: boolean;
};

export function SubmitButton({
  text,
  className,
  isPending = false,
}: SubmitButtonProps) {
  const busy = !!isPending;

  return (
    <Button
      type="submit"
      disabled={busy}
      aria-busy={busy}
      className={[
        "w-full rounded-md py-2 text-white font-semibold transition duration-300",
        busy
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-blue-500 hover:bg-blue-600",
        className ?? "",
      ].join(" ")}
    >
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {busy ? "Processing..." : text}
    </Button>
  );
}
