"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { AppSessionProviderProps } from "@/types/auth.type";

export default function SessionProvider({ session, children }: AppSessionProviderProps) {
  return <NextAuthSessionProvider session={session}>{children}</NextAuthSessionProvider>;
}
