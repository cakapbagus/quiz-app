'use client';
import { useState, useEffect, useMemo } from 'react';
import { useQuizSession } from '@/hooks/useQuizSession';
import SpinWheel from './SpinWheel';
import QuestionModal from './QuestionModal';
import ResumeToast from './ResumeToast';

export const CATEGORY_COLORS = {
  'Bahasa Indonesia': { bg: '#ff6b6b', light: 'rgba(255,107,107,0.15)', text: '#ff6b6b', icon: '📝' },
  'English':          { bg: '#4d96ff', light: 'rgba(77,150,255,0.15)',   text: '#4d96ff', icon: '🌍' },
  'Matematika':       { bg: '#ffd93d', light: 'rgba(255,217,61,0.15)',   text: '#ffd93d', icon: '🔢' },
  'PAI':              { bg: '#6bcb77', light: 'rgba(107,203,119,0.15)', text: '#6bcb77', icon: '🕌' },
  'IT':               { bg: '#c77dff', light: 'rgba(199,125,255,0.15)', text: '#c77dff', icon: '💻' },
  'IPA':              { bg: '#ff9a3c', light: 'rgba(255,154,60,0.15)',  text: '#ff9a3c', icon: '🔬' },
};

export default function QuizApp() {
  const {
    appState, selectedCategory, selectedDifficulty,
    currentQuestion, allDifficultyTimes, poolSizes,
    recoveredTimeLeft, hydrating,
    usedQuestions, remaining, totalInPool,
    selectQuestion, recordTimerStart, finish, fullReset,
  } = useQuizSession();

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const catColor = selectedCategory
    ? CATEGORY_COLORS[selectedCategory as keyof typeof CATEGORY_COLORS]
    : null;

  const totalUsed = Object.values(usedQuestions)
    .flatMap(d => Object.values(d)).flat().length;

  const handleResetClick = () => setShowResetConfirm(true);
  const handleResetConfirm = async () => { setShowResetConfirm(false); await fullReset(); window.location.reload(); };
  const handleResetCancel  = () => setShowResetConfirm(false);

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

      {/* ── Header — logo only ── */}
      <header className="relative z-10 flex items-center px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg,#4d96ff,#c77dff)' }}>
            ⚙️
          </div>
          <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:'1.25rem', background:'linear-gradient(90deg,#4d96ff,#c77dff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            QuizSpin
          </span>
        </div>
      </header>

      {/* ── Hydration splash ── */}
      {hydrating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:'#0a0a14' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background:'linear-gradient(135deg,#4d96ff,#c77dff)', animation:'pulse 1s ease-in-out infinite' }}>
              ⚙️
            </div>
            <p style={{ color:'#9898b8', fontFamily:'Nunito,sans-serif' }}>Memulihkan sesi...</p>
          </div>
        </div>
      )}

      {/* ── Resume toast ── */}
      {!hydrating && appState === 'question' && recoveredTimeLeft !== null && selectedCategory && selectedDifficulty && (
        <ResumeToast category={selectedCategory} difficulty={selectedDifficulty} />
      )}

      {/* ── Main ── */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pb-12"
        style={{ minHeight:'calc(100vh - 90px)' }}>
        {!hydrating && appState === 'wheel' && (
          <SpinWheel
            onDifficultySelected={selectQuestion}
            usedQuestions={usedQuestions}
            difficultyTimes={allDifficultyTimes}
            poolSizes={poolSizes}
          />
        )}
      </main>

      {/* ── Question Modal ── */}
      {!hydrating && appState === 'question' && currentQuestion && selectedCategory && selectedDifficulty && catColor && (
        <QuestionModal
          question={currentQuestion}
          category={selectedCategory}
          difficulty={selectedDifficulty}
          categoryColor={catColor}
          recoveredTimeLeft={recoveredTimeLeft}
          remaining={remaining}
          totalInPool={totalInPool}
          onTimerStart={recordTimerStart}
          onFinished={finish}
        />
      )}

      {/* ── Reset confirmation modal ── */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background:'rgba(255,107,107,0.15)', border:'2px solid rgba(255,107,107,0.4)' }}>
              ⚠️
            </div>
            <div>
              <h3 style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:'1.35rem', color:'#f0f0f8', marginBottom:8 }}>
                Reset Seluruh Quiz?
              </h3>
              <p style={{ color:'#9898b8', fontFamily:'Nunito,sans-serif', fontSize:'0.9rem', lineHeight:1.6 }}>
                Semua progres dan riwayat soal yang sudah dipakai akan dihapus. Quiz akan mulai dari awal.
              </p>
              {totalUsed > 0 && (
                <p style={{ color:'#ff6b6b', fontFamily:'Space Mono,monospace', fontSize:'0.8rem', marginTop:8 }}>
                  {totalUsed} soal akan direset
                </p>
              )}
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={handleResetCancel}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#9898b8', cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='#f0f0f8'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='#9898b8'; }}>
                Batal
              </button>
              <button onClick={handleResetConfirm}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background:'linear-gradient(135deg,#ff6b6b,#ee2244)', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:800, boxShadow:'0 6px 20px rgba(255,107,107,0.4)', transition:'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 10px 28px rgba(255,107,107,0.55)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='0 6px 20px rgba(255,107,107,0.4)'; }}>
                🔄 Ya, Reset!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed bottom-right reset FAB ── */}
      <div className="fixed z-40" style={{ bottom:28, right:28, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
        {totalUsed > 0 && (
          <div style={{ background:'rgba(10,10,20,0.85)', backdropFilter:'blur(8px)', border:'1px solid rgba(77,150,255,0.25)', color:'#4d96ff', fontFamily:'Space Mono,monospace', fontSize:'0.7rem', padding:'4px 10px', borderRadius:99 }}>
            ✓ {totalUsed} soal terpakai
          </div>
        )}
        <button
          onClick={handleResetClick}
          title="Reset seluruh quiz dari awal"
          style={{ background:'rgba(255,107,107,0.15)', backdropFilter:'blur(10px)', border:'1.5px solid rgba(255,107,107,0.45)', color:'#ff6b6b', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:'0.85rem', padding:'10px 18px', borderRadius:99, display:'flex', alignItems:'center', gap:6, transition:'all 0.2s', boxShadow:'0 4px 20px rgba(255,107,107,0.2)' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(255,107,107,0.28)'; el.style.boxShadow='0 8px 28px rgba(255,107,107,0.35)'; el.style.transform='translateY(-2px)'; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(255,107,107,0.15)'; el.style.boxShadow='0 4px 20px rgba(255,107,107,0.2)'; el.style.transform=''; }}
        >
          🔄 Reset
        </button>
      </div>

      <style jsx global>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.8} }
        @keyframes popIn  { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
        @keyframes twinkle { 0%,100%{opacity:0.1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.4)} }
      `}</style>
    </div>
  );
}

// Stars: generated only on client to avoid SSR/hydration mismatch
function Stars() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Deterministic pseudo-random values seeded by index — same on every render
  const stars = useMemo(() => {
    const lcg = (s: number) => ((s * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
    return Array.from({ length: 50 }, (_, i) => ({
      id:       i,
      top:      `${lcg(i * 4 + 1) * 100}%`,
      left:     `${lcg(i * 4 + 2) * 100}%`,
      size:     lcg(i * 4 + 3) * 2 + 1,
      duration: lcg(i * 4 + 4) * 4 + 2,
      delay:    lcg(i * 4 + 5) * 4,
    }));
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {stars.map(s => (
        <div key={s.id} className="absolute rounded-full bg-white"
          style={{
            top: s.top, left: s.left,
            width: `${s.size}px`, height: `${s.size}px`,
            opacity: 0.1,
            animation: `twinkle ${s.duration}s ease-in-out infinite ${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
