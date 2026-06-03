Product Requirements Document: Local Kanji SRS App ("KaniLocal")
A self hosted recreation of WaniKani for learning Japanese kanji through spaced repetition, with on'yomi and kun'yomi readings, mnemonics, a 60 level progression, and a personal data set you control. Built to run locally, backed by your own database, with several added features beyond the original.
This document is the build spec. Treat each section as a requirement. Where a default is stated it is the chosen behavior unless a setting says otherwise.

1. Goal
Recreate the core WaniKani learning loop locally so you own the data and can extend it. The app teaches three item types (radicals, kanji, vocabulary) gated behind a level system, schedules reviews with an SRS engine, and renders in a polished dark theme. It adds: flashcard mode, navigating back to previous cards, backspace undo, vacation mode, and editable new term batch size.
2. Tech Stack (default)

Framework: Next.js (App Router) with React and TypeScript.
Styling: Tailwind CSS. Theme tokens from Catppuccin Mocha (see Section 9).
Database: Supabase (Postgres) as the primary target. The schema is plain SQL and stays portable to local SQLite (via better sqlite3 or Prisma) for a fully offline build. Pick one at setup; default to Supabase.
ORM / data access: Prisma or the Supabase JS client. Prefer Prisma so the same schema runs on Postgres or SQLite.
State: React state plus a small store (Zustand) for the active session.
Japanese input: native IME works in text fields. Auto convert romaji to kana in reading answer fields (use a library such as wanakana).
Auth: single local user by default. Supabase Auth optional if you want multi device sync later.

Constraint: no use of browser localStorage or sessionStorage for persistent app data. All durable state lives in the database. Session only UI state lives in React memory.
3. Core Concepts
3.1 Item types (subjects)

Radicals: building blocks. Have a name (meaning) and a character or image. Answered by meaning only.
Kanji: have one or more meanings, one or more on'yomi readings, one or more kun'yomi readings, and a primary reading that is accepted. Answered by meaning and reading.
Vocabulary: words built from kanji. Have meanings and readings. Answered by meaning and reading.

Each subject belongs to a level (1 to 60) and has component links (a kanji lists its radicals; a vocab lists its kanji).
3.2 Levels
60 levels. A subject unlocks only when its components reach Guru (SRS stage 5). To advance to the next level the learner must reach Guru on the radicals and on at least 90 percent of the kanji in the current level. Vocabulary does not gate level up.
3.3 Lessons vs Reviews

Lesson: first exposure to a new item. Shows the meaning, readings, and mnemonic. After the lesson the item enters the review queue at Apprentice 1.
Review: a scheduled test of an item already learned. Correct answers raise the SRS stage; wrong answers lower it.

4. SRS Engine (must match these intervals)
Nine stages across five groups. After a correct answer the next review is scheduled at the listed interval. Review times round down to the start of the hour.
StageGroupInterval to next1Apprentice 14 hours2Apprentice 28 hours3Apprentice 31 day4Apprentice 42 days5Guru 11 week6Guru 22 weeks7Master1 month8Enlightened4 months9Burnednone (leaves the queue)
Accelerated timing for levels 1 and 2 only, Apprentice stages: 2 hours, 4 hours, 8 hours, 1 day.
Correct answer: stage plus 1 (capped at 9, where the item is Burned and removed from reviews).
Incorrect answer: stage decreases. Use this formula.
incorrect_adjustment = round(number_of_incorrect_answers_this_review / 2)
penalty = 1 if current_stage < 5 (Apprentice) else 2
new_stage = max(1, current_stage - incorrect_adjustment * penalty)
A review item that needs both meaning and reading is only graded correct when both parts are answered correctly in that session. Stage 9 (Burned) items can be manually unburned back to Apprentice 1 from the item page.
5. Features
5.1 Review session (primary loop)

Pulls all items whose next review time is at or before now.
Presents one card at a time. Kanji and vocab ask meaning and reading in separate prompts; the card is resolved only when both are answered.
Answer field auto converts romaji to kana for reading prompts and stays plain text for meaning prompts.
Correct fields flash green, incorrect flash red, then the item is requeued within the session until answered correctly. The SRS update is applied once per item per session based on whether it was ever missed.
Running counts: remaining, correct percentage, items completed.

