'use client';
import { useState, useEffect, useMemo } from 'react';
import SpinWheel from './SpinWheel';
import QuestionModal from './QuestionModal';
import Link from 'next/link';

export type AppState = 'loading' | 'wheel' | 'question';
export type Difficulty = 'Receh' | 'Sedang' | 'Sulit';

export interface Question {
  tipe: string;
  soal: string;
  pg_a: string;
  pg_b: string;
  pg_c: string;
  pg_d: string;
  jawaban: string | number;
  waktu: number;
}

export interface SessionData {
  state: AppState;
  category: string | null;
  difficulty: Difficulty | null;
  questionIndex: number | null;
  usedQuestions: Record<string, Record<string, number[]>>;
  timerStartedAt: number | null;
  timerDuration: number | null;
}

export const CATEGORY_COLORS = {
  'Bahasa Indonesia': { bg: '#ff6b6b', light: 'rgba(255,107,107,0.15)', text: '#ff6b6b', icon: '📝' },
  'English': { bg: '#4d96ff', light: 'rgba(77,150,255,0.15)', text: '#4d96ff', icon: '🌍' },
  'Matematika': { bg: '#ffd93d', light: 'rgba(255,217,61,0.15)', text: '#ffd93d', icon: '🔢' },
  'PAI': { bg: '#6bcb77', light: 'rgba(107,203,119,0.15)', text: '#6bcb77', icon: '🕌' },
  'IT': { bg: '#c77dff', light: 'rgba(199,125,255,0.15)', text: '#c77dff', icon: '💻' },
  'IPA': { bg: '#ff9a3c', light: 'rgba(255,154,60,0.15)', text: '#ff9a3c', icon: '🔬' },
};

const STORAGE_KEY = 'quizspin_session';
const BANK_URL = 'https://script.google.com/macros/s/AKfycbwkqpS3OHhigQf95hl3GBQv-NbIUnyt9LD7n6D0gFFVyK-54WNDTp7bbXGEBGykZyIg/exec';

// Simpan session ke localStorage
function saveSession(data: SessionData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

// Load session dari localStorage
function loadSession(): SessionData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// Clear session
function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}

