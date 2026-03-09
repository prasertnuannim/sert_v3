"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";

type SocialSignInButtonProps = {
  provider?: "google" | string;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
};

export const SocialSignInButton = ({
  provider = "google",
  label = "Continue with Google",
  icon = <FcGoogle className="w-6 h-6 mr-2" />,
  className,
}: SocialSignInButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (loading) return;
    setLoading(true);
    signIn(provider, { callbackUrl: "/" });
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      aria-live="polite"
      className={`
        w-full bg-white/20 hover:bg-white/40 
        text-black transition cursor-pointer
        ${className}
      `}
      variant="outline"
    >
      {loading ? (
        <>
          {icon}
          <span className="text-sm font-medium flex items-center gap-0.2">
            Loading
            <span className="loading-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </span>
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </Button>
  );
};
