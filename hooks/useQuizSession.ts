'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

export type AppState = 'wheel' | 'question';
export type Difficulty = 'Receh' | 'Sedang' | 'Sulit';

export interface Question {
  tipe: string;                      // "Pilihan Ganda" | "Isian"
  soal: string;
  pg_a: string; pg_b: string; pg_c: string; pg_d: string;
  jawaban: string | number;          // Isian can have a numeric/string answer
  waktu: number;
}

export interface SessionPayload {
  state: AppState;
  category: string | null;
  difficulty: Difficulty | null;
  questionIndex: number | null;
  timerStartedAt: number | null;
  timerDuration: number | null;
  usedQuestions: Record<string, Record<string, number[]>>;
}

export interface QuizSessionState {
  appState: AppState;
  selectedCategory: string | null;
  selectedDifficulty: Difficulty | null;
  currentQuestion: Question | null;
  /** difficultyTimes[category][difficulty] = seconds */
  allDifficultyTimes: Record<string, Record<string, number>>;
  /** poolSizes[category][difficulty] = total question count in that pool */
  poolSizes: Record<string, Record<string, number>>;
  recoveredTimeLeft: number | null;
  hydrating: boolean;
  usedQuestions: Record<string, Record<string, number[]>>;
  remaining: number | null;
  totalInPool: number | null;
}

const CACHE_KEY = 'quizspin_bank';

async function loadBankData(): Promise<Record<string, [Record<string, Question[]>]>> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* ignore */ }

  // Try Google Apps Script proxy first, fall back to local JSON
  let data: Record<string, [Record<string, Question[]>]> | null = null;
  try {
    const gasRes = await fetch('/api/bank');
    if (gasRes.ok) {
      const json = await gasRes.json();
      if (json && typeof json === 'object' && !json.error) data = json;
    }
  } catch { /* fall through */ }

  if (!data) {
    const res = await fetch('/bank_soal.json');
    data = await res.json();
  }

  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  return data!;
}

function buildAllTimes(bank: Record<string, [Record<string, Question[]>]>): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const [cat, arr] of Object.entries(bank)) {
    const catData = arr[0];
    if (!catData) continue;
    result[cat] = {};
    for (const [diff, questions] of Object.entries(catData)) {
      result[cat][diff] = (questions as Question[])[0]?.waktu ?? 0;
    }
  }
  return result;
}

function buildPoolSizes(bank: Record<string, [Record<string, Question[]>]>): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const [cat, arr] of Object.entries(bank)) {
    const catData = arr[0];
    if (!catData) continue;
    result[cat] = {};
    for (const [diff, questions] of Object.entries(catData)) {
      result[cat][diff] = (questions as Question[]).length;
    }
  }
  return result;
}

function saveLocalCache(partial: Partial<{ remaining: number | null; totalInPool: number | null }>) {
  try {
    const existing = JSON.parse(sessionStorage.getItem('quizspin_ui') ?? '{}');
    sessionStorage.setItem('quizspin_ui', JSON.stringify({ ...existing, ...partial }));
  } catch { /* ignore */ }
}

function loadLocalCache(): { remaining?: number | null; totalInPool?: number | null } {
  try { return JSON.parse(sessionStorage.getItem('quizspin_ui') ?? '{}'); }
  catch { return {}; }
}

