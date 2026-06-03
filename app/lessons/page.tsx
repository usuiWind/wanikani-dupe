import { Header } from "@/components/layout/Header";
import { getAvailableLessons } from "@/lib/actions/lessons";
import { LessonFlow } from "@/components/lessons/LessonFlow";
import Link from "next/link";

export default async function LessonsPage() {
  const lessons = await getAvailableLessons();

  if (lessons.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="text-6xl">📚</div>
          <h1 className="text-2xl font-semibold text-text">No lessons available</h1>
          <p className="text-subtext text-sm max-w-md">
            Complete reviews and level up to unlock new items, or import subjects from the settings page.
          </p>
          <div className="flex gap-3">
            <Link href="/" className="text-blue hover:underline text-sm">Dashboard</Link>
            <Link href="/import" className="text-blue hover:underline text-sm">Import data</Link>
          </div>
        </main>
      </div>
    );
  }

  const lessonSubjects = lessons.map((s) => ({
    id: s.id,
    type: s.type as "radical" | "kanji" | "vocabulary",
    level: s.level,
    characters: s.characters,
    imageUrl: s.image_url,
    meanings: s.meanings.map((m) => m.text),
    readings: s.readings.map((r) => r.text),
    primaryReading: s.primary_reading,
    meaningMnemonic: s.mnemonic?.meaning_mnemonic ?? null,
    readingMnemonic: s.mnemonic?.reading_mnemonic ?? null,
    components: s.components.map((c) => ({
      id: c.component.id,
      meaning: c.component.meanings[0]?.text ?? c.component.id,
    })),
  }));

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <LessonFlow subjects={lessonSubjects} />
    </div>
  );
}
