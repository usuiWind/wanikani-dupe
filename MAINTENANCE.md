# Maintenance Notes

Operational gotchas for the KaniLocal data pipeline. Read before touching the import scripts.

## ⚠️ `scripts/import-csv.ts` destroys user progress

The first thing `import-csv.ts` does is:

```sql
TRUNCATE TABLE "Subject" CASCADE
```

Because `StudyProgress`, `ReviewsLog`, `SubjectMeaning`, `SubjectReading`, `Mnemonic`,
and `SubjectComponent` all have `onDelete: Cascade` FKs to `Subject`, this **wipes all
imported WaniKani progress** — SRS stages, level progressions, assignments
(everything loaded by `scripts/import-assignments.ts`).

**Never run `import-csv.ts` as a "re-import" to patch subject data** unless you also
intend to re-import assignments afterward.

### Safe way to fix subject data without losing progress

`SubjectReading`, `SubjectMeaning`, and `Mnemonic` have **no dependent tables** —
nothing FKs to them. So you can rebuild just the affected table from the CSV:

```sql
TRUNCATE TABLE "SubjectReading" RESTART IDENTITY
```

then re-insert from `wanikani-subjects.csv`. Progress in `StudyProgress` is untouched.

## Vocabulary readings bug (fixed 2026-06-09)

**Symptom:** vocab *reading* reviews were always marked wrong and showed
`Wrong — expected: ` with a blank answer.

**Cause:** `scripts/fetch-wanikani.ts` filtered vocabulary readings by
`type === "onyomi" | "kunyomi" | "reading"`, but WaniKani vocabulary reading objects
have **no `type` field** (`{ reading, primary, accepted_answer }`). Every vocab reading
was dropped, so the `readings` column was blank for all 6,751 vocab rows and the DB had
zero `SubjectReading` rows for them. With an empty candidate list, `TypedReviewCard`
marked every answer wrong and `readings.join(", ")` rendered blank.

**Fix:** `fetch-wanikani.ts` now takes all readings for `vocabulary`; for
`kana_vocabulary` (readings `undefined`) it uses the kana characters as the reading.
The CSV was re-fetched and only `SubjectReading` was rebuilt (progress preserved).

## Re-fetching the dataset

```
npx tsx scripts/fetch-wanikani.ts <wanikani-api-token>
```

Requires a WaniKani API token (and a paid subscription for full subject data). Writes
`wanikani-subjects.csv`.
