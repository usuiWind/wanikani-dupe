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
  const sizeClasses = {
    sm: "w-10 h-10 text-lg",
    md: "w-16 h-16 text-3xl",
    lg: "w-24 h-24 text-5xl",
    xl: "w-40 h-40 text-8xl",
  };

  return (
    <div
      className={`${typeColors[type]} ${sizeClasses[size]} flex items-center justify-center rounded-lg font-bold`}
      style={{ fontFamily: "var(--font-noto-jp), sans-serif" }}
    >
      {characters ?? "?"}
    </div>
  );
}
