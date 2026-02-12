'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Question, Difficulty } from '@/hooks/useQuizSession';

interface CategoryColor { bg: string; light: string; text: string; icon: string; }

interface Props {
  question: Question;
  category: string;
  difficulty: Difficulty;
  categoryColor: CategoryColor;
  /** Seconds already elapsed if recovering a session mid-timer */
  recoveredTimeLeft: number | null;
  remaining: number | null;
  totalInPool: number | null;
  onTimerStart: (duration: number) => void;
  onFinished: () => void;
}

type ModalState = 'ready' | 'countdown' | 'reveal_answer' | 'answer_shown';

const DIFF_COLORS = {
  Receh:  { bg:'#6bcb77', glow:'rgba(107,203,119,0.3)', label:'😄 Receh'  },
  Sedang: { bg:'#ffd93d', glow:'rgba(255,217,61,0.3)',  label:'🤔 Sedang' },
  Sulit:  { bg:'#ff6b6b', glow:'rgba(255,107,107,0.3)', label:'🔥 Sulit'  },
};
const ANSWER_LABELS = ['A','B','C','D'];
const ANSWER_COLORS = [
  { bg:'rgba(77,150,255,0.12)',  border:'rgba(77,150,255,0.4)',  text:'#4d96ff', hover:'rgba(77,150,255,0.2)'  },
  { bg:'rgba(199,125,255,0.12)', border:'rgba(199,125,255,0.4)', text:'#c77dff', hover:'rgba(199,125,255,0.2)' },
  { bg:'rgba(255,154,60,0.12)',  border:'rgba(255,154,60,0.4)',  text:'#ff9a3c', hover:'rgba(255,154,60,0.2)'  },
  { bg:'rgba(107,203,119,0.12)', border:'rgba(107,203,119,0.4)', text:'#6bcb77', hover:'rgba(107,203,119,0.2)' },
];

