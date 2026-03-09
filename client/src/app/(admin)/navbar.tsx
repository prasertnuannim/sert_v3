"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useSidebar } from "@/context/sidebar-context";

export default function Navbar() {
  const { toggle, open } = useSidebar();

  return (
    <div
      className={clsx(
        "h-18 w-full flex items-center justify-between px-6 bg-gray-800 shadow-md sticky top-0 z-40 rounded-lg "
      )}
    >
      <div className="flex items-center gap-3">
        {/* Toggle Button */}
        <button
          onClick={toggle}
          className="p-1 rounded-full bg-white/30 border border-white/20 backdrop-blur-md transition-all duration-300 ease-out hover:bg-white/20 hover:scale-125 hover:shadow-[0_0_12px_rgba(255,255,255,0.35)] active:scale-95"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={open ? "left" : "right"}
              initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {open ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* Title */}
        <h1 className="text-lg font-semibold text-white drop-shadow-sm">
          Admin
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* เพิ่ม icons / avatar ได้ทีหลัง */}
      </div>
    </div>
  );
}
