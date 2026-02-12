import { SignJWT, jwtVerify } from 'jose';

// Secret key – in production set JWT_SECRET env var on Vercel
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'quizspin-default-secret-change-in-production-32ch'
);

const ALG = 'HS256';
const COOKIE_NAME = 'quizspin_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppState = 'wheel' | 'question';
export type Difficulty = 'Receh' | 'Sedang' | 'Sulit';

/**
 * usedQuestions: { [category]: { [difficulty]: number[] } }
 * Stores the soal array indices already shown, keyed by category + difficulty.
 */
export interface SessionPayload {
  state: AppState;
  category: string | null;
  difficulty: Difficulty | null;
  /** Index of the current question in its pool */
  questionIndex: number | null;
  /** Unix ms when the timer was started (null = not yet started) */
  timerStartedAt: number | null;
  /** Duration in seconds for the current question */
  timerDuration: number | null;
  /** Tracks which question indices have been shown per category/difficulty */
  usedQuestions: Record<string, Record<string, number[]>>;
}

export const defaultSession: SessionPayload = {
  state: 'wheel',
  category: null,
  difficulty: null,
  questionIndex: null,
  timerStartedAt: null,
  timerDuration: null,
  usedQuestions: {},
};

// ─── Sign ─────────────────────────────────────────────────────────────────────

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    // Cast – trust our own tokens
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Cookie helpers (used in API routes) ─────────────────────────────────────

export { COOKIE_NAME, MAX_AGE };
