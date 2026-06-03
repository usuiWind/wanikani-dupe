import { Header } from "@/components/layout/Header";
import { ImportForm } from "@/components/import/ImportForm";

export default function ImportPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">Import Subjects</h1>
          <p className="text-subtext text-sm mt-1">
            Upload a JSON file (array of subject objects) or paste JSON directly.
          </p>
        </div>

        <div className="bg-mantle border border-surface0 rounded-xl p-5">
          <div className="text-xs text-subtext mb-2">Expected JSON shape (array):</div>
          <pre className="text-xs text-text bg-surface0 rounded p-3 overflow-x-auto">{`[
  {
    "id": "kanji-water",
    "type": "kanji",
    "level": 1,
    "characters": "水",
    "meanings": ["water"],
    "readings_onyomi": ["スイ"],
    "readings_kunyomi": ["みず"],
    "primary_reading": "スイ",
    "components": ["radical-water"],
    "meaning_mnemonic": "...",
    "reading_mnemonic": "..."
  }
]`}</pre>
        </div>

        <ImportForm />
      </main>
    </div>
  );
}