export function useQuizSession() {
  const [state, setState] = useState<QuizSessionState>({
    appState: 'wheel',
    selectedCategory: null,
    selectedDifficulty: null,
    currentQuestion: null,
    allDifficultyTimes: {},
    poolSizes: {},
    recoveredTimeLeft: null,
    hydrating: true,
    usedQuestions: {},
    remaining: null,
    totalInPool: null,
  });
  const bankRef = useRef<Record<string, [Record<string, Question[]>]> | null>(null);

  // ── HYDRATE on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [sessionRes, bank] = await Promise.all([
          fetch('/api/session').then(r => r.json()),
          loadBankData(),
        ]);
        bankRef.current = bank;
        const session: SessionPayload = sessionRes.session;
        const local = loadLocalCache();
        const allTimes  = buildAllTimes(bank);
        const poolSizes = buildPoolSizes(bank);

        if (session.state === 'question' && session.category && session.difficulty && session.questionIndex !== null) {
          const pool: Question[] = bank[session.category]?.[0]?.[session.difficulty] ?? [];
          const question = pool[session.questionIndex] ?? null;
          let recoveredTimeLeft: number | null = null;
          if (session.timerStartedAt && session.timerDuration) {
            const elapsed = Math.floor((Date.now() - session.timerStartedAt) / 1000);
            recoveredTimeLeft = Math.max(0, session.timerDuration - elapsed);
          }
          setState({
            appState: 'question',
            selectedCategory: session.category,
            selectedDifficulty: session.difficulty,
            currentQuestion: question,
            allDifficultyTimes: allTimes,
            poolSizes,
            recoveredTimeLeft,
            hydrating: false,
            usedQuestions: session.usedQuestions ?? {},
            remaining: local.remaining ?? null,
            totalInPool: local.totalInPool ?? null,
          });
        } else {
          setState(prev => ({
            ...prev,
            appState: 'wheel',
            allDifficultyTimes: allTimes,
            poolSizes,
            hydrating: false,
            usedQuestions: session.usedQuestions ?? {},
          }));
        }
      } catch (e) {
        console.error('Hydration failed', e);
        setState(prev => ({ ...prev, hydrating: false }));
      }
    })();
  }, []);

  // ── SELECT CATEGORY + DIFFICULTY (combined, called from SpinWheel) ────────
  const selectQuestion = useCallback(async (category: string, difficulty: Difficulty) => {
    try {
      const res = await fetch(
        `/api/questions?category=${encodeURIComponent(category)}&difficulty=${encodeURIComponent(difficulty)}`
      );
      if (!res.ok) throw new Error('API error');
      const { question, remaining, totalInPool }: { question: Question; remaining: number; totalInPool: number } = await res.json();
      saveLocalCache({ remaining, totalInPool });
      setState(prev => ({
        ...prev,
        appState: 'question',
        selectedCategory: category,
        selectedDifficulty: difficulty,
        currentQuestion: question,
        recoveredTimeLeft: null,
        remaining,
        totalInPool,
      }));
    } catch (e) {
      console.error('Failed to fetch question', e);
    }
  }, []);

  // ── RECORD TIMER START ────────────────────────────────────────────────────
  const recordTimerStart = useCallback(async (duration: number) => {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timerStartedAt: Date.now(), timerDuration: duration }),
    });
  }, []);

  // ── FINISH – return to wheel, keep usedQuestions ──────────────────────────
  const finish = useCallback(async () => {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'wheel', category: null, difficulty: null, questionIndex: null, timerStartedAt: null, timerDuration: null }),
    });
    const { session } = await res.json();
    saveLocalCache({ remaining: null, totalInPool: null });
    setState(prev => ({
      ...prev,
      appState: 'wheel',
      selectedCategory: null,
      selectedDifficulty: null,
      currentQuestion: null,
      recoveredTimeLeft: null,
      remaining: null,
      totalInPool: null,
      usedQuestions: session.usedQuestions ?? prev.usedQuestions,
    }));
  }, []);

  // ── FULL RESET – clear everything including usedQuestions ─────────────────
  const fullReset = useCallback(async () => {
    await fetch('/api/session', { method: 'DELETE' });
    try { sessionStorage.removeItem('quizspin_ui'); } catch { /* ignore */ }
    setState(prev => ({
      ...prev,
      appState: 'wheel',
      selectedCategory: null,
      selectedDifficulty: null,
      currentQuestion: null,
      recoveredTimeLeft: null,
      remaining: null,
      totalInPool: null,
      usedQuestions: {},
    }));
  }, []);

  return {
    ...state,
    selectQuestion,
    recordTimerStart,
    finish,
    fullReset,
  };
}
