type SubjectType = "radical" | "kanji" | "vocabulary";

const typeColors: Record<SubjectType, string> = {
  radical: "bg-blue text-white",
  kanji: "bg-mauve text-white",
  vocabulary: "bg-pink text-white",
};

export function SubjectBadge({
  type,
  characters,
  size = "md",
}: {
  type: SubjectType;
  characters: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const dims = { sm: "w-10 h-10", md: "w-16 h-16", lg: "w-24 h-24", xl: "w-40 h-40" };
  const len = (characters ?? "").length;
  const textSize =
    size === "xl"
      ? len <= 1 ? "text-8xl" : len === 2 ? "text-6xl" : len === 3 ? "text-5xl" : "text-4xl"
      : size === "lg"
      ? len <= 1 ? "text-5xl" : len <= 3 ? "text-3xl" : "text-2xl"
      : size === "md" ? "text-3xl" : "text-lg";

  return (
    <div
      className={`${typeColors[type]} ${dims[size]} ${textSize} flex items-center justify-center rounded-lg font-bold leading-none`}
      style={{ fontFamily: "var(--font-noto-jp), sans-serif" }}
    >
      {characters ?? "?"}
    </div>
  );
}
