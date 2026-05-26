import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CS2 Case ROI — live expected return per case",
  description:
    "Live statistical expected return for every CS2 weapon case, computed from real-time Steam Market, CSFloat, and Skinport prices.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-30 border-b border-bg-border bg-bg-base/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative h-7 w-7 rounded-md bg-accent-orange/15 ring-1 ring-accent-orange/40 group-hover:shadow-glow">
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold tracking-tighter text-accent-orange">
                  CS2
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-wide text-ink">
                  CASE <span className="text-accent-orange">ROI</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-ink-faint">
                  expected return calculator
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/">Cases</NavLink>
              <NavLink href="/compare">Compare</NavLink>
              <NavLink href="/about">Method</NavLink>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

        <footer className="border-t border-bg-border bg-bg-base/40 py-6 text-center text-xs text-ink-faint">
          Live prices from Steam Market · CSFloat · Skinport · cached 30 min ·
          this is not financial advice
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-ink-dim hover:bg-bg-raised hover:text-ink"
    >
      {children}
    </Link>
  );
}