5.2 Lessons

Configurable batch of new items (see batch size, 5.7). Walks through teaching screens (character, meanings, readings, mnemonic, component links) then a short quiz to seed them into Apprentice 1.

5.3 Flashcard mode (added feature)

A toggle on any session that switches from typed answers to self graded flashcards.
Front shows the prompt; tap or press Space to flip; then choose "I knew it" or "I did not".
"I knew it" counts as correct, "I did not" as incorrect, feeding the same SRS engine.
Useful for fast self review without typing. Keyboard: Space flips, 1 for knew it, 2 for missed.

5.4 Previous cards navigation (added feature)

In a session the learner can go back to the previous card to re read it.
Going back is read only by default: it shows the prior prompt and the answer given but does not let you change a submitted grade, so the SRS stays honest.
Keyboard: Left arrow goes back, Right arrow returns to the current card. The current unanswered card is never skipped past.

5.5 Backspace undo (added feature)

In an answer field, Backspace deletes the last character as normal.
When the field is empty and the last action was an auto kana conversion, Backspace reverts that conversion one step.
Immediately after submitting a card, an Undo control (and Backspace as a shortcut when the input is empty) reverts the just submitted answer so a typo or fat finger does not wrongly lower the stage. Undo is available only for the most recent submission and only before the next card is answered.

5.6 Vacation mode (added feature)

A global toggle that freezes the SRS clock. While on, no new reviews come due and existing due dates do not advance.
On enabling, store the timestamp. On disabling, shift every pending item's next review time forward by the elapsed vacation duration so the learner does not return to a wall of overdue reviews.
Surface vacation state clearly in the header.

5.7 New term batch size (added feature)

A setting controlling how many new items a lesson session introduces at once. Default 5. Range 3 to 15.
Also expose a daily new lessons cap to limit how many fresh items can enter Apprentice per day. Default off.

5.8 60 levels

Mirror WaniKani's level count and gating rules (Section 3.2). Show current level, progress to next level, and per level item lists with their current SRS stage.

5.9 Local database and data ownership

All subjects, mnemonics, component links, and per item study state live in your database. Nothing is fetched from WaniKani at runtime.

5.10 Populate with your own data (importer)

A seed script and an in app import screen that read CSV or JSON in the schema below and upsert subjects.
Validation: report rows missing required fields, bad level numbers, or component references that point to a subject not in the set.
Re importing the same id updates the subject without resetting the learner's SRS state for it.

Import row shape (JSON):
json{
  "id": "kanji-water",
  "type": "kanji",
  "level": 1,
  "characters": "水",
  "meanings": ["water"],
  "readings_onyomi": ["スイ"],
  "readings_kunyomi": ["みず"],
  "primary_reading": "スイ",
  "components": ["radical-water"],
  "meaning_mnemonic": "...",
  "reading_mnemonic": "..."
}
Radicals omit readings. Vocabulary uses a single readings list rather than on and kun.
6. Data Model
Use these tables. Types shown in plain SQL terms; adapt to Prisma.

subjects: id (text, pk), type (enum: radical, kanji, vocabulary), level (int), characters (text, nullable for image radicals), image_url (text, nullable), primary_reading (text, nullable), created_at, updated_at.
subject_meanings: id, subject_id (fk), text, is_primary (bool).
subject_readings: id, subject_id (fk), text, reading_type (enum: onyomi, kunyomi, vocab), is_primary (bool).
subject_components: subject_id (fk), component_id (fk). Many to many linking a kanji to its radicals and a vocab to its kanji.
mnemonics: subject_id (fk), meaning_mnemonic (text), reading_mnemonic (text).
study_progress: subject_id (fk, unique per user), srs_stage (int 1 to 9, null if locked or not yet lessoned), unlocked_at, started_at, next_review_at (timestamp, nullable), passed_at (stage reached 5), burned_at, total_correct, total_incorrect.
reviews_log: id, subject_id, started_at, ended_at, incorrect_meaning_count, incorrect_reading_count, resulting_stage.
settings: single row. batch_size (int default 5), daily_new_cap (int nullable), flashcard_default (bool), vacation_mode (bool), vacation_started_at (timestamp nullable), theme (text default 'catppuccin-mocha').

