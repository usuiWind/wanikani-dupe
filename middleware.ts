import { NextRequest, NextResponse } from "next/server";

// The app has no login of its own. On a public URL that leaves your WaniKani
// data open to anyone with the link, so gate everything behind HTTP Basic auth
// checked against env vars. iOS Safari shows a native prompt and remembers it.
// ponytail: one user, one secret — upgrade to real auth only if you add users.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  // No password configured (e.g. local dev) → gate is off, app is open.
  if (!password) return NextResponse.next();

  const expectedUser = process.env.APP_USER ?? "admin";
  const header = req.headers.get("authorization");

  if (header?.startsWith("Basic ")) {
    const [user, pass] = atob(header.slice(6)).split(":");
    if (user === expectedUser && pass === password) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="KaniLocal"' },
  });
}

// Gate all app routes; skip Next internals and static assets.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
