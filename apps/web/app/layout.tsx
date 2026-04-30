import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Sidebar } from "../components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gauntleet",
  description: "AI-generated algorithmic practice problems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex h-screen overflow-hidden bg-white font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
