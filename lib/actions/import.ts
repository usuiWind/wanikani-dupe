"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface ImportRow {
  id: string;
  type: "radical" | "kanji" | "vocabulary";
  level: number;
  characters?: string;
  image_url?: string;
  jlpt_level?: number;
  grade?: number;
  stroke_count?: number;
  frequency_rank?: number;
  meanings: string[];
  readings_onyomi?: string[];
  readings_kunyomi?: string[];
  readings?: string[];
  primary_reading?: string;
  components?: string[];
  meaning_mnemonic?: string;
  reading_mnemonic?: string;
}

export interface ImportError {
  row: number;
  id?: string;
  message: string;
}

export interface ImportResult {
  imported: number;
  updated: number;
  errors: ImportError[];
}

export async function validateAndImport(rows: ImportRow[]): Promise<ImportResult> {
  const errors: ImportError[] = [];
  const validRows: ImportRow[] = [];
  const allIds = new Set(rows.map((r) => r.id));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row.id) { errors.push({ row: rowNum, message: "Missing id" }); continue; }
    if (!["radical", "kanji", "vocabulary"].includes(row.type)) {
      errors.push({ row: rowNum, id: row.id, message: "Invalid type" }); continue;
    }
    if (!row.level || row.level < 1 || row.level > 60) {
      errors.push({ row: rowNum, id: row.id, message: "Level must be 1–60" }); continue;
    }
    if (!row.meanings?.length) {
      errors.push({ row: rowNum, id: row.id, message: "Missing meanings" }); continue;
    }

    for (const compId of row.components ?? []) {
      if (!allIds.has(compId)) {
        const existing = await prisma.subject.findUnique({ where: { id: compId } });
        if (!existing) {
          errors.push({ row: rowNum, id: row.id, message: `Component ${compId} not found` });
        }
      }
    }

    validRows.push(row);
  }

  let imported = 0;
  let updated = 0;

  for (const row of validRows) {
    try {
      const existing = await prisma.subject.findUnique({ where: { id: row.id } });

      await prisma.subject.upsert({
        where: { id: row.id },
        update: {
          type: row.type,
          level: row.level,
          characters: row.characters ?? null,
          image_url: row.image_url ?? null,
          primary_reading: row.primary_reading ?? null,
          jlpt_level: row.jlpt_level ?? null,
          grade: row.grade ?? null,
          stroke_count: row.stroke_count ?? null,
          frequency_rank: row.frequency_rank ?? null,
        },
        create: {
          id: row.id,
          type: row.type,
          level: row.level,
          characters: row.characters ?? null,
          image_url: row.image_url ?? null,
          primary_reading: row.primary_reading ?? null,
          jlpt_level: row.jlpt_level ?? null,
          grade: row.grade ?? null,
          stroke_count: row.stroke_count ?? null,
          frequency_rank: row.frequency_rank ?? null,
        },
      });

      await prisma.subjectMeaning.deleteMany({ where: { subject_id: row.id } });
      await prisma.subjectMeaning.createMany({
        data: row.meanings.map((text, idx) => ({
          subject_id: row.id,
          text,
          is_primary: idx === 0,
        })),
      });

      await prisma.subjectReading.deleteMany({ where: { subject_id: row.id } });
      const readingRows: {
        subject_id: string;
        text: string;
        reading_type: "onyomi" | "kunyomi" | "vocab";
        is_primary: boolean;
      }[] = [];

      if (row.type === "vocabulary") {
        for (const r of row.readings ?? []) {
          readingRows.push({ subject_id: row.id, text: r, reading_type: "vocab", is_primary: r === row.primary_reading });
        }
      } else {
        for (const r of row.readings_onyomi ?? []) {
          readingRows.push({ subject_id: row.id, text: r, reading_type: "onyomi", is_primary: r === row.primary_reading });
        }
        for (const r of row.readings_kunyomi ?? []) {
          readingRows.push({ subject_id: row.id, text: r, reading_type: "kunyomi", is_primary: r === row.primary_reading });
        }
      }
      if (readingRows.length) await prisma.subjectReading.createMany({ data: readingRows });

      await prisma.mnemonic.upsert({
        where: { subject_id: row.id },
        update: { meaning_mnemonic: row.meaning_mnemonic ?? null, reading_mnemonic: row.reading_mnemonic ?? null },
        create: { subject_id: row.id, meaning_mnemonic: row.meaning_mnemonic ?? null, reading_mnemonic: row.reading_mnemonic ?? null },
      });

      await prisma.subjectComponent.deleteMany({ where: { subject_id: row.id } });
      if (row.components?.length) {
        await prisma.subjectComponent.createMany({
          data: row.components.map((cid) => ({ subject_id: row.id, component_id: cid })),
        });
      }

      if (existing) updated++; else imported++;
    } catch (e) {
      errors.push({ row: 0, id: row.id, message: String(e) });
    }
  }

  revalidatePath("/");
  return { imported, updated, errors };
}

export async function getImportTemplate(): Promise<string> {
  const header = [
    "id", "type", "level", "characters", "meanings",
    "readings_onyomi", "readings_kunyomi", "readings", "primary_reading",
    "jlpt_level", "grade", "stroke_count", "frequency_rank",
    "components", "meaning_mnemonic", "reading_mnemonic",
  ].join(",");

  const example = [
    "kanji-一", "kanji", "1", "一", "one|one thing",
    "いち|イチ", "ひと", "", "いち",
    "5", "1", "1", "2",
    "radical-ground", "The kanji for one is just a single stroke.", "It sounds like 'itchy'.",
  ].join(",");

  return `${header}\n${example}\n`;
}
