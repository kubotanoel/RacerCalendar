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
        {children}
      </body>
    </html>
  );
}
