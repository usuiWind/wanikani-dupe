import { getDueReviews } from "@/lib/actions/reviews";
import { getSettings } from "@/lib/actions/settings";
import { Header } from "@/components/layout/Header";
import { ReviewSession } from "@/components/review/ReviewSession";
import Link from "next/link";

export default async function ReviewsPage() {
  const [subjects, settings] = await Promise.all([getDueReviews(), getSettings()]);

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-semibold text-text">No reviews due</h1>
          <p className="text-subtext">Check back later or do some lessons.</p>
          <Link href="/" className="text-blue hover:underline text-sm">Back to dashboard</Link>
        </main>
      </div>
    );
  }

  const reviewSubjects = subjects.map((s) => ({
    id: s.id,
    type: s.type as "radical" | "kanji" | "vocabulary",
    level: s.level,
    characters: s.characters,
    meanings: s.meanings.map((m) => m.text),
    readings: s.readings.map((r) => r.text),
    primaryReading: s.primary_reading,
    meaningMnemonic: s.mnemonic?.meaning_mnemonic ?? null,
    readingMnemonic: s.mnemonic?.reading_mnemonic ?? null,
    srsStage: s.progress?.srs_stage ?? 1,
    components: s.components?.map((c) => ({
      id: c.component.id,
      characters: c.component.characters,
      meanings: c.component.meanings.map((m) => m.text),
    })) ?? [],
  }));

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <ReviewSession subjects={reviewSubjects} acceptAllReadings={settings.accept_all_readings} />
    </div>
  );
}
