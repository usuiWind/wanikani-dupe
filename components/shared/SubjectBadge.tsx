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
  fallbackLabel,
  size = "md",
}: {
  type: SubjectType;
  characters: string | null;
  imageUrl?: string | null;
  fallbackLabel?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  // Vocab can be several characters wide, so it grows horizontally instead of
  // being crammed into a fixed square (which caused long words to wrap/overflow).
  const square = { sm: "w-10 h-10", md: "w-16 h-16", lg: "w-24 h-24", xl: "w-40 h-40" };
  const vocabBox = { sm: "h-10 px-2", md: "h-16 px-4", lg: "h-24 px-5", xl: "h-40 px-8" };
  const box = type === "vocabulary" ? `${vocabBox[size]} max-w-full` : square[size];

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
      className={`${typeColors[type]} ${box} ${textSize} flex items-center justify-center rounded-lg font-bold leading-none whitespace-nowrap`}
      style={{ fontFamily: "var(--font-noto-jp), sans-serif" }}
    >
      {characters ? (
        characters
      ) : imageUrl ? (
        // Image radicals (no Unicode character) ship as monochrome SVG/PNG;
        // invert to render white on the colored badge.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className={imgDims[size]} style={{ filter: "brightness(0) invert(1)" }} />
      ) : fallbackLabel ? (
        // No character and no image (e.g. un-backfilled image radicals): show the
        // name so the card is still identifiable instead of a bare "?".
        <span className="text-sm font-semibold leading-tight whitespace-normal text-center px-1">{fallbackLabel}</span>
      ) : (
        "?"
      )}
    </div>
  );
}
