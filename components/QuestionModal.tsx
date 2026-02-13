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

export default function QuestionModal({
  question, category, difficulty, categoryColor,
  recoveredTimeLeft, remaining,
  onTimerStart, onFinished,
}: Props) {
  const isRecovery = recoveredTimeLeft !== null;
  const isIsi      = question.tipe?.toLowerCase().includes('isian') ?? false;

  const initPhase: Phase = isRecovery
    ? (recoveredTimeLeft! <= 0 ? 'timeout' : 'running')
    : 'ready';

  const [phase, setPhase]         = useState<Phase>(initPhase);
  const [timeLeft, setTimeLeft]   = useState(isRecovery ? Math.max(0, recoveredTimeLeft!) : question.waktu);
  const [selectedMC, setSelectedMC] = useState<number | null>(null); // multiple-choice selection
  const [isiAnswer, setIsiAnswer]   = useState('');                  // isian typed answer
  const ivRef = useRef<NodeJS.Timeout | null>(null);

  // For pilihan ganda
  const correctLetter = typeof question.jawaban === 'string'
    ? question.jawaban.split('.')[0].trim()
    : '';
  const correctIdx = LABELS.indexOf(correctLetter);
  const answers    = [question.pg_a, question.pg_b, question.pg_c, question.pg_d];
  const ds         = DIFF_STYLE[difficulty];

  // Displayed jawaban (for answer reveal)
  const jawabanDisplay = String(question.jawaban ?? '');

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
  const total     = question.waktu;
  const pct       = timeLeft / total;
  const circ      = 2 * Math.PI * 48;
  const dash      = circ * (1 - pct);
  const urgent    = timeLeft <= 5 && timeLeft > 0;
  const ringColor = pct > 0.5 ? '#6bcb77' : pct > 0.25 ? '#ffd93d' : '#ff6b6b';

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>

        {/* ── Header badges ── */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background:categoryColor.light, color:categoryColor.text, fontFamily:'Poppins,sans-serif', letterSpacing:'0.04em' }}>
            {categoryColor.icon} {category}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background:`${ds.color}22`, color:ds.color, fontFamily:'Poppins,sans-serif', letterSpacing:'0.04em' }}>
            {ds.label}
          </span>
          {/* Soal type badge */}
          <span className="px-3 py-1 rounded-full text-xs"
            style={{ background: isIsi ? 'rgba(255,154,60,0.12)' : 'rgba(77,150,255,0.1)', color: isIsi ? '#ff9a3c' : '#4d96ff', fontFamily:'Space Mono,monospace', border:`1px solid ${isIsi ? 'rgba(255,154,60,0.3)' : 'rgba(77,150,255,0.25)'}` }}>
            {isIsi ? '✏️ Isian' : '📋 Pilihan Ganda'}
          </span>
          {isRecovery && (
            <span className="px-3 py-1 rounded-full text-xs"
              style={{ background:'rgba(77,150,255,0.1)', color:'#4d96ff', fontFamily:'Space Mono,monospace', border:'1px solid rgba(77,150,255,0.3)' }}>
              🔄 Dipulihkan
            </span>
          )}
        </div>

        {/* ═══ READY ═══ */}
        {phase === 'ready' && (
          <>
            <QuestionBlock question={question} />
            <div style={{ height: 20 }} />

            {isIsi ? (
              /* Isian: show text input placeholder (disabled until started) */
              <IsiBlock value={isiAnswer} onChange={setIsiAnswer} disabled />
            ) : (
              /* Pilihan Ganda: show choices (disabled until started) */
              <ChoicesBlock answers={answers} selected={null} correctIdx={-1} disabled />
            )}
            <div style={{ height: 20 }} />

            {/* Time preview */}
            <TimePill seconds={question.waktu} />
            <div style={{ height: 24 }} />

            <div className="flex justify-center">
              <ActionBtn onClick={handleStart} gradient="linear-gradient(135deg,#4d96ff,#c77dff)" shadow="rgba(77,150,255,0.4)">
                ▶&nbsp; Mulai!
              </ActionBtn>
            </div>
          </>
        )}

        {/* ═══ RUNNING ═══ */}
        {phase === 'running' && (
          <>
            <QuestionBlock question={question} />
            <div style={{ height: 18 }} />

            {isIsi ? (
              <IsiBlock value={isiAnswer} onChange={setIsiAnswer} />
            ) : (
              <ChoicesBlock answers={answers} selected={selectedMC} correctIdx={-1}
                onSelect={i => setSelectedMC(i)} />
            )}
            <div style={{ height: 20 }} />

            {/* Timer row */}
            <div className={`flex items-center justify-between ${urgent ? 'timer-warning' : ''}`}>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <p style={{ color:'#9898b8', fontSize:'0.8rem', fontFamily:'Nunito,sans-serif' }}>Waktu tersisa</p>
                <p style={{ color:ringColor, fontFamily:'Space Mono,monospace', fontWeight:700, fontSize:'2.2rem', lineHeight:1 }}>
                  {timeLeft}<span style={{ fontSize:'1rem', marginLeft:2 }}>s</span>
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
              <div style={{ width: 80 }} />
            </div>
          </>
        )}

        {/* ═══ TIMEOUT ═══ */}
        {phase === 'timeout' && (
          <div className="flex flex-col items-center py-8 answer-reveal" style={{ gap:24 }}>
            <div style={{ fontSize:'5rem', lineHeight:1 }}>⏰</div>
            <div className="text-center" style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <p style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:'2rem', color:'#ff6b6b' }}>
                WAKTU HABIS!
              </p>
              <p style={{ color:'#9898b8', fontFamily:'Nunito,sans-serif', fontSize:'0.95rem' }}>
                Klik tombol di bawah untuk melihat jawaban yang benar
              </p>
            </div>
            <ActionBtn onClick={() => setPhase('answer')} gradient="linear-gradient(135deg,#ffd93d,#ff9a3c)" shadow="rgba(255,217,61,0.4)" dark>
              💡&nbsp; Tampilkan Jawaban
            </ActionBtn>
          </div>
        )}

        {/* ═══ ANSWER — question text + correct answer box only, no choices ═══ */}
        {phase === 'answer' && (
          <div className="flex flex-col answer-reveal" style={{ gap:20 }}>
            <QuestionBlock question={question} />

            {/* Show what user typed for Isian */}
            {isIsi && isiAnswer.trim() && (
              <div className="rounded-xl p-4"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color:'#9898b8', fontSize:'0.72rem', fontFamily:'Nunito,sans-serif', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>
                  Jawaban kamu
                </p>
                <p style={{ color:'#f0f0f8', fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:'1rem' }}>
                  {isiAnswer}
                </p>
              </div>
            )}

            {/* Correct answer */}
            <div className="rounded-2xl p-5 text-center"
              style={{ background:'rgba(107,203,119,0.1)', border:'2px solid rgba(107,203,119,0.45)' }}>
              <p style={{ color:'#6bcb77', fontSize:'0.75rem', fontFamily:'Nunito,sans-serif',
                textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:10 }}>
                ✅ Jawaban Benar
              </p>
              <p style={{ color:'#f0f0f8', fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:'1.25rem', lineHeight:1.4 }}>
                {jawabanDisplay}
              </p>
            </div>

            {/* {remaining === 0 && (
              <p style={{ color:'#ffd93d', fontSize:'0.8rem', fontFamily:'Space Mono,monospace', textAlign:'center' }}>
                🎉 Semua soal pada kategori ini sudah dipakai — akan di-reset otomatis.
              </p>
            )} */}

            <div className="flex justify-center" style={{ paddingTop:4 }}>
              <ActionBtn onClick={onFinished} gradient="linear-gradient(135deg,#4d96ff,#c77dff)" shadow="rgba(77,150,255,0.4)">
                🎉&nbsp; Selesai!
              </ActionBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Question text ── */
function QuestionBlock({ question }: { question: Question }) {
  return (
    <div className="rounded-2xl p-5"
      style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
      <p style={{ color:'#9898b8', fontFamily:'Nunito,sans-serif', fontSize:'0.72rem',
        textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:10 }}>Soal</p>
      <p style={{ color:'#f0f0f8', fontSize:'1.05rem', fontFamily:'Nunito,sans-serif',
        fontWeight:700, lineHeight:1.7 }}>{question.soal}</p>
    </div>
  );
}

/* ── Pilihan Ganda choices ── */
function ChoicesBlock({ answers, selected, correctIdx, onSelect, disabled = false }: {
  answers: string[]; selected: number | null;
  correctIdx: number; onSelect?: (i: number) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col" style={{ gap:10 }}>
      {answers.map((ans, i) => {
        const col = ANS_COLORS[i];
        const isSel = selected === i;
        const isOk  = correctIdx === i;
        return (
          <button key={i} disabled={disabled} onClick={() => onSelect?.(i)}
            className="answer-choice"
            style={{
              background: isOk ? 'rgba(107,203,119,0.15)' : isSel ? col.active : col.base,
              border:`2px solid ${isOk ? '#6bcb77' : isSel ? col.border : 'rgba(255,255,255,0.07)'}`,
              cursor: disabled ? 'default' : 'pointer',
            }}>
            <span className="answer-letter" style={{ color: isOk ? '#6bcb77' : isSel ? '#4d96ff' : 'rgba(255,255,255,0.8)' }}>
              {LABELS[i]}
            </span>
            <span style={{ color: isOk ? '#6bcb77' : isSel ? '#ffffff' : '#f0f0f8',
              fontFamily:'Nunito,sans-serif', fontWeight: isSel || isOk ? 700 : 500, fontSize:'0.97rem', lineHeight:1.5 }}>
              {ans}{isOk && ' ✓'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Isian text input ── */
function IsiBlock({ value, onChange, disabled = false }: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <label style={{ color:'#9898b8', fontFamily:'Nunito,sans-serif', fontSize:'0.82rem', textTransform:'uppercase', letterSpacing:'0.1em' }}>
        Jawaban kamu
      </label>
      <textarea
        disabled={disabled}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={disabled ? 'Klik Mulai untuk menjawab...' : 'Ketik jawabanmu di sini...'}
        rows={3}
        style={{
          width: '100%',
          background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(77,150,255,0.35)'}`,
          borderRadius: 14,
          padding: '14px 18px',
          color: disabled ? '#666' : '#f0f0f8',
          fontFamily: 'Nunito,sans-serif',
          fontWeight: 600,
          fontSize: '1rem',
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => { if (!disabled) (e.target as HTMLTextAreaElement).style.borderColor='rgba(77,150,255,0.7)'; }}
        onBlur={e  => { if (!disabled) (e.target as HTMLTextAreaElement).style.borderColor='rgba(77,150,255,0.35)'; }}
      />
    </div>
  );
}

/* ── Time preview pill ── */
function TimePill({ seconds }: { seconds: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3 rounded-xl"
      style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="#9898b8" strokeWidth="1.5"/>
        <path d="M10 5.5V10.5L13 13" stroke="#9898b8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span style={{ fontFamily:'Space Mono,monospace', color:'#f0f0f8', fontWeight:700, fontSize:'1.05rem' }}>
        {seconds} detik
      </span>
    </div>
  );
}

/* ── Reusable action button ── */
function ActionBtn({ children, onClick, gradient, shadow, dark = false }: {
  children: React.ReactNode; onClick: () => void;
  gradient: string; shadow: string; dark?: boolean;
}) {
  return (
    <button onClick={onClick}
      style={{ background:gradient, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:'1.05rem',
        color: dark ? '#0a0a14' : 'white', padding:'14px 52px', borderRadius:'100px',
        transition:'all 0.3s', boxShadow:`0 8px 24px ${shadow}` }}
      onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.transform='translateY(-3px) scale(1.03)'; el.style.boxShadow=`0 14px 36px ${shadow}`; }}
      onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.transform=''; el.style.boxShadow=`0 8px 24px ${shadow}`; }}>
      {children}
    </button>
  );
}
