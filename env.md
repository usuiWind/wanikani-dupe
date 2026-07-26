# Copy to .env and fill in your Supabase project values.
# Find these in your Supabase dashboard → Settings → Database

# Connection pooler URL (Transaction mode, port 6543) — used at runtime
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection URL (port 5432) — used for migrations
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Supabase project URL and anon key — used by the Supabase JS client (optional for v1)
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"
