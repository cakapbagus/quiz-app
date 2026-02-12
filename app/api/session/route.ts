import { NextRequest, NextResponse } from 'next/server';
import {
  signSession,
  verifySession,
  defaultSession,
  COOKIE_NAME,
  MAX_AGE,
  SessionPayload,
} from '@/lib/session';

// ── GET /api/session ──────────────────────────────────────────────────────────
// Returns current session payload (or defaults if no / invalid cookie)
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ session: defaultSession });
  }

  const session = await verifySession(token);
  if (!session) {
    // Expired or tampered – return clean defaults
    const res = NextResponse.json({ session: defaultSession });
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  return NextResponse.json({ session });
}

// ── POST /api/session ─────────────────────────────────────────────────────────
// Accepts a partial or full SessionPayload, merges with existing, re-signs, sets cookie
export async function POST(req: NextRequest) {
  const body: Partial<SessionPayload> = await req.json();

  // Read existing session to merge usedQuestions
  const existing = await (async () => {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return { ...defaultSession };
    return (await verifySession(token)) ?? { ...defaultSession };
  })();

  // Deep-merge usedQuestions
  const merged: SessionPayload = {
    ...existing,
    ...body,
    usedQuestions: mergeUsedQuestions(
      existing.usedQuestions ?? {},
      body.usedQuestions ?? {}
    ),
  };

  const token = await signSession(merged);

  const res = NextResponse.json({ session: merged });
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    // secure: true  ← uncomment in production / Vercel automatically handles HTTPS
  });

  return res;
}

// ── DELETE /api/session ───────────────────────────────────────────────────────
// Clears the session cookie (full reset)
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mergeUsedQuestions(
  base: Record<string, Record<string, number[]>>,
  incoming: Record<string, Record<string, number[]>>
): Record<string, Record<string, number[]>> {
  const result = { ...base };
  for (const [cat, diffs] of Object.entries(incoming)) {
    result[cat] = result[cat] ?? {};
    for (const [diff, indices] of Object.entries(diffs)) {
      const existing = result[cat][diff] ?? [];
      // Union – no duplicates
      result[cat][diff] = Array.from(new Set([...existing, ...indices]));
    }
  }
  return result;
}
