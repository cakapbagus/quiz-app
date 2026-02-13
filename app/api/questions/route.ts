import { NextRequest, NextResponse } from 'next/server';
import {
  signSession, verifySession, defaultSession,
  COOKIE_NAME, MAX_AGE, Difficulty,
} from '@/lib/session';

interface RawQuestion {
  tipe: string; soal: string;
  pg_a: string; pg_b: string; pg_c: string; pg_d: string;
  jawaban: string | number;
  waktu: number;
}
type BankSoal = Record<string, [Record<string, RawQuestion[]>]>;

async function loadBank(req: NextRequest): Promise<BankSoal> {
  // Try the /api/bank proxy (GAS) first
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : req.headers.get('origin') ?? `http://localhost:${process.env.PORT ?? 3000}`;

  try {
    const r = await fetch(`${baseUrl}/api/bank`, { next: { revalidate: 300 } });
    if (r.ok) {
      const data = await r.json();
      if (data && typeof data === 'object' && !data.error) return data;
    }
  } catch { /* fall through to local */ }

  // Fallback: local public/bank_soal.json
  const { readFile } = await import('fs/promises');
  const path = await import('path');
  const raw  = await readFile(path.join(process.cwd(), 'public', 'bank_soal.json'), 'utf-8');
  return JSON.parse(raw);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category   = searchParams.get('category');
  const difficulty = searchParams.get('difficulty') as Difficulty | null;

  if (!category || !difficulty)
    return NextResponse.json({ error: 'category and difficulty required' }, { status: 400 });

  let bank: BankSoal;
  try { bank = await loadBank(req); }
  catch { return NextResponse.json({ error: 'Failed to load bank soal' }, { status: 500 }); }

  const pool: RawQuestion[] | undefined = bank[category]?.[0]?.[difficulty];
  if (!pool || pool.length === 0)
    return NextResponse.json({ error: 'No questions', remaining: 0, totalInPool: 0 }, { status: 404 });

  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  const session = cookieToken
    ? (await verifySession(cookieToken)) ?? { ...defaultSession }
    : { ...defaultSession };

  const usedIndices: number[] = session.usedQuestions?.[category]?.[difficulty] ?? [];
  const allIndices  = pool.map((_, i) => i);
  let   available   = allIndices.filter(i => !usedIndices.includes(i));

  // All exhausted → reset cycle for this slot
  if (available.length === 0) {
    available = allIndices;
    if (session.usedQuestions[category]) session.usedQuestions[category][difficulty] = [];
  }

  const pickedIndex = available[Math.floor(Math.random() * available.length)];
  const question    = pool[pickedIndex];

  if (!session.usedQuestions[category]) session.usedQuestions[category] = {};
  session.usedQuestions[category][difficulty] = [
    ...(session.usedQuestions[category][difficulty] ?? []),
    pickedIndex,
  ];

  session.state          = 'question';
  session.category       = category;
  session.difficulty     = difficulty;
  session.questionIndex  = pickedIndex;
  session.timerStartedAt = null;
  session.timerDuration  = question.waktu;

  const newToken = await signSession(session);
  const res      = NextResponse.json({
    question,
    questionIndex: pickedIndex,
    remaining:     available.length - 1,
    totalInPool:   pool.length,
  });
  res.cookies.set({
    name: COOKIE_NAME, value: newToken,
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE,
  });
  return res;
}
