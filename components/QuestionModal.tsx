'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Question, Difficulty } from '@/hooks/useQuizSession';

interface CategoryColor { bg: string; light: string; text: string; icon: string; }
interface Props {
  question: Question;
  category: string;
  difficulty: Difficulty;
  categoryColor: CategoryColor;
  recoveredTimeLeft: number | null;
  remaining: number | null;
  totalInPool: number | null;
  onTimerStart: (d: number) => void;
  onFinished: () => void;
}

type Phase = 'ready' | 'running' | 'timeout' | 'answer';

const DIFF_STYLE = {
  Receh:  { color: '#6bcb77', label: '😄 Receh'  },
  Sedang: { color: '#ffd93d', label: '🤔 Sedang' },
  Sulit:  { color: '#ff6b6b', label: '🔥 Sulit'  },
};
const LABELS = ['A','B','C','D'];
const ANS_COLORS = [
  { base:'rgba(77,150,255,0.1)',  active:'rgba(77,150,255,0.22)',  border:'#4d96ff' },
  { base:'rgba(199,125,255,0.1)', active:'rgba(199,125,255,0.22)', border:'#c77dff' },
  { base:'rgba(255,154,60,0.1)',  active:'rgba(255,154,60,0.22)',  border:'#ff9a3c' },
  { base:'rgba(107,203,119,0.1)', active:'rgba(107,203,119,0.22)', border:'#6bcb77' },
];

