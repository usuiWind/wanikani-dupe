This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Database Setup

1. Copy `.env.example` to `.env` and fill in your Supabase `DATABASE_URL`/`DIRECT_URL`.
2. Push the Prisma schema to the database:
   ```bash
   npx prisma db push
   ```
3. Fetch the WaniKani subject dataset (requires a WaniKani API token, and a paid
   subscription for full subject data). Writes `wanikani-subjects.csv`:
   ```bash
   npx tsx scripts/fetch-wanikani.ts <wanikani-api-token>
   ```
4. Import the CSV into the `Subject` table:
   ```bash
   npx tsx scripts/import-csv.ts
   ```
5. Import your personal SRS progress from WaniKani into `StudyProgress`:
   ```bash
   npx tsx scripts/import-assignments.ts <wanikani-api-token>
   ```

⚠️ **Re-running `import-csv.ts` truncates `Subject` and cascades to all imported
progress** (`StudyProgress`, `ReviewsLog`, etc.) — see [MAINTENANCE.md](./MAINTENANCE.md)
before re-running it on a database that already has progress data.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