export default function QuizApp() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [bankData, setBankData] = useState<Record<string, [Record<string, Question[]>]> | null>(null);
  const [session, setSession] = useState<SessionData>({
    state: 'wheel',
    category: null,
    difficulty: null,
    questionIndex: null,
    usedQuestions: {},
    timerStartedAt: null,
    timerDuration: null,
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [recoveredTimeLeft, setRecoveredTimeLeft] = useState<number | null>(null);

  // Load bank data dan restore session saat mount
  useEffect(() => {
    (async () => {
      try {
        // 1. Load bank data dari URL atau fallback ke lokal
        let data: Record<string, [Record<string, Question[]>]> | null = null;
        
        try {
          const res = await fetch(BANK_URL);
          if (res.ok) {
            const json = await res.json();
            if (json && typeof json === 'object' && !json.error) {
              data = json;
            }
          }
        } catch {
          console.log('Failed to load from URL, using local fallback');
        }

        // Fallback ke file lokal
        if (!data) {
          const res = await fetch('/bank_soal.json');
          data = await res.json();
        }

        setBankData(data);

        // 2. Restore session dari localStorage
        const savedSession = loadSession();
        if (savedSession) {
          // Jika ada timer yang masih berjalan, hitung sisa waktu
          if (savedSession.state === 'question' && 
              savedSession.timerStartedAt && 
              savedSession.timerDuration) {
            const elapsed = Math.floor((Date.now() - savedSession.timerStartedAt) / 1000);
            const timeLeft = Math.max(0, savedSession.timerDuration - elapsed);
            setRecoveredTimeLeft(timeLeft);
          }
          
          setSession(savedSession);
          setAppState(savedSession.state === 'loading' ? 'wheel' : savedSession.state);
        } else {
          setAppState('wheel');
        }
      } catch (e) {
        console.error('Failed to load:', e);
        setAppState('wheel');
      }
    })();
  }, []);

  // Computed values
  const difficultyTimes = useMemo(() => {
    if (!bankData) return {};
    const result: Record<string, Record<string, number>> = {};
    for (const [cat, arr] of Object.entries(bankData)) {
      const catData = arr[0];
      if (!catData) continue;
      result[cat] = {};
      for (const [diff, questions] of Object.entries(catData)) {
        result[cat][diff] = (questions as Question[])[0]?.waktu ?? 0;
      }
    }
    return result;
  }, [bankData]);

  const poolSizes = useMemo(() => {
    if (!bankData) return {};
    const result: Record<string, Record<string, number>> = {};
    for (const [cat, arr] of Object.entries(bankData)) {
      const catData = arr[0];
      if (!catData) continue;
      result[cat] = {};
      for (const [diff, questions] of Object.entries(catData)) {
        result[cat][diff] = (questions as Question[]).length;
      }
    }
    return result;
  }, [bankData]);

  const currentQuestion = useMemo(() => {
    if (!bankData || !session.category || !session.difficulty || session.questionIndex === null) {
      return null;
    }
    const pool: Question[] = bankData[session.category]?.[0]?.[session.difficulty] ?? [];
    return pool[session.questionIndex] ?? null;
  }, [bankData, session.category, session.difficulty, session.questionIndex]);

  const totalUsed = useMemo(() => {
    return Object.values(session.usedQuestions)
      .flatMap(d => Object.values(d))
      .flat().length;
  }, [session.usedQuestions]);

  const remaining = useMemo(() => {
    if (!session.category || !session.difficulty) return null;
    const total = poolSizes[session.category]?.[session.difficulty] ?? 0;
    const used = session.usedQuestions[session.category]?.[session.difficulty]?.length ?? 0;
    return total - used;
  }, [session, poolSizes]);

  const totalInPool = useMemo(() => {
    if (!session.category || !session.difficulty) return null;
    return poolSizes[session.category]?.[session.difficulty] ?? 0;
  }, [session, poolSizes]);

  // Select question
  const selectQuestion = (category: string, difficulty: Difficulty) => {
    if (!bankData) return;

    const pool: Question[] = bankData[category]?.[0]?.[difficulty] ?? [];
    const used = session.usedQuestions[category]?.[difficulty] ?? [];
    const available = pool
      .map((_, idx) => idx)
      .filter(idx => !used.includes(idx));

    if (available.length === 0) {
      alert('Semua soal sudah terpakai!');
      return;
    }

    // Random pick
    const randomIdx = available[Math.floor(Math.random() * available.length)];
    
    // Update used questions
    const newUsed = {
      ...session.usedQuestions,
      [category]: {
        ...session.usedQuestions[category],
        [difficulty]: [...used, randomIdx],
      },
    };

    const newSession: SessionData = {
      state: 'question',
      category,
      difficulty,
      questionIndex: randomIdx,
      usedQuestions: newUsed,
      timerStartedAt: null,
      timerDuration: null,
    };

    setSession(newSession);
    setAppState('question');
    setRecoveredTimeLeft(null);
    saveSession(newSession);
  };

  // Record timer start
  const recordTimerStart = (duration: number) => {
    const newSession = {
      ...session,
      timerStartedAt: Date.now(),
      timerDuration: duration,
    };
    setSession(newSession);
    saveSession(newSession);
  };

  // Finish question - kembali ke wheel
  const finish = () => {
    const newSession: SessionData = {
      ...session,
      state: 'wheel',
      category: null,
      difficulty: null,
      questionIndex: null,
      timerStartedAt: null,
      timerDuration: null,
    };
    setSession(newSession);
    setAppState('wheel');
    setRecoveredTimeLeft(null);
    saveSession(newSession);
  };

  // Go back - kembali ke wheel dan un-consume question
  const goBack = () => {
    if (!session.category || !session.difficulty || session.questionIndex === null) {
      finish();
      return;
    }

    const used = session.usedQuestions[session.category]?.[session.difficulty] ?? [];
    const newUsed = used.filter(idx => idx !== session.questionIndex);

    const newSession: SessionData = {
      ...session,
      state: 'wheel',
      category: null,
      difficulty: null,
      questionIndex: null,
      timerStartedAt: null,
      timerDuration: null,
      usedQuestions: {
        ...session.usedQuestions,
        [session.category]: {
          ...session.usedQuestions[session.category],
          [session.difficulty]: newUsed,
        },
      },
    };

    setSession(newSession);
    setAppState('wheel');
    setRecoveredTimeLeft(null);
    saveSession(newSession);
  };

  // Full reset
  const fullReset = () => {
    clearSession();
    const newSession: SessionData = {
      state: 'wheel',
      category: null,
      difficulty: null,
      questionIndex: null,
      usedQuestions: {},
      timerStartedAt: null,
      timerDuration: null,
    };
    setSession(newSession);
    setAppState('wheel');
    setRecoveredTimeLeft(null);
    setShowResetConfirm(false);
  };

  const catColor = session.category
    ? CATEGORY_COLORS[session.category as keyof typeof CATEGORY_COLORS]
    : null;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 20% 50%, rgba(77,150,255,0.08) 0%, transparent 50%),' +
          'radial-gradient(ellipse at 80% 20%, rgba(199,125,255,0.08) 0%, transparent 50%),' +
          'radial-gradient(ellipse at 50% 80%, rgba(255,107,107,0.05) 0%, transparent 50%),' +
          '#0a0a14',
      }}
    >
      <Stars />

      {/* Header */}
      <header className="relative z-10 flex items-center px-6 py-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg,#4d96ff,#c77dff)' }}
          >
            ⚙️
          </div>
          <span
            style={{
              fontFamily: 'Poppins,sans-serif',
              fontWeight: 800,
              fontSize: '1.25rem',
              background: 'linear-gradient(90deg,#4d96ff,#c77dff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            QuizSpin
          </span>
        </div>
      </header>

      {/* Loading */}
      {appState === 'loading' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: '#0a0a14' }}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{
                background: 'linear-gradient(135deg,#4d96ff,#c77dff)',
                animation: 'pulse 1s ease-in-out infinite',
              }}
            >
              ⚙️
            </div>
            <p style={{ color: '#9898b8', fontFamily: 'Nunito,sans-serif' }}>
              Memuat QuizSpin...
            </p>
          </div>
        </div>
      )}

      {/* Main */}
      <main
        className="relative z-10 flex flex-col items-center justify-center px-4 pb-12"
        style={{ minHeight: 'calc(100vh - 90px)' }}
      >
        {appState === 'wheel' && bankData && (
          <SpinWheel
            onDifficultySelected={selectQuestion}
            usedQuestions={session.usedQuestions}
            difficultyTimes={difficultyTimes}
            poolSizes={poolSizes}
          />
        )}
      </main>

      {/* Question Modal */}
      {appState === 'question' && currentQuestion && session.category && session.difficulty && catColor && (
        <QuestionModal
          question={currentQuestion}
          category={session.category}
          difficulty={session.difficulty}
          categoryColor={catColor}
          recoveredTimeLeft={recoveredTimeLeft}
          remaining={remaining}
          totalInPool={totalInPool}
          onTimerStart={recordTimerStart}
          onFinished={finish}
          onBack={goBack}
        />
      )}

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div
            className="modal-box flex flex-col items-center gap-5 text-center"
            style={{
              maxWidth: 440,
              border: '1px solid rgba(255,107,107,0.3)',
              animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{
                background: 'rgba(255,107,107,0.15)',
                border: '2px solid rgba(255,107,107,0.4)',
              }}
            >
              ⚠️
            </div>
            <div>
              <h3
                style={{
                  fontFamily: 'Poppins,sans-serif',
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  color: '#f0f0f8',
                  marginBottom: 8,
                }}
              >
                Reset Seluruh Quiz?
              </h3>
              <p
                style={{
                  color: '#9898b8',
                  fontFamily: 'Nunito,sans-serif',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                }}
              >
                Semua progres dan riwayat soal akan dihapus.<br /> Quiz akan mulai dari awal.
              </p>
              {totalUsed > 0 && (
                <p
                  style={{
                    color: '#ff6b6b',
                    fontFamily: 'Space Mono,monospace',
                    fontSize: '0.8rem',
                    marginTop: 8,
                  }}
                >
                  {totalUsed} soal akan direset
                </p>
              )}
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#9898b8',
                  cursor: 'pointer',
                  fontFamily: 'Poppins,sans-serif',
                  transition: 'all 0.2s',
                }}
              >
                Batal
              </button>
              <button
                onClick={fullReset}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg,#ff6b6b,#ee2244)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Poppins,sans-serif',
                  fontWeight: 800,
                  boxShadow: '0 6px 20px rgba(255,107,107,0.4)',
                  transition: 'all 0.2s',
                }}
              >
                🔄 Ya, Reset!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset FAB */}
      <div
      // className="fixed bottom-12 left-12 z-10 flex flex-row gap-4"
        className="flex flex-row m-auto justify-center items-center"
        style={{gap: 10, marginBottom: 32 }}
      >
        {/* Credits */}
        <a href="https://github.com/cakapbagus/quiz-app"
        style={{
          background: 'rgba(107, 117, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(107, 110, 255, 0.45)',
          color: '#5b50fc',
          cursor: 'pointer',
          fontFamily: 'Poppins,sans-serif',
          fontWeight: 700,
          fontSize: '0.85rem',
          padding: '2px 6px',
          borderRadius: 99,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s',
          boxShadow: '0 4px 20px rgba(117, 107, 255, 0.2)',
          textDecoration: 'none',
        }}>
          © Github
        </a>

        {totalUsed > 0 && (
          <div
            style={{
              background: 'rgba(10,10,20,0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(77,150,255,0.25)',
              color: '#4d96ff',
              fontFamily: 'Space Mono,monospace',
              fontSize: '0.7rem',
              padding: '4px 10px',
              borderRadius: 99,
            }}
          >
            ✓ {totalUsed} soal terpakai
          </div>
        )}
        
        <button
          onClick={() => setShowResetConfirm(true)}
          title="Reset seluruh quiz dari awal"
          style={{
            background: 'rgba(255,107,107,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(255,107,107,0.45)',
            color: '#ff6b6b',
            cursor: 'pointer',
            fontFamily: 'Poppins,sans-serif',
            fontWeight: 700,
            fontSize: '0.85rem',
            padding: '2px 6px',
            borderRadius: 99,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s',
            boxShadow: '0 4px 20px rgba(255,107,107,0.2)',
          }}
        >
          🔄 Reset
        </button>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.88);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.4);
          }
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .modal-box {
          background: #14141f;
          border-radius: 1.5rem;
          padding: 2rem;
          max-width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}

// Stars component
function Stars() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const stars = useMemo(() => {
    const lcg = (s: number) => ((s * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      top: `${lcg(i * 4 + 1) * 100}%`,
      left: `${lcg(i * 4 + 2) * 100}%`,
      size: lcg(i * 4 + 3) * 2 + 1,
      duration: lcg(i * 4 + 4) * 4 + 2,
      delay: lcg(i * 4 + 5) * 4,
    }));
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: 0.1,
            animation: `twinkle ${s.duration}s ease-in-out infinite ${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
