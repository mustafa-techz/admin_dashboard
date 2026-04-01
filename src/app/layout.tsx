import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/shared/QueryProvider";
import AppLayout from "@/components/layout/AppLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SchoolDash - Management Dashboard",
  description: "Modern, production-ready school management system.",
};

import { AuthProvider } from "@/context/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <QueryProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
