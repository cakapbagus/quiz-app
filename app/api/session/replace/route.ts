import { NextRequest, NextResponse } from 'next/server';
import {
  signSession,
  verifySession,
  defaultSession,
  COOKIE_NAME,
  MAX_AGE,
  SessionPayload,
} from '@/lib/session';

/**
 * POST /api/session/replace
 *
 * Like POST /api/session but REPLACES usedQuestions entirely instead of merging.
 * Used by goBack() to un-consume a question without the merge logic re-adding it.
 */
export async function POST(req: NextRequest) {
  const body: Partial<SessionPayload> = await req.json();

  // Read existing session (only used for fields NOT in the body)
  const existing = await (async () => {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return { ...defaultSession };
    return (await verifySession(token)) ?? { ...defaultSession };
  })();

  // Merge fields but REPLACE usedQuestions (no union)
  const replaced: SessionPayload = {
    ...existing,
    ...body,
    // Explicit replace — do NOT call mergeUsedQuestions here
    usedQuestions: body.usedQuestions ?? existing.usedQuestions ?? {},
  };

  const token = await signSession(replaced);
  const res   = NextResponse.json({ session: replaced });
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });

  return res;
}
