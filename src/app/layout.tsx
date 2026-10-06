import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "The PYQ Project — UPSC PYQ Practice",
  description:
    "Search and practice UPSC Prelims previous year questions with interactive quiz logic and a Weak/Fix revision mode.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
