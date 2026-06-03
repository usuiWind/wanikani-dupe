import { Header } from "@/components/layout/Header";
import { getLeeches } from "@/lib/actions/leeches";
import { SrsChip } from "@/components/shared/SrsChip";
import Link from "next/link";

export default async function LeechesPage() {
  const leeches = await getLeeches();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Leeches</h1>
          <span className="text-sm text-subtext">{leeches.length} items</span>
        </div>

        <p className="text-sm text-subtext">
          Items you repeatedly get wrong. Drill them via{" "}
          <Link href="/study?type=leeches" className="text-blue hover:underline">Self Study</Link>.
        </p>

        {leeches.length === 0 ? (
          <div className="text-center py-16 text-subtext">
            No leeches yet. Keep reviewing!
          </div>
        ) : (
          <div className="space-y-2">
            {leeches.map((p) => {
              const s = p.subject;
              const meaning = s.meanings[0]?.text ?? "—";
              const reading = s.readings[0]?.text ?? "—";
              return (
                <Link
                  key={p.subject_id}
                  href={`/items/${p.subject_id}`}
                  className="flex items-center gap-4 bg-mantle border border-surface0 rounded-xl px-4 py-3 hover:border-blue transition-colors"
                >
                  <span
                    className="text-2xl w-10 text-center text-text"
                    style={{ fontFamily: "var(--font-noto-jp), sans-serif" }}
                  >
                    {s.characters ?? "?"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text font-medium">{meaning}</div>
                    <div className="text-xs text-subtext">{reading}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-subtext shrink-0">
                    <span className="text-red">{p.total_incorrect} wrong</span>
                    <SrsChip stage={p.srs_stage} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
