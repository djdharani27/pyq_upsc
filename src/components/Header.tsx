"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { weakCount } from "@/lib/weak";

export function Header() {
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    const update = () => setBadge(weakCount());
    update();
    window.addEventListener("pyq-weak-updated", update);
    return () => window.removeEventListener("pyq-weak-updated", update);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
        <Link
          href="/"
          className="min-w-0 shrink rounded-md transition-opacity hover:opacity-80"
        >
          <span className="block text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
            The PYQ Project
          </span>
          <span className="block text-xs text-muted-fg sm:text-sm">
            UPSC PYQ Practice + Weak/Fix
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1">
          <Link
            href="/weak"
            className={`relative inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors sm:text-sm ${
              pathname === "/weak"
                ? "bg-primary text-primary-fg"
                : "border border-border bg-card text-foreground hover:bg-secondary"
            }`}
            aria-label="Weak / Fix questions"
          >
            <span aria-hidden>⚑</span>
            <span className="hidden sm:inline">Weak / Fix</span>
            {badge > 0 && (
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  pathname === "/weak"
                    ? "bg-white/20 text-white"
                    : "bg-destructive text-white"
                }`}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>

          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-fg transition-colors hover:bg-secondary hover:text-foreground"
          >
            {theme === "dark" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
              </svg>
            )}
          </button>

          {pathname !== "/" && (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Search
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
