import Link from "next/link";
import { getSettings } from "@/lib/actions/settings";
import { VacationToggle } from "./VacationToggle";

export async function Header() {
  const settings = await getSettings();

  return (
    <header className="bg-mantle border-b border-surface0 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-blue tracking-wide flex items-center gap-2">
        <span>🦀</span>KaniLocal
      </Link>

      <nav className="flex items-center gap-6 text-sm text-subtext">
        <Link href="/lessons" className="hover:text-text transition-colors">Lessons</Link>
        <Link href="/reviews" className="hover:text-text transition-colors">Reviews</Link>
        <Link href="/levels" className="hover:text-text transition-colors">Levels</Link>
        <Link href="/study?type=leeches" className="hover:text-text transition-colors">Study</Link>
        <Link href="/leeches" className="hover:text-text transition-colors">Leeches</Link>
        <Link href="/settings" className="hover:text-text transition-colors">Settings</Link>
      </nav>

      <div className="flex items-center gap-3">
        {settings.vacation_mode && (
          <span className="text-xs px-2 py-1 rounded bg-yellow text-crust font-medium">
            Vacation
          </span>
        )}
        <VacationToggle active={settings.vacation_mode} />
      </div>
    </header>
  );
}