export default function QuestionModal({
  question, category, difficulty, categoryColor,
  recoveredTimeLeft, remaining, totalInPool,
  onTimerStart, onFinished,
}: Props) {

  // If recovering mid-timer, jump straight into countdown
  const isRecovery = recoveredTimeLeft !== null;
  const initialState: ModalState = isRecovery
    ? (recoveredTimeLeft! <= 0 ? 'reveal_answer' : 'countdown')
    : 'ready';

  const [modalState, setModalState] = useState<ModalState>(initialState);
  const [timeLeft, setTimeLeft]     = useState(
    isRecovery ? Math.max(0, recoveredTimeLeft!) : question.waktu
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const answers = [question.pg_a, question.pg_b, question.pg_c, question.pg_d];
  const diffColor = DIFF_COLORS[difficulty];
  const correctLetter = question.jawaban.split('.')[0].trim();
  const correctIndex = ANSWER_LABELS.indexOf(correctLetter);

  // Auto-start timer if recovering
  useEffect(() => {
    if (isRecovery && recoveredTimeLeft! > 0) {
      startCountdown(recoveredTimeLeft!);
    } else if (isRecovery && recoveredTimeLeft! <= 0) {
      setModalState('reveal_answer');
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCountdown(startFrom: number) {
    setModalState('countdown');
    setTimeLeft(startFrom);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setModalState('reveal_answer');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const startTimer = useCallback(() => {
    onTimerStart(question.waktu);   // persist to JWT
    startCountdown(question.waktu);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.waktu, onTimerStart]);

  const handleShowAnswer = useCallback(() => setModalState('answer_shown'), []);

  // Timer ring
  const totalTime = question.waktu;
  const progress  = timeLeft / totalTime;
  const circ      = 2 * Math.PI * 44;
  const dash      = circ * (1 - progress);
  const isUrgent  = timeLeft <= 5 && timeLeft > 0;
  const timerColor = timeLeft > totalTime * 0.5 ? '#6bcb77'
                   : timeLeft > totalTime * 0.25 ? '#ffd93d'
                   : '#ff6b6b';

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background:categoryColor.light, color:categoryColor.text, fontFamily:'Syne,sans-serif', letterSpacing:'0.05em' }}>
              {categoryColor.icon} {category}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background:`${diffColor.bg}22`, color:diffColor.bg, fontFamily:'Syne,sans-serif', letterSpacing:'0.05em' }}>
              {diffColor.label}
            </span>
            {isRecovery && (
              <span className="px-3 py-1 rounded-full text-xs"
                style={{ background:'rgba(77,150,255,0.1)', color:'#4d96ff', fontFamily:'Space Mono,monospace', border:'1px solid rgba(77,150,255,0.3)' }}>
                🔄 Dipulihkan
              </span>
            )}
          </div>
          {/* Pool progress */}
          {remaining !== null && totalInPool !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#9898b8', fontFamily:'Space Mono,monospace' }}>
              📚 {totalInPool - remaining}/{totalInPool} soal
            </div>
          )}
        </div>

        {/* ── Question ── */}
        <div className="rounded-2xl p-5 mb-5"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs mb-2"
            style={{ color:'#9898b8', fontFamily:'Nunito,sans-serif', textTransform:'uppercase', letterSpacing:'0.1em' }}>
            Pertanyaan
          </p>
          <p style={{ color:'#f0f0f8', fontSize:'1.1rem', fontFamily:'Nunito,sans-serif', fontWeight:700, lineHeight:1.6 }}>
            {question.soal}
          </p>
        </div>

        {/* ── Answers ── */}
        <div className="flex flex-col gap-3 mb-6">
          {answers.map((ans, i) => {
            const col = ANSWER_COLORS[i];
            const isSel = selectedAnswer === ANSWER_LABELS[i];
            const isCorrect = modalState === 'answer_shown' && i === correctIndex;
            return (
              <button key={i} className="answer-choice"
                disabled={modalState !== 'countdown'}
                onClick={() => setSelectedAnswer(ANSWER_LABELS[i])}
                style={{
                  background: isCorrect ? 'rgba(107,203,119,0.15)' : isSel ? col.hover : col.bg,
                  border: `2px solid ${isCorrect ? '#6bcb77' : isSel ? col.border : 'rgba(255,255,255,0.08)'}`,
                  cursor: modalState === 'countdown' ? 'pointer' : 'default',
                }}>
                <span className="answer-letter"
                  style={{ background: isCorrect ? '#6bcb77' : isSel ? col.text : 'rgba(255,255,255,0.1)', color: isCorrect || isSel ? '#0a0a14' : col.text, fontFamily:'Syne,sans-serif' }}>
                  {ANSWER_LABELS[i]}
                </span>
                <span style={{ color: isCorrect ? '#6bcb77' : isSel ? '#f0f0f8' : '#c8c8d8', fontFamily:'Nunito,sans-serif', fontWeight: isSel || isCorrect ? 700 : 500, fontSize:'0.975rem' }}>
                  {ans}{isCorrect && ' ✓'}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Bottom action area ── */}

        {modalState === 'ready' && (
          <div className="flex flex-col items-center gap-3">
            <p style={{ color:'#9898b8', textAlign:'center', fontFamily:'Nunito,sans-serif' }}>
              Klik <strong style={{ color:'#f0f0f8' }}>Mulai</strong> untuk memulai hitung mundur
            </p>
            <ActionButton onClick={startTimer} gradient="linear-gradient(135deg,#4d96ff,#c77dff)" shadow="rgba(77,150,255,0.35)">
              ▶ Mulai!
            </ActionButton>
          </div>
        )}

        {modalState === 'countdown' && (
          <div className="flex items-center justify-between px-2">
            <div>
              <p style={{ color:'#9898b8', fontSize:'0.85rem', fontFamily:'Nunito,sans-serif', marginBottom:4 }}>Waktu tersisa</p>
              <p style={{ color:timerColor, fontFamily:'Space Mono,monospace', fontWeight:700, fontSize:'1.75rem' }}>{timeLeft}s</p>
            </div>
            <div className={isUrgent ? 'timer-warning' : ''}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8"/>
                <circle cx="50" cy="50" r="44" fill="none" stroke={timerColor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={dash}
                  style={{ transformOrigin:'50px 50px', transform:'rotate(-90deg)', transition:'stroke-dashoffset 1s linear, stroke 0.5s ease', filter:`drop-shadow(0 0 6px ${timerColor})` }}/>
                <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill={timerColor} fontSize="22" fontFamily="Space Mono,monospace" fontWeight="700">{timeLeft}</text>
              </svg>
            </div>
            <div style={{ width:80 }}/>
          </div>
        )}

        {modalState === 'reveal_answer' && (
          <div className="flex flex-col items-center gap-4 answer-reveal">
            <div className="w-full rounded-2xl p-4 text-center"
              style={{ background:'rgba(255,107,107,0.1)', border:'1px solid rgba(255,107,107,0.3)' }}>
              <p style={{ fontSize:'1.75rem', marginBottom:6 }}>⏰</p>
              <p style={{ color:'#ff6b6b', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1.1rem' }}>Waktu Habis!</p>
              <p style={{ color:'#9898b8', fontSize:'0.85rem', fontFamily:'Nunito,sans-serif', marginTop:4 }}>Klik tombol di bawah untuk melihat jawaban</p>
            </div>
            <ActionButton onClick={handleShowAnswer} gradient="linear-gradient(135deg,#ffd93d,#ff9a3c)" shadow="rgba(255,217,61,0.35)" dark>
              💡 Tampilkan Jawaban
            </ActionButton>
          </div>
        )}

        {modalState === 'answer_shown' && (
          <div className="flex flex-col items-center gap-5 answer-reveal">
            <div className="w-full rounded-2xl p-5 text-center"
              style={{ background:'rgba(107,203,119,0.1)', border:'2px solid rgba(107,203,119,0.4)' }}>
              <p style={{ color:'#6bcb77', fontSize:'0.85rem', fontFamily:'Nunito,sans-serif', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>✅ Jawaban Benar</p>
              <p style={{ color:'#f0f0f8', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.25rem' }}>{question.jawaban}</p>
            </div>
            {/* Show remaining soal info */}
            {remaining !== null && remaining > 0 && (
              <p style={{ color:'#9898b8', fontSize:'0.8rem', fontFamily:'Space Mono,monospace' }}>
                {remaining} soal tersisa pada kategori ini
              </p>
            )}
            {remaining === 0 && (
              <p style={{ color:'#ffd93d', fontSize:'0.8rem', fontFamily:'Space Mono,monospace' }}>
                🎉 Semua soal sudah dipakai! Akan di-reset otomatis saat berikutnya.
              </p>
            )}
            <ActionButton onClick={onFinished} gradient="linear-gradient(135deg,#4d96ff,#c77dff)" shadow="rgba(77,150,255,0.35)">
              🎉 Selesai!
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, gradient, shadow, dark = false }: {
  children: React.ReactNode; onClick: () => void;
  gradient: string; shadow: string; dark?: boolean;
}) {
  return (
    <button onClick={onClick}
      style={{ background:gradient, border:'none', cursor:'pointer', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', color: dark ? '#0a0a14' : 'white', padding:'14px 48px', borderRadius:'100px', width:'100%', maxWidth:320, transition:'all 0.3s', boxShadow:`0 8px 24px ${shadow}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px) scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow=`0 14px 32px ${shadow}`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow=`0 8px 24px ${shadow}`; }}>
      {children}
    </button>
  );
}
