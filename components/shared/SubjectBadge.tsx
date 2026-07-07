type SubjectType = "radical" | "kanji" | "vocabulary";

const typeColors: Record<SubjectType, string> = {
  radical: "bg-blue text-white",
  kanji: "bg-mauve text-white",
  vocabulary: "bg-pink text-white",
};

export function SubjectBadge({
  type,
  characters,
  imageUrl,
  size = "md",
}: {
  type: SubjectType;
  characters: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const dims = { sm: "w-10 h-10", md: "w-16 h-16", lg: "w-24 h-24", xl: "w-40 h-40" };
  const imgDims = { sm: "w-6 h-6", md: "w-10 h-10", lg: "w-14 h-14", xl: "w-24 h-24" };
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
      {characters ? (
        characters
      ) : imageUrl ? (
        // Image radicals (no Unicode character) ship as monochrome SVG/PNG;
        // invert to render white on the colored badge.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className={imgDims[size]} style={{ filter: "brightness(0) invert(1)" }} />
      ) : (
        "?"
      )}
    </div>
  );
}
