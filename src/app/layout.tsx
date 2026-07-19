import { Geist_Mono, Inter } from "next/font/google";

import { cn } from "@/lib/utils";

import type { Metadata } from "next";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Freelancer Kit",
  description: "Alynx internal SaaS platform foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="dark flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
