import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { SrsChip } from "@/components/shared/SrsChip";
import { SubjectBadge } from "@/components/shared/SubjectBadge";
import { unburnItem } from "@/lib/actions/reviews";

export default async function ItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      meanings: true,
      readings: true,
      mnemonic: true,
      progress: true,
      components: {
        include: {
          component: {
            include: { meanings: { where: { is_primary: true } } },
          },
        },
      },
      usedIn: {
        include: {
          subject: {
            include: { meanings: { where: { is_primary: true } } },
          },
        },
      },
    },
  });

  if (!subject) notFound();

  const isBurned = subject.progress?.srs_stage === 9;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-6">
          <SubjectBadge type={subject.type as "radical" | "kanji" | "vocabulary"} characters={subject.characters} size="lg" />
          <div>
            <div className="text-sm text-subtext capitalize">{subject.type} · Level {subject.level}</div>
            <div className="mt-1">
              <SrsChip stage={subject.progress?.srs_stage ?? null} />
            </div>
          </div>
        </div>

        {/* Meanings */}
        <section className="bg-mantle border border-surface0 rounded-xl p-5">
          <div className="text-xs text-subtext mb-2">Meanings</div>
          <div className="flex flex-wrap gap-2">
            {subject.meanings.map((m) => (
              <span
                key={m.id}
                className={`px-3 py-1 rounded-lg text-sm ${m.is_primary ? "bg-blue text-crust font-medium" : "bg-surface0 text-text"}`}
              >
                {m.text}
              </span>
            ))}
          </div>
        </section>

        {/* Readings */}
        {subject.readings.length > 0 && (
          <section className="bg-mantle border border-surface0 rounded-xl p-5">
            <div className="text-xs text-subtext mb-2">Readings</div>
            <div className="flex flex-wrap gap-2">
              {subject.readings.map((r) => (
                <span
                  key={r.id}
                  className={`px-3 py-1 rounded-lg text-sm ${r.is_primary ? "bg-pink text-crust font-medium" : "bg-surface0 text-text"}`}
                  style={{ fontFamily: "var(--font-noto-jp), sans-serif" }}
                >
                  {r.text}
                  <span className="ml-1 text-xs opacity-60 font-mono">
                    {r.reading_type === "onyomi" ? "on" : r.reading_type === "kunyomi" ? "kun" : ""}
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Mnemonics */}
        {(subject.mnemonic?.meaning_mnemonic || subject.mnemonic?.reading_mnemonic) && (
          <section className="bg-mantle border border-surface0 rounded-xl p-5 space-y-3">
            <div className="text-xs text-subtext">Mnemonics</div>
            {subject.mnemonic.meaning_mnemonic && (
              <div>
                <div className="text-xs text-subtext mb-1">Meaning</div>
                <div className="text-sm text-text leading-relaxed">{subject.mnemonic.meaning_mnemonic}</div>
              </div>
            )}
            {subject.mnemonic.reading_mnemonic && (
              <div>
                <div className="text-xs text-subtext mb-1">Reading</div>
                <div className="text-sm text-text leading-relaxed">{subject.mnemonic.reading_mnemonic}</div>
              </div>
            )}
          </section>
        )}

        {/* Components */}
        {subject.components.length > 0 && (
          <section className="bg-mantle border border-surface0 rounded-xl p-5">
            <div className="text-xs text-subtext mb-2">Components</div>
            <div className="flex flex-wrap gap-2">
              {subject.components.map((c) => (
                <a
                  key={c.component_id}
                  href={`/items/${c.component_id}`}
                  className="px-3 py-1 rounded-lg text-sm bg-surface0 text-text hover:bg-surface1 transition-colors"
                >
                  {c.component.meanings[0]?.text ?? c.component_id}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Progress stats */}
        {subject.progress && (
          <section className="bg-mantle border border-surface0 rounded-xl p-5">
            <div className="text-xs text-subtext mb-3">Study progress</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-subtext text-xs">Total correct</div>
                <div className="text-green font-medium">{subject.progress.total_correct}</div>
              </div>
              <div>
                <div className="text-subtext text-xs">Total incorrect</div>
                <div className="text-red font-medium">{subject.progress.total_incorrect}</div>
              </div>
              {subject.progress.next_review_at && (
                <div className="col-span-2">
                  <div className="text-subtext text-xs">Next review</div>
                  <div className="text-text">{subject.progress.next_review_at.toLocaleString()}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Unburn */}
        {isBurned && (
          <form action={unburnItem.bind(null, id)}>
            <button
              type="submit"
              className="w-full py-3 border border-red text-red rounded-lg hover:bg-red hover:text-crust transition-colors text-sm font-medium"
            >
              Unburn this item (reset to Apprentice 1)
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
