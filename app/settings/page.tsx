import { Header } from "@/components/layout/Header";
import { getSettings } from "@/lib/actions/settings";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { initializeLevel1 } from "@/lib/actions/lessons";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
        <h1 className="text-2xl font-semibold text-text">Settings</h1>

        <SettingsForm settings={settings} />

        <section className="bg-mantle border border-surface0 rounded-xl p-6">
          <h2 className="font-semibold text-text mb-4">Data</h2>
          <div className="space-y-3">
            <a href="/import" className="block w-full text-center py-2 border border-blue text-blue rounded-lg hover:bg-blue hover:text-crust transition-colors text-sm">
              Import subjects (CSV / JSON)
            </a>
            <form action={initializeLevel1}>
              <button
                type="submit"
                className="w-full py-2 border border-surface1 text-subtext rounded-lg hover:border-text hover:text-text transition-colors text-sm"
              >
                Initialize Level 1 radicals (unlock for lessons)
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
