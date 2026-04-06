import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://insurecast.symfa.ai"),
  title: "InsureCast",
  description: "Monthly claims and paid-amount forecasting dashboard",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex flex-col h-screen">
          <header className="h-14 shrink-0 border-b border-zinc-200 bg-white px-6 flex items-center justify-between z-10">
            <span className="text-base font-semibold text-zinc-900">InsureCast</span>
            <span className="text-xs text-zinc-400">Insurance claims forecasting</span>
          </header>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
