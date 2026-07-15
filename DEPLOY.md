# Deploying KaniLocal (use it on your iPhone)

KaniLocal is a Next.js app that needs a running server, so to use it on a phone
you host it and open the URL in Safari. This deploys to **Vercel** (free, native
Next.js host) using your existing **Supabase** database.

A password gate (`middleware.ts`) protects the public URL — without it, anyone
with the link could see and change your data.

---

## One-time setup

### 1. Push the repo to GitHub
Vercel deploys from GitHub. Make sure your latest commit is pushed:

```bash
git add -A
git commit -m "Add Vercel deploy config + password gate"
git push
```

### 2. Import into Vercel
1. Go to **https://vercel.com** and sign in with GitHub.
2. **Add New → Project** → import this repository.
3. Framework preset auto-detects as **Next.js**. Leave build settings at default
   (the `postinstall` script handles Prisma).

### 3. Add environment variables
In the Vercel import screen (or **Project → Settings → Environment Variables**),
add these. Copy the DB values from your local `.env` file:

| Name | Value | Notes |
|------|-------|-------|
| `DATABASE_URL` | Supabase **pooler** URL, port `6543`, ending in `?pgbouncer=true` | runtime queries |
| `DIRECT_URL` | Supabase **direct** URL, port `5432` | referenced by the schema |
| `APP_PASSWORD` | a password you choose | the login gate — **required to protect the app** |
| `APP_USER` | *(optional)* a username | defaults to `admin` |
| `NEXT_PUBLIC_SUPABASE_URL` | *(optional)* from `.env` | only if client code uses it |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(optional)* from `.env` | only if client code uses it |

> Find the Supabase URLs in **Supabase dashboard → Settings → Database**.
> The exact formats are in `.env.example`.

### 4. Deploy
Click **Deploy**. When it finishes you get a URL like
`https://kanilocal.vercel.app`.

---

## Using it on your iPhone
1. Open the Vercel URL in **Safari**.
2. Safari prompts for the username/password once — enter `admin` (or your
   `APP_USER`) and your `APP_PASSWORD`. It remembers it.
3. Use the app normally. Progress saves to the same Supabase database as your PC.

Redeploys happen automatically every time you `git push`.

---

## Notes & limits
- **Password:** a single shared password (Basic auth), fine for one user. It's
  sent over HTTPS so it's encrypted in transit, but it isn't a full login system.
- **No migrations run on deploy** — your Supabase data is used as-is. Data setup
  (importing WaniKani subjects/assignments) is still done locally per `README.md`.
- **Local dev is unaffected:** if `APP_PASSWORD` isn't set (as on your PC), the
  gate is off and the app opens with no prompt.
- **Turning the gate off** (not recommended for a public URL): remove the
  `APP_PASSWORD` env var in Vercel and redeploy.
