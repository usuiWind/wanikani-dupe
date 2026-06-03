-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('radical', 'kanji', 'vocabulary');

-- CreateEnum
CREATE TYPE "ReadingType" AS ENUM ('onyomi', 'kunyomi', 'vocab');

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "type" "SubjectType" NOT NULL,
    "level" INTEGER NOT NULL,
    "characters" TEXT,
    "image_url" TEXT,
    "primary_reading" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectMeaning" (
    "id" SERIAL NOT NULL,
    "subject_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SubjectMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectReading" (
    "id" SERIAL NOT NULL,
    "subject_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "reading_type" "ReadingType" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SubjectReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectComponent" (
    "subject_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,

    CONSTRAINT "SubjectComponent_pkey" PRIMARY KEY ("subject_id","component_id")
);

-- CreateTable
CREATE TABLE "Mnemonic" (
    "subject_id" TEXT NOT NULL,
    "meaning_mnemonic" TEXT,
    "reading_mnemonic" TEXT,

    CONSTRAINT "Mnemonic_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "StudyProgress" (
    "subject_id" TEXT NOT NULL,
    "srs_stage" INTEGER,
    "unlocked_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "next_review_at" TIMESTAMP(3),
    "passed_at" TIMESTAMP(3),
    "burned_at" TIMESTAMP(3),
    "total_correct" INTEGER NOT NULL DEFAULT 0,
    "total_incorrect" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudyProgress_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "ReviewsLog" (
    "id" SERIAL NOT NULL,
    "subject_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "incorrect_meaning_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_reading_count" INTEGER NOT NULL DEFAULT 0,
    "resulting_stage" INTEGER,

    CONSTRAINT "ReviewsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "batch_size" INTEGER NOT NULL DEFAULT 5,
    "daily_new_cap" INTEGER,
    "flashcard_default" BOOLEAN NOT NULL DEFAULT false,
    "vacation_mode" BOOLEAN NOT NULL DEFAULT false,
    "vacation_started_at" TIMESTAMP(3),
    "theme" TEXT NOT NULL DEFAULT 'catppuccin-mocha',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subject_level_type_idx" ON "Subject"("level", "type");

-- CreateIndex
CREATE INDEX "StudyProgress_next_review_at_idx" ON "StudyProgress"("next_review_at");

-- AddForeignKey
ALTER TABLE "SubjectMeaning" ADD CONSTRAINT "SubjectMeaning_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectReading" ADD CONSTRAINT "SubjectReading_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectComponent" ADD CONSTRAINT "SubjectComponent_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectComponent" ADD CONSTRAINT "SubjectComponent_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mnemonic" ADD CONSTRAINT "Mnemonic_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgress" ADD CONSTRAINT "StudyProgress_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewsLog" ADD CONSTRAINT "ReviewsLog_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
