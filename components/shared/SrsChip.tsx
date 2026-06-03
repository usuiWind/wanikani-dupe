import { getSrsGroup, getSrsLabel } from "@/lib/srs";

const groupColors: Record<string, string> = {
  apprentice: "bg-red text-white",
  guru: "bg-mauve text-white",
  master: "bg-blue text-white",
  enlightened: "bg-sky text-white",
  burned: "bg-overlay text-text",
};

export function SrsChip({ stage }: { stage: number | null }) {
  if (stage === null) return <span className="px-2 py-0.5 rounded text-xs bg-surface0 text-subtext">Locked</span>;
  const group = getSrsGroup(stage);
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${groupColors[group]}`}>
      {getSrsLabel(stage)}
    </span>
  );
}
