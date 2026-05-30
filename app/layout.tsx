import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const siteTitle = "CS2 Case ROI — Live Unboxing ROI for All 425 Containers";
const siteDescription =
  "The honest expected return of every CS2 weapon case, sticker capsule, and souvenir package. Aggregated live prices from Steam, CSFloat, and Skinport.";

export const metadata: Metadata = {
  metadataBase: new URL("https://cs2-case-roi.vercel.app"),
  title: {
    template: "%s · CS2 Case ROI",
    default: siteTitle,
  },
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    url: "https://cs2-case-roi.vercel.app",
    siteName: "CS2 Case ROI",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
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
              <NavLink href="/invest">Invest</NavLink>
              <NavLink href="/compare">Compare</NavLink>
              <NavLink href="/about">Method</NavLink>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

        <footer className="border-t border-bg-border bg-bg-base/40 py-6 text-center text-xs text-ink-faint">
          <div className="mx-auto max-w-3xl space-y-2 px-6">
            <div>
              Live prices from Steam Market · CSFloat · Skinport · cached 30 min · this is not financial advice
            </div>
            <div>
              Feedback or bug? <a href="https://github.com/DMDaudio/cs2-case-roi/discussions" className="text-accent-cyan hover:underline">Open a discussion on GitHub</a>.
            </div>
            <div className="text-ink-faint/70">
              Some market links are affiliate links — we earn a small commission when you buy through them. Prices to you are unaffected.
            </div>
          </div>
        </footer>
        <Analytics />
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
