"use client";

import { createContext, useContext, useState } from "react";

type SidebarContextType = {
  open: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <SidebarContext.Provider
      value={{
        open,
        toggle: () => setOpen((p) => !p),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("SidebarContext missing");
  return ctx;
}
