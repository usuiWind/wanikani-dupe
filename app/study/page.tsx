import { Header } from "@/components/layout/Header";
import { getStudySubjects } from "@/lib/actions/leeches";
import { SelfStudySession } from "@/components/study/SelfStudySession";

interface Props {
  searchParams: Promise<{ type?: string; level?: string; stage?: string }>;
}

export default async function StudyPage({ searchParams }: Props) {
  const params = await searchParams;
  const type = (params.type ?? "leeches") as "level" | "stage" | "leeches" | "burned" | "recent";
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
          <p className="text-subtext text-sm">Try a different filter.</p>
          <StudyFilterLinks />
        </main>
      ) : (
        <SelfStudySession subjects={subjects} filterLabel={studyLabel(type, level, stage)} />
      )}
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

function StudyFilterLinks() {
  return (
    <div className="flex flex-wrap gap-2 justify-center text-sm">
      {[
        { href: "/study?type=leeches", label: "Leeches" },
        { href: "/study?type=burned", label: "Burned" },
        { href: "/study?type=recent", label: "Recent mistakes" },
      ].map(({ href, label }) => (
        <a key={href} href={href} className="px-3 py-1.5 bg-surface0 text-subtext rounded-lg hover:text-text transition-colors">
          {label}
        </a>
      ))}
    </div>
  );
}
