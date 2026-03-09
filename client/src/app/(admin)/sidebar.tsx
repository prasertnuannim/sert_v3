"use client";

import { useState, type ReactNode, useRef, useEffect } from "react";
import {
  Layers,
  ChevronDown,
  Power,
  Settings,
  User,
  ClipboardList,
} from "lucide-react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/sidebar-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/auth/logoutButton";

/* ---------------- TYPES ---------------- */

type SidebarProfile = {
  name: string;
  email: string | null;
  role: string | null;
  image: string | null;
};

/* ---------------- MAIN ---------------- */

export default function Sidebar({ profile }: { profile: SidebarProfile | null }) {
  const { open } = useSidebar();
  const pathname = usePathname() ?? "";
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);


  const isStatisticsActive =
    pathname === "/statistics" || pathname.startsWith("/statistics");

  const avatarSrc =
    profile?.image && profile.image.trim().length > 0
      ? profile.image
      : "/avatar1.png";

  /* ----- Close popover on outside click ----- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setSubmenuOpen(false);
      }
    }

    if (!open && submenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [submenuOpen, open]);

  return (
    <aside
      className={clsx(
        "h-dvh sticky top-0 z-40 flex flex-col rounded-lg px-3",
        "bg-gray-800 text-white shadow-lg transition-all duration-500",
        open ? "w-64" : "w-20"
      )}
    >
      {/* PROFILE */}
      <div
        className={clsx(
          "flex flex-col items-center",
          open ? "mt-5 mb-6" : "mt-5 mb-5"
        )}
      >
        <Avatar
          className={clsx(
            "border border-white/20 bg-white",
            open ? "h-[70px] w-[70px]" : "h-12 w-12"
          )}
        >
          <AvatarImage src={avatarSrc} />
          <AvatarFallback>
            {profile?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>

        {open && (
          <>
            <h2 className="font-semibold mt-3">
              {profile?.name ?? "Guest"}
            </h2>
            <span className="text-xs text-white/70">
              {profile?.role ?? profile?.email}
            </span>
          </>
        )}
      </div>

      {/* MENU */}
      {open ? (
        <div className="flex flex-col space-y-1">
          <MenuItem
            href="/account"
            icon={<User size={20} />}
            label="Accounts"
            active={pathname.startsWith("/account")}
          />

          <MenuItem
            href="/auth-settings"
            icon={<Settings size={20} />}
            label="Settings"
            active={pathname.startsWith("/auth-settings")}
          />

          {/* EXPANDED STATISTICS */}
          <div className="">
            <button
              onClick={() =>
                setSubmenuOpen((prev) => {
                  const next = !prev;
                  localStorage.setItem("collapsed-statistics-open", String(next));
                  return next;
                })
              }
              className={clsx(
                "flex items-center w-full gap-3 px-3 py-2 rounded-xl",
                "hover:bg-white/20",
                isStatisticsActive && "bg-white/20"
              )}
            >
              <Layers size={20} />
              <span>Statistics</span>
              <ChevronDown
                size={18}
                className={clsx(
                  "ml-auto transition-transform",
                  submenuOpen && "rotate-180"
                )}
              />
            </button>

            <AnimatePresence>
              {submenuOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="pl-10 mt-1 space-y-1 overflow-hidden"
                >
                  <SubMenu />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* ---------- COLLAPSED MODE ---------- */
        <div className="relative flex flex-col items-center space-y-1 mt-4">
          <IconBtn
            href="/account"
            icon={<User size={22} />}
            active={pathname.startsWith("/account")}
          />

          <IconBtn
            href="/auth-settings"
            icon={<Settings size={22} />}
            active={pathname.startsWith("/auth-settings")}
          />

          {/* STATISTICS ICON */}
          <button
            onClick={() =>
              setSubmenuOpen((prev) => {
                const next = !prev;
                localStorage.setItem("collapsed-statistics-open", String(next));
                return next;
              })
            }
            className={clsx(
              "p-3 rounded-2xl transition",
              submenuOpen || isStatisticsActive
                ? "bg-white/30"
                : "hover:bg-white/20"
            )}
          >
            <Layers size={22} />
          </button>

          {/* FLOATING SUBMENU */}
          <AnimatePresence>
            {!open && submenuOpen && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-20 top-32 bg-gray-900 rounded-xl shadow-xl p-2 w-44"
              >
                <SubMenu onSelect={() => setSubmenuOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>
          <IconBtn
            href="/audit"
            icon={<ClipboardList size={22} />}
            active={pathname.startsWith("/audit")}
          />
        </div>
      )}

      {/* SIGN OUT */}
      <div className="mt-auto pb-3">
        <LogoutButton
          callbackUrl="/"
          icon={<Power size={20} />}
          showText={open}
          text="Sign Out"
          variant="ghost"
          className={clsx(
            "w-full rounded-xl",
            open ? "justify-start" : "justify-center"
          )}
        />
      </div>
    </aside>
  );
}

/* ---------------- SUB COMPONENTS ---------------- */

function MenuItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 px-3 py-2 rounded-xl",
        "hover:bg-white/20",
        active && "bg-white/30"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function SubMenu({ onSelect }: { onSelect?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <SubMenuItem
        href="/statistics/daily"
        label="Daily Report"
        active={pathname === "/statistics/daily"}
        onClick={onSelect}
      />
      <SubMenuItem
        href="/statistics/monthly"
        label="Monthly KPI"
        active={pathname === "/statistics/monthly"}
        onClick={onSelect}
      />
      <SubMenuItem
        href="/statistics/yearly"
        label="Yearly Summary"
        active={pathname === "/statistics/yearly"}
        onClick={onSelect}
      />
    </>
  );
}

function SubMenuItem({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "block px-3 py-2 rounded-lg text-sm transition",
        active
          ? "bg-white/20 text-white font-semibold"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      {label}
    </Link>
  );
}

function IconBtn({
  icon,
  active,
  href,
}: {
  icon: ReactNode;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "p-3 rounded-2xl transition",
        active ? "bg-white/30" : "hover:bg-white/20"
      )}
    >
      {icon}
    </Link>
  );
}
