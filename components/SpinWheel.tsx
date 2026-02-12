'use client';
import { useState, useRef, useCallback } from 'react';
import { Difficulty } from '@/hooks/useQuizSession';

const CATEGORIES   = ['Bahasa Indonesia', 'English', 'Matematika', 'PAI', 'IT', 'IPA'];
const CAT_ICONS    = ['📝', '🌍', '🔢', '🕌', '💻', '🔬'];
const SEG_COLORS   = [
  ['#ff6b6b', '#e84040'],
  ['#4d96ff', '#1a75f0'],
  ['#ffd93d', '#f0bb00'],
  ['#6bcb77', '#3aaa48'],
  ['#c77dff', '#a84eed'],
  ['#ff9a3c', '#e87a10'],
];

const DIFFS: { key: Difficulty; emoji: string; label: string; gradient: string; glow: string }[] = [
  { key: 'Receh',  emoji: '😄', label: 'Receh',  gradient: 'linear-gradient(135deg,#6bcb77,#3aaa48)', glow: '#6bcb77' },
  { key: 'Sedang', emoji: '🤔', label: 'Sedang', gradient: 'linear-gradient(135deg,#ffd93d,#f0a800)', glow: '#ffd93d' },
  { key: 'Sulit',  emoji: '🔥', label: 'Sulit',  gradient: 'linear-gradient(135deg,#ff6b6b,#e02020)', glow: '#ff6b6b' },
];

interface Props {
  onDifficultySelected: (category: string, difficulty: Difficulty) => void;
  usedQuestions?: Record<string, Record<string, number[]>>;
  difficultyTimes?: Record<string, Record<string, number>>;
  /** poolSizes[category][difficulty] = total questions in pool */
  poolSizes?: Record<string, Record<string, number>>;
}

