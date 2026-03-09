import { SocialSignInButton } from "@/components/auth/socialSignInButton";
import LoginForm from "./loginForm";
import { FaGithub } from "react-icons/fa";
import Image from "next/image";

export default function LoginPage() {
  return (
   <main className="relative flex items-center justify-center bg-linear-to-br from-sky-200 via-blue-200 to-gray-300 min-h-dvh overflow-hidden p-4 sm:p-6">
      <Image
        src="/images/phran-hunter.png"
        alt="Phran Hunter"
        width={1024}
        height={1536}
        className="absolute left-1/2 top-2/8 transform -translate-x-1/2 -translate-y-1/2 w-[280px] h-auto object-cover z-10"
      />
      <div className="relative z-20 w-full max-w-4xl px-4 sm:px-0">
        <div className="rounded-2xl backdrop-blur-md shadow-xl mt-20 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Social login */}
          <div className="flex flex-col justify-center gap-4 bg-neutral-900/20 text-white p-6 md:p-8 w-full md:w-1/2">
            <h2 className="text-xl sm:text-2xl font-semibold">
              Login with Social
            </h2>
            <SocialSignInButton />
            <SocialSignInButton
              provider="github"
              label="Continue with GitHub"
              icon={<FaGithub className="w-5 h-5 mr-2" />}
            />

            <p className="mt-2 text-xs text-white/70">
              By logging in, you agree to our Terms of Service.
            </p>
          </div>

          {/* Right: Form */}
          <div className="flex flex-col justify-center gap-4 p-6 md:p-8 w-full md:w-1/2">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
