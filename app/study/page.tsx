import { Header } from "@/components/layout/Header";
import { getStudySubjects, getStudyCounts } from "@/lib/actions/leeches";
import { SelfStudySession } from "@/components/study/SelfStudySession";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ type?: string; level?: string; stage?: string }>;
}

export default async function StudyPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!params.type) {
    return <StudyHub />;
  }

  const type = params.type as "level" | "stage" | "leeches" | "burned" | "recent";
  const level = params.level ? parseInt(params.level) : undefined;
  const stage = params.stage ? parseInt(params.stage) : undefined;

  const subjects = await getStudySubjects({ type, level, stage });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {subjects.length === 0 ? (
        <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="text-4xl">📭</div>
          <h1 className="text-xl font-semibold text-text">No items to study</h1>
          <p className="text-subtext text-sm">{studyLabel(type, level, stage)} has nothing right now.</p>
          <Link href="/study" className="px-3 py-1.5 bg-surface0 text-subtext rounded-lg hover:text-text transition-colors text-sm">
            ← Back to Self Study
          </Link>
        </main>
      ) : (
        <SelfStudySession subjects={subjects} filterLabel={studyLabel(type, level, stage)} />
      )}
    </div>
  );
}

const HUB_CARDS = [
  { type: "leeches", emoji: "🩸", label: "Leeches", desc: "Items you repeatedly get wrong." },
  { type: "burned", emoji: "🔥", label: "Burned", desc: "Drill items you've already burned." },
  { type: "recent", emoji: "❌", label: "Recent mistakes", desc: "Answered wrong in the last 7 days." },
] as const;

async function StudyHub() {
  const counts = await getStudyCounts();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">Self Study</h1>
          <p className="text-sm text-subtext mt-1">Drill items without affecting your SRS.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {HUB_CARDS.map(({ type, emoji, label, desc }) => {
            const count = counts[type];
            const empty = count === 0;
            return (
              <Link
                key={type}
                href={`/study?type=${type}`}
                className={`flex flex-col gap-2 bg-mantle border border-surface0 rounded-xl p-5 transition-colors ${empty ? "opacity-60 pointer-events-none" : "hover:border-blue"}`}
              >
                <div className="text-3xl">{emoji}</div>
                <div className="text-lg font-semibold text-text">{label}</div>
                <div className="text-xs text-subtext flex-1">{desc}</div>
                <div className="text-sm text-subtext">{count} items</div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function studyLabel(type: string, level?: number, stage?: number) {
  if (type === "level" && level) return `Level ${level}`;
  if (type === "stage" && stage !== undefined) return `SRS Stage ${stage}`;
  if (type === "leeches") return "Leeches";
  if (type === "burned") return "Burned items";
  if (type === "recent") return "Recent mistakes";
  return "Self Study";
}
