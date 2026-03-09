import React from "react";
import ColorMotionInChar from "@/components/motion/colorMotionInChar";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getServerAuthSession } from "@/server/services/auth/sessionService";

export default async function Navbar() {
  const session = await getServerAuthSession();
  const userName = session?.user?.name ?? "User";
  const userInitial = userName?.charAt(0)?.toUpperCase?.() ?? "?";

  return (
    <header
      className="
    sticky top-0 z-50
    w-full
    bg-gradient-to-r from-sky-200 via-indigo-200 to-gray-300
    backdrop-blur-md
    border-b border-white/15
    ring-1 ring-white/10
    shadow-[0_14px_50px_rgba(0,0,0,0.55),0_0_34px_rgba(34,211,238,0.22),0_0_50px_rgba(236,72,153,0.16)]
  "
    >
      <div className="mx-auto flex max-w-screen items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <ColorMotionInChar
            className="text-[22px] sm:text-[26px] font-bold"
            colors={["#FF5733", "#33FF57", "#3357FF", "#F0F"]}
            name="Smart Home"
          />
        </div>

        {/* Right side */}
        {session?.user ? (
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-[12px] text-white">Signed in as</div>
              <ColorMotionInChar
                className="text-[16px] font-semibold"
                colors={["#22D3EE", "#A78BFA", "#34D399", "#FBBF24"]}
                name={userName}
              />
            </div>

            <Avatar className="h-10 w-10 border border-white/15 bg-gray-800">
              <AvatarImage
                src={session.user.image ?? undefined}
                alt={userName}
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="text-sm text-white">
                {userInitial}
              </AvatarFallback>
            </Avatar>

            <LogoutButton />
          </div>
        ) : (
          <div className="text-sm text-red-300">Not logged in</div>
        )}
      </div>
    </header>
  );
}
