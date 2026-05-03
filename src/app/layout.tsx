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
  title: "RacerCalendar — watchable laps in Google Calendar",
  description:
    "Filtered racing calendars with curated free-vs-paid streams, ICS subscribe or Google OAuth push.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="font-sans flex min-h-full flex-col bg-gradient-to-br from-orange-50/95 via-white to-indigo-100/60 text-stone-800 accent-orange-600 selection:bg-orange-200/55 selection:text-stone-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-neutral-950 dark:text-zinc-100 dark:accent-orange-500 dark:selection:bg-orange-500/30 dark:selection:text-white">
        <a
          href="#main"
          className="fixed left-4 top-4 z-[200] rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white pointer-events-none -translate-y-full opacity-0 transition duration-150 ease-out motion-reduce:transition-none motion-reduce:duration-75 focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-950/25 dark:bg-orange-500 dark:text-orange-950"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
