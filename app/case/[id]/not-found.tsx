import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel-elevated p-12 text-center">
      <h2 className="text-2xl font-bold text-ink">Case not found</h2>
      <p className="mt-2 text-ink-dim">
        The case id you requested isn't in the metadata bundle.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md border border-accent-orange/40 bg-accent-orange/10 px-4 py-2 text-sm text-accent-orange hover:bg-accent-orange/20"
      >
        Back to all cases
      </Link>
    </div>
  );
}
