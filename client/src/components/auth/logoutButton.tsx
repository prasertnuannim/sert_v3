"use client";

import { signOut } from "next-auth/react";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { FaSignOutAlt } from "react-icons/fa";
import clsx from "clsx";
import type { ReactNode } from "react";

type LogoutButtonProps = {
  callbackUrl?: string;
  className?: string;
  showText?: boolean;
  text?: string;
  icon?: ReactNode;
  iconClassName?: string;
  variant?: "danger" | "ghost" | "unstyled";
};

export function LogoutButton({
  callbackUrl = "/",
  className,
  showText = false,
  text = "Logout",
  icon,
  iconClassName,
  variant = "danger",
}: LogoutButtonProps) {
  const handleClick = async () => {
    await signOut({ callbackUrl });
  };

  const variantClassName =
    variant === "danger"
      ? "bg-red-500 hover:bg-red-600 text-white"
      : variant === "ghost"
        ? "bg-transparent hover:bg-white/20 text-white/90"
        : "";

  return (
    <TooltipButton
      label={text}
      onClick={handleClick}
      className={clsx(
        "px-2 py-1 rounded flex items-center gap-2",
        variantClassName,
        className
      )}
    >
      {icon ?? <FaSignOutAlt className={iconClassName} />}
      {showText ? <span className="text-sm">{text}</span> : null}
    </TooltipButton>
  );
}
