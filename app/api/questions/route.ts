import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  signSession,
  verifySession,
  defaultSession,
  COOKIE_NAME,
  MAX_AGE,
  Difficulty,
} from '@/lib/session';

interface RawQuestion {
  tipe: string;
  soal: string;
  pg_a: string;
  pg_b: string;
  pg_c: string;
  pg_d: string;
  jawaban: string;
  waktu: number;
}

type BankSoal = Record<string, [Record<string, RawQuestion[]>]>;

// ── GET /api/questions?category=X&difficulty=Y ────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const difficulty = searchParams.get('difficulty') as Difficulty | null;

  if (!category || !difficulty) {
    return NextResponse.json({ error: 'category and difficulty are required' }, { status: 400 });
  }

  // ── Load bank soal from public folder ──────────────────────────────────────
  const filePath = path.join(process.cwd(), 'public', 'bank_soal.json');
  let bank: BankSoal;
  try {
    const raw = await readFile(filePath, 'utf-8');
    bank = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Failed to load bank soal' }, { status: 500 });
  }

  const pool: RawQuestion[] | undefined = bank[category]?.[0]?.[difficulty];
  if (!pool || pool.length === 0) {
    return NextResponse.json({ error: 'No questions for this category/difficulty' }, { status: 404 });
  }

  // ── Get current session to check used questions ────────────────────────────
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  const session = cookieToken
    ? (await verifySession(cookieToken)) ?? { ...defaultSession }
    : { ...defaultSession };

  const usedIndices: number[] = session.usedQuestions?.[category]?.[difficulty] ?? [];

  // ── Find available (unseen) indices ───────────────────────────────────────
  const allIndices = pool.map((_, i) => i);
  let available = allIndices.filter(i => !usedIndices.includes(i));

  // If all questions exhausted, reset used list for this slot (cycle)
  if (available.length === 0) {
    available = allIndices;
    // Reset used for this category/difficulty
    if (session.usedQuestions[category]) {
      session.usedQuestions[category][difficulty] = [];
    }
  }

  // ── Pick random from available ─────────────────────────────────────────────
  const pickedIndex = available[Math.floor(Math.random() * available.length)];
  const question = pool[pickedIndex];

  // ── Update session: mark this index as used ────────────────────────────────
  if (!session.usedQuestions[category]) session.usedQuestions[category] = {};
  const currentUsed = session.usedQuestions[category][difficulty] ?? [];
  session.usedQuestions[category][difficulty] = [...currentUsed, pickedIndex];

  // Also update session state
  session.state = 'question';
  session.category = category;
  session.difficulty = difficulty;
  session.questionIndex = pickedIndex;
  session.timerStartedAt = null;
  session.timerDuration = question.waktu;

  // ── Re-sign and set cookie ─────────────────────────────────────────────────
  const newToken = await signSession(session);
  const res = NextResponse.json({
    question,
    questionIndex: pickedIndex,
    remaining: available.length - 1,
    totalInPool: pool.length,
  });

  res.cookies.set({
    name: COOKIE_NAME,
    value: newToken,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });

  return res;
}