export default function SpinWheel({ onDifficultySelected, usedQuestions = {}, difficultyTimes = {}, poolSizes = {} }: Props) {
  const [rotation, setRotation]   = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const rotRef = useRef(0);

  /* ── Spin ── */
  const spin = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);
    // Reset selection while spinning
    setSelectedIdx(null);

    const seg   = 360 / CATEGORIES.length;
    const winner = Math.floor(Math.random() * CATEGORIES.length);
    const extra  = (5 + Math.floor(Math.random() * 4)) * 360;
    const target = 360 - (winner * seg + seg / 2);
    const total  = rotRef.current + extra + target - (rotRef.current % 360);
    rotRef.current = total;
    setRotation(total);

    setTimeout(() => { setIsSpinning(false); setSelectedIdx(winner); }, 4200);
  }, [isSpinning]);

  /* ── Difficulty pick ── */
  const pickDiff = useCallback((diff: Difficulty) => {
    if (selectedIdx === null) return;
    onDifficultySelected(CATEGORIES[selectedIdx], diff);
  }, [selectedIdx, onDifficultySelected]);

  /* ── SVG geometry ── */
  const S = 480, C = S / 2, R = S / 2 - 8;
  const segAngle = (2 * Math.PI) / CATEGORIES.length;

  const segPath = (i: number) => {
    const a0 = i * segAngle - Math.PI / 2;
    const a1 = a0 + segAngle;
    return `M${C},${C} L${C + R * Math.cos(a0)},${C + R * Math.sin(a0)} A${R},${R},0,0,1,${C + R * Math.cos(a1)},${C + R * Math.sin(a1)} Z`;
  };

  const textPos = (i: number, rFrac: number) => {
    const a = i * segAngle - Math.PI / 2 + segAngle / 2;
    return { x: C + R * rFrac * Math.cos(a), y: C + R * rFrac * Math.sin(a), rot: (i * 360 / CATEGORIES.length) + (180 / CATEGORIES.length) };
  };

  const selCat   = selectedIdx !== null ? CATEGORIES[selectedIdx] : null;
  const selColor = selectedIdx !== null ? SEG_COLORS[selectedIdx] : null;

  return (
    <div className="flex flex-col items-center w-full" style={{ maxWidth: 700, gap: 0 }}>

      {/* ── Title ── */}
      <div className="text-center mb-6">
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem,5vw,2.8rem)', lineHeight: 1.1, color: '#f0f0f8' }}>
          <span style={{ background: 'linear-gradient(90deg,#4d96ff,#c77dff,#ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Putar Roda</span>
          {' '}Pilih Kategori!
        </h1>
      </div>

      {/* ── Wheel + centre spin button (pickerwheel style) ── */}
      <div className="relative flex items-center justify-center w-full"
        style={{ maxWidth: 520, aspectRatio: '1', margin: '0 auto' }}>

        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: isSpinning
              ? '0 0 60px rgba(77,150,255,0.5), 0 0 120px rgba(199,125,255,0.3)'
              : selColor
              ? `0 0 40px ${selColor[0]}55, 0 0 80px ${selColor[0]}22`
              : '0 0 30px rgba(77,150,255,0.2)',
            borderRadius: '50%',
            transition: 'box-shadow 0.8s ease',
          }}
        />

        {/* Top pointer */}
        <div className="absolute z-20" style={{ top: -18, left: '50%', transform: 'translateX(-50%)', filter: 'drop-shadow(0 0 8px #ffd93d)' }}>
          <svg width="32" height="42" viewBox="0 0 32 42">
            <polygon points="16,2 30,38 16,28 2,38" fill="#ffd93d" stroke="#0a0a14" strokeWidth="2.5" />
          </svg>
        </div>

        {/* The wheel SVG */}
        <svg width="100%" height="100%" viewBox={`0 0 ${S} ${S}`} style={{ display: 'block', borderRadius: '50%' }}>
          <defs>
            {SEG_COLORS.map(([c1, c2], i) => (
              <radialGradient key={i} id={`g${i}`} cx="35%" cy="35%" r="75%">
                <stop offset="0%" stopColor={c1} />
                <stop offset="100%" stopColor={c2} />
              </radialGradient>
            ))}
            <filter id="textShadow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.6)" />
            </filter>
          </defs>

          <g style={{
            transformOrigin: `${C}px ${C}px`,
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4.2s cubic-bezier(0.15,0.6,0.1,1)' : 'none',
          }}>
            {/* Segments */}
            {CATEGORIES.map((_, i) => (
              <path key={i} d={segPath(i)} fill={`url(#g${i})`} stroke="#0a0a14" strokeWidth="3" />
            ))}

            {/* Icons (outer ring) */}
            {CAT_ICONS.map((icon, i) => {
              const p = textPos(i, 0.82);
              return (
                <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="22" transform={`rotate(${p.rot},${p.x},${p.y})`}>
                  {icon}
                </text>
              );
            })}

            {/* Labels */}
            {CATEGORIES.map((cat, i) => {
              const p     = textPos(i, 0.57);
              const words = cat.split(' ');
              return (
                <g key={i} transform={`rotate(${p.rot},${p.x},${p.y})`} filter="url(#textShadow)">
                  {words.length === 1 ? (
                    <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize="13" fontFamily="Syne,sans-serif" fontWeight="800">
                      {cat}
                    </text>
                  ) : (
                    <>
                      <text x={p.x} y={p.y - 7} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize="12" fontFamily="Syne,sans-serif" fontWeight="800">
                        {words[0]}
                      </text>
                      <text x={p.x} y={p.y + 8} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize="12" fontFamily="Syne,sans-serif" fontWeight="800">
                        {words.slice(1).join(' ')}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Centre hub */}
            <circle cx={C} cy={C} r="54" fill="#0a0a14" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
          </g>

          {/* Outer decorative ring */}
          <circle cx={C} cy={C} r={R + 4} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        </svg>

        {/* ── Centre SPIN button (sits on top of hub, like pickerwheel) ── */}
        <button
          onClick={spin}
          disabled={isSpinning}
          className="absolute flex flex-col items-center justify-center"
          style={{
            width: 100, height: 100,
            borderRadius: '50%',
            background: isSpinning
              ? 'radial-gradient(circle,#2a2a48,#1a1a30)'
              : 'radial-gradient(circle,#4d96ff,#2255cc)',
            border: `4px solid ${isSpinning ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.35)'}`,
            boxShadow: isSpinning
              ? '0 0 20px rgba(77,150,255,0.2)'
              : '0 0 30px rgba(77,150,255,0.6), 0 4px 16px rgba(0,0,0,0.5)',
            cursor: isSpinning ? 'default' : 'pointer',
            transition: 'all 0.3s',
            zIndex: 30,
            transform: 'translate(-50%,-50%)',
            top: '50%', left: '50%',
          }}
          onMouseEnter={e => { if (!isSpinning) { const el = e.currentTarget as HTMLElement; el.style.transform='translate(-50%,-50%) scale(1.1)'; el.style.boxShadow='0 0 40px rgba(77,150,255,0.8), 0 4px 20px rgba(0,0,0,0.6)'; }}}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform='translate(-50%,-50%) scale(1)'; el.style.boxShadow=isSpinning?'0 0 20px rgba(77,150,255,0.2)':'0 0 30px rgba(77,150,255,0.6), 0 4px 16px rgba(0,0,0,0.5)'; }}
        >
          {isSpinning ? (
            <>
              <span style={{ fontSize: 22, animation: 'spinIcon 0.8s linear infinite' }}>⚙️</span>
              <span style={{ color: '#9898b8', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.6rem', marginTop: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Putar...</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 26 }}>🎲</span>
              <span style={{ color: 'white', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.65rem', marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>PUTAR!</span>
            </>
          )}
        </button>
      </div>

      {/* ── Result: category banner + difficulty buttons ── */}
      {!isSpinning && selectedIdx !== null && selCat && selColor && (
        <div className="flex flex-col items-center gap-5 w-full mt-8"
          style={{ animation: 'resultReveal 0.45s cubic-bezier(0.34,1.56,0.64,1)' }}>

          {/* Category banner */}
          <div className="flex items-center gap-3 px-7 py-4 rounded-2xl"
            style={{ background:`${selColor[0]}18`, border:`2px solid ${selColor[0]}55`, width:'100%', maxWidth:480, justifyContent:'center' }}>
            <span style={{ fontSize: '2.2rem' }}>{CAT_ICONS[selectedIdx]}</span>
            <div>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(1.2rem,4vw,1.6rem)', color:selColor[0] }}>
                {selCat}
              </div>
              {Object.values(usedQuestions[selCat] ?? {}).flat().length > 0 && (
                <div style={{ fontSize:'0.7rem', fontFamily:'Space Mono,monospace', color:selColor[0], opacity:0.7 }}>
                  ✓ {Object.values(usedQuestions[selCat] ?? {}).flat().length} soal sudah terpakai
                </div>
              )}
            </div>
          </div>

          {/* Difficulty buttons */}
          <p style={{ color:'#9898b8', fontFamily:'Nunito,sans-serif', fontSize:'0.95rem', textAlign:'center' }}>
            Pilih tingkat kesulitan:
          </p>
          <div className="grid grid-cols-3 gap-4 w-full" style={{ maxWidth: 480 }}>
            {DIFFS.map((d, di) => {
              const totalPool = poolSizes[selCat]?.[d.key] ?? 0;
              const used      = usedQuestions[selCat]?.[d.key]?.length ?? 0;
              // Disabled only when pool is known (>0 in poolSizes) AND all used
              const exhausted = totalPool > 0 && used >= totalPool;
              const noPool    = totalPool === 0 && Object.keys(poolSizes).length > 0;
              const disabled  = exhausted || noPool;

              return (
                <button
                  key={d.key}
                  disabled={disabled}
                  onClick={() => pickDiff(d.key)}
                  className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl relative"
                  style={{
                    background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.45 : 1,
                    transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    animation: `fadeInUp 0.4s ease ${di * 0.08}s both`,
                  }}
                  onMouseEnter={e => {
                    if (disabled) return;
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(-6px) scale(1.05)';
                    el.style.background = 'rgba(255,255,255,0.1)';
                    el.style.boxShadow  = `0 16px 40px ${d.glow}44`;
                    el.style.borderColor = `${d.glow}88`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform  = '';
                    el.style.background = disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)';
                    el.style.boxShadow  = '';
                    el.style.borderColor = disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)';
                  }}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl"
                    style={{ background: disabled ? 'rgba(255,255,255,0.05)' : d.gradient, boxShadow: disabled ? 'none' : `0 4px 14px ${d.glow}55` }}>
                    {d.emoji}
                  </div>
                  <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1rem', color: disabled ? '#666' : '#f0f0f8' }}>
                    {d.label}
                  </span>
                  {disabled && (
                    <span style={{ fontSize:'0.65rem', color:'#666', fontFamily:'Space Mono,monospace' }}>
                      {noPool ? 'Tidak ada soal' : 'Semua terpakai'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p style={{ color:'#9898b8', fontSize:'0.8rem', fontFamily:'Nunito,sans-serif', opacity:0.7 }}>
            Klik tombol putar di roda untuk spin ulang
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes resultReveal { from{opacity:0;transform:translateY(18px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes fadeInUp     { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes spinIcon     { from{transform:rotate(0)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
