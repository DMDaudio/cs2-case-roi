import { notFound } from "next/navigation";
import Link from "next/link";
import { getCaseDetail } from "@/lib/ev/service";
import { getHistory } from "@/lib/history/store";
import { CaseDetailView } from "@/components/CaseDetailView";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { case: ev, sourceStatus } = await getCaseDetail(decodeURIComponent(id));
  if (!ev) notFound();
  const history = await getHistory(ev.caseName);

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-accent-orange"
      >
        <ArrowLeft className="h-3 w-3" /> All cases
      </Link>
      <CaseDetailView ev={ev} sourceStatus={sourceStatus} history={history} />
    </div>
  );
}