export default function QuestionModal({ question, category, difficulty, categoryColor, recoveredTimeLeft, remaining, totalInPool, onTimerStart, onFinished }: Props) {
  const isRecovery   = recoveredTimeLeft !== null;
  const initPhase: Phase = isRecovery
    ? (recoveredTimeLeft! <= 0 ? 'timeout' : 'running')
    : 'ready';

  const [phase, setPhase]     = useState<Phase>(initPhase);
  const [timeLeft, setTimeLeft] = useState(isRecovery ? Math.max(0, recoveredTimeLeft!) : question.waktu);
  const [selected, setSelected] = useState<number | null>(null);
  const ivRef = useRef<NodeJS.Timeout | null>(null);

  const correctLetter = question.jawaban.split('.')[0].trim();
  const correctIdx    = LABELS.indexOf(correctLetter);
  const answers       = [question.pg_a, question.pg_b, question.pg_c, question.pg_d];
  const ds            = DIFF_STYLE[difficulty];

  const runTimer = useCallback((from: number) => {
    setTimeLeft(from);
    setPhase('running');
    ivRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(ivRef.current!); setPhase('timeout'); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  // Auto-start if recovering
  useEffect(() => {
    if (isRecovery && recoveredTimeLeft! > 0) runTimer(recoveredTimeLeft!);
    else if (isRecovery && recoveredTimeLeft! <= 0) setPhase('timeout');
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback(() => {
    onTimerStart(question.waktu);
    runTimer(question.waktu);
  }, [question.waktu, onTimerStart, runTimer]);

  // Timer ring
  const total = question.waktu;
  const pct   = timeLeft / total;
  const circ  = 2 * Math.PI * 48;
  const dash  = circ * (1 - pct);
  const urgent = timeLeft <= 5 && timeLeft > 0;
  const ringColor = pct > 0.5 ? '#6bcb77' : pct > 0.25 ? '#ffd93d' : '#ff6b6b';

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* ── Header badges ── */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background:categoryColor.light, color:categoryColor.text, fontFamily:'Syne,sans-serif', letterSpacing:'0.05em' }}>
              {categoryColor.icon} {category}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background:`${ds.color}22`, color:ds.color, fontFamily:'Syne,sans-serif', letterSpacing:'0.05em' }}>
              {ds.label}
            </span>
            {isRecovery && (
              <span className="px-3 py-1 rounded-full text-xs"
                style={{ background:'rgba(77,150,255,0.1)', color:'#4d96ff', fontFamily:'Space Mono,monospace', border:'1px solid rgba(77,150,255,0.3)' }}>
                🔄 Dipulihkan
              </span>
            )}
          </div>
          {remaining !== null && totalInPool !== null && (
            <span className="px-3 py-1 rounded-full text-xs"
              style={{ background:'rgba(255,255,255,0.05)', color:'#9898b8', fontFamily:'Space Mono,monospace', border:'1px solid rgba(255,255,255,0.08)' }}>
              📚 {totalInPool - remaining}/{totalInPool}
            </span>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            READY phase: show question + choices + waktu + start btn
            ═══════════════════════════════════════════════════════ */}
        {phase === 'ready' && (
          <>
            <QuestionBody question={question} answers={answers} selected={null} correctIdx={-1} disabled />

            {/* Time preview */}
            <div className="flex items-center justify-center gap-3 my-5">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="#9898b8" strokeWidth="1.5"/>
                  <path d="M10 5.5V10.5L13 13" stroke="#9898b8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span style={{ fontFamily:'Space Mono,monospace', color:'#f0f0f8', fontWeight:700, fontSize:'1.1rem' }}>
                  {question.waktu} detik
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <ActionBtn onClick={handleStart} gradient="linear-gradient(135deg,#4d96ff,#c77dff)" shadow="rgba(77,150,255,0.4)">
                ▶ Mulai!
              </ActionBtn>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            RUNNING phase: question + choices (selectable) + timer ring
            ═══════════════════════════════════════════════════════ */}
        {phase === 'running' && (
          <>
            <QuestionBody question={question} answers={answers} selected={selected} correctIdx={-1}
              onSelect={i => setSelected(i)} />

            <div className={`flex items-center justify-between mt-5 ${urgent ? 'timer-warning' : ''}`}>
              <div>
                <p style={{ color:'#9898b8', fontSize:'0.8rem', fontFamily:'Nunito,sans-serif' }}>Waktu tersisa</p>
                <p style={{ color:ringColor, fontFamily:'Space Mono,monospace', fontWeight:700, fontSize:'2rem', lineHeight:1 }}>
                  {timeLeft}<span style={{ fontSize:'1rem' }}>s</span>
                </p>
              </div>
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="48" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9"/>
                <circle cx="55" cy="55" r="48" fill="none" stroke={ringColor} strokeWidth="9"
                  strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dash}
                  style={{ transformOrigin:'55px 55px', transform:'rotate(-90deg)', transition:'stroke-dashoffset 1s linear,stroke 0.5s', filter:`drop-shadow(0 0 8px ${ringColor})` }}/>
                <text x="55" y="55" textAnchor="middle" dominantBaseline="middle"
                  fill={ringColor} fontSize="26" fontFamily="Space Mono,monospace" fontWeight="700">{timeLeft}</text>
              </svg>
              <div style={{ width: 80 }}/>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            TIMEOUT phase: NO question/choices — just icon + button
            ═══════════════════════════════════════════════════════ */}
        {phase === 'timeout' && (
          <div className="flex flex-col items-center gap-5 py-6 answer-reveal">
            <div style={{ fontSize:'5rem', lineHeight:1 }}>⏰</div>
            <div className="text-center">
              <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'2rem', color:'#ff6b6b', marginBottom:8 }}>
                WAKTU HABIS!
              </p>
              <p style={{ color:'#9898b8', fontFamily:'Nunito,sans-serif', fontSize:'0.95rem' }}>
                Klik tombol di bawah untuk melihat jawaban yang benar
              </p>
            </div>
            <ActionBtn onClick={() => setPhase('answer')} gradient="linear-gradient(135deg,#ffd93d,#ff9a3c)" shadow="rgba(255,217,61,0.4)" dark>
              💡 Tampilkan Jawaban
            </ActionBtn>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            ANSWER phase: show answers with correct highlighted
            ═══════════════════════════════════════════════════════ */}
        {phase === 'answer' && (
          <div className="flex flex-col gap-4 answer-reveal">
            <QuestionBody question={question} answers={answers} selected={selected} correctIdx={correctIdx} disabled />

            <div className="rounded-2xl p-4 text-center"
              style={{ background:'rgba(107,203,119,0.1)', border:'2px solid rgba(107,203,119,0.4)' }}>
              <p style={{ color:'#6bcb77', fontSize:'0.8rem', fontFamily:'Nunito,sans-serif', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>
                ✅ Jawaban Benar
              </p>
              <p style={{ color:'#f0f0f8', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem' }}>
                {question.jawaban}
              </p>
            </div>

            {remaining === 0 && (
              <p style={{ color:'#ffd93d', fontSize:'0.8rem', fontFamily:'Space Mono,monospace', textAlign:'center' }}>
                🎉 Semua soal pada kategori ini sudah dipakai — akan di-reset otomatis.
              </p>
            )}

            <div className="flex justify-center pt-1">
              <ActionBtn onClick={onFinished} gradient="linear-gradient(135deg,#4d96ff,#c77dff)" shadow="rgba(77,150,255,0.4)">
                🎉 Selesai!
              </ActionBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function QuestionBody({ question, answers, selected, correctIdx, onSelect, disabled = false }: {
  question: Question; answers: string[]; selected: number | null;
  correctIdx: number; onSelect?: (i: number) => void; disabled?: boolean;
}) {
  return (
    <>
      <div className="rounded-2xl p-5 mb-5"
        style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs mb-2" style={{ color:'#9898b8', fontFamily:'Nunito,sans-serif', textTransform:'uppercase', letterSpacing:'0.1em' }}>Pertanyaan</p>
        <p style={{ color:'#f0f0f8', fontSize:'1.05rem', fontFamily:'Nunito,sans-serif', fontWeight:700, lineHeight:1.65 }}>
          {question.soal}
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {answers.map((ans, i) => {
          const col = ANS_COLORS[i];
          const isSel = selected === i;
          const isOk  = correctIdx === i;
          return (
            <button key={i}
              disabled={disabled}
              onClick={() => onSelect?.(i)}
              className="answer-choice"
              style={{
                background: isOk ? 'rgba(107,203,119,0.18)' : isSel ? col.active : col.base,
                border:`2px solid ${isOk ? '#6bcb77' : isSel ? col.border : 'rgba(255,255,255,0.07)'}`,
                cursor: disabled ? 'default' : 'pointer',
              }}>
              <span className="answer-letter"
                style={{ background: isOk ? '#6bcb77' : isSel ? col.border : 'rgba(255,255,255,0.08)',
                  color: isOk || isSel ? '#0a0a14' : col.border, fontFamily:'Syne,sans-serif', fontWeight:800 }}>
                {LABELS[i]}
              </span>
              <span style={{ color: isOk ? '#6bcb77' : isSel ? '#f0f0f8' : '#c8c8d8',
                fontFamily:'Nunito,sans-serif', fontWeight: isSel || isOk ? 700 : 500, fontSize:'0.97rem' }}>
                {ans}{isOk && ' ✓'}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function ActionBtn({ children, onClick, gradient, shadow, dark = false }: {
  children: React.ReactNode; onClick: () => void; gradient: string; shadow: string; dark?: boolean;
}) {
  return (
    <button onClick={onClick}
      style={{ background:gradient, border:'none', cursor:'pointer', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem',
        color: dark ? '#0a0a14' : 'white', padding:'14px 52px', borderRadius:'100px', transition:'all 0.3s', boxShadow:`0 8px 24px ${shadow}` }}
      onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.transform='translateY(-3px) scale(1.03)'; el.style.boxShadow=`0 14px 36px ${shadow}`; }}
      onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.transform=''; el.style.boxShadow=`0 8px 24px ${shadow}`; }}>
      {children}
    </button>
  );
}