Indexes: study_progress(next_review_at) for the due query; subjects(level, type).
7. Key Logic

Due query: select subjects joined to study_progress where srs_stage between 1 and 8 and next_review_at is at or before now and vacation_mode is false.
Unlock check: when an item reaches stage 5, find subjects whose components are now all at stage 5 or higher and that are not yet unlocked, and add them to the lessons queue.
Level up check: current level radicals all at stage 5 and at least 90 percent of current level kanji at stage 5 unlocks the next level's radicals.
Scheduling: on each graded item compute the new stage, then set next_review_at to now plus the interval for that stage (rounded down to the hour), using accelerated intervals when level is 1 or 2 and stage is in the Apprentice range.

8. Screens

Dashboard: due review count, available lessons, current level and progress, recent activity, vacation toggle.
Lessons: teaching flow then seeding quiz.
Reviews: the session loop with the keyboard shortcuts above and the flashcard toggle.
Level browser: items per level with SRS stage chips.
Item detail: character, meanings, readings, mnemonics, components, current stage, unburn action.
Settings: batch size, daily cap, default mode, theme, vacation mode, data import.
Import: file picker, validation report, confirm.

9. UI and Theme
Dark theme using Catppuccin Mocha, a widely used palette. Define these as CSS variables / Tailwind theme tokens.

Base background: #1e1e2e. Mantle: #181825. Crust: #11111b.
Text: #cdd6f4. Subtext: #a6adc8. Surfaces: #313244, #45475a. Overlay: #6c7086.
Accents: blue #89b4fa, mauve #cba6f7, pink #f5c2e7, green #a6e3a1, red #f38ba8, yellow #f9e2af, peach #fab387, teal #94e2d5.

Item type color coding (mirrors WaniKani's convention, mapped to Mocha):

Radical: blue #89b4fa.
Kanji: pink #f5c2e7.
Vocabulary: mauve #cba6f7.

SRS group colors for stage chips: Apprentice pink #f38ba8, Guru mauve #cba6f7, Master blue #89b4fa, Enlightened sky #89dceb, Burned overlay #6c7086.
Layout: clean, large character display, generous spacing, rounded corners, a single accent per context. Answer field turns green on correct and red on incorrect. Keep typography readable with a font that renders kanji well.
10. Keyboard Shortcuts

Enter: submit answer.
Backspace: delete character; revert undo when empty (Section 5.5).
Left arrow: previous card (read only). Right arrow: return to current.
Space: flip card in flashcard mode. 1: knew it. 2: missed.
V: toggle vacation mode from the dashboard.

11. Acceptance Criteria

A new item progresses through all nine stages with the exact intervals in Section 4, and accelerated intervals apply on levels 1 and 2.
A wrong answer lowers the stage per the formula and reschedules sooner.
Items unlock only when all components are at Guru or above; level up requires radicals plus 90 percent of kanji at Guru.
Flashcard mode grades into the same SRS as typed mode.
Previous card navigation shows prior cards without altering submitted grades.
Backspace undo reverts the most recent submission before the next card is graded.
Vacation mode freezes due dates and, on disable, shifts pending reviews by the elapsed time.
Batch size setting changes how many new items a lesson introduces, within range.
Importing a valid CSV or JSON populates subjects, and re importing updates content without resetting SRS state.
The app renders in the Catppuccin Mocha dark theme with the item and SRS color coding.

12. Non Goals (for v1)
Audio recordings, community forums, mobile native apps, multi user sync, and content scraped from WaniKani. The learner supplies their own data set.
13. Suggested Build Order

Project scaffold, theme tokens, database schema and migrations.
Importer and seed script with a small sample data set.
SRS engine as a pure, unit tested module (intervals, stage math, scheduling).
Review session loop with typed answers.
Lessons flow and unlock / level up logic.
Dashboard and level browser.
Added features: flashcard mode, previous cards, backspace undo, vacation mode, batch size.
Settings and import screens, polish.