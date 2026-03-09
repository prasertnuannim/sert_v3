import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans, Noto_Sans_Thai } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sert v3",
  description: "Next.js 16 + NextAuth + GoLong API server",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${plusJakarta.variable} ${notoThai.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans transition-colors duration-500"
        style={{
          fontFamily:
            "var(--font-plus-jakarta), var(--font-noto-thai), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
