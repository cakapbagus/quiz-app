'use client';
import { useState, useRef, useCallback } from 'react';
import { Difficulty } from './QuizApp';

// Extend Window to include Safari's prefixed AudioContext
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

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
  poolSizes?: Record<string, Record<string, number>>;
}

// ── Web Audio roulette sound ─────────────────────────────────────────────────
function useSpinSound() {
  const ctxRef  = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext!)();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((durationMs: number) => {
    try {
      const ctx  = getCtx();
      const stop: (() => void)[] = [];
      const end  = ctx.currentTime + durationMs / 1000;

      // Tick interval starts fast, slows to a stop (roulette physics)
      let t = ctx.currentTime + 0.04;
      let interval = 0.055; // initial fast tick
      const slowdown = 1.028;

      while (t < end) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Alternating clack tones
        osc.frequency.value = t % 0.3 < 0.15 ? 420 : 370;
        osc.type = 'triangle';

        const vol = Math.max(0.03, 0.18 * (1 - (t - ctx.currentTime) / (durationMs / 1000)));
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.008);
        gain.gain.linearRampToValueAtTime(0, t + 0.03);

        osc.start(t);
        osc.stop(t + 0.04);
        stop.push(() => { try { osc.disconnect(); } catch {} });

        t += interval;
        interval *= slowdown;
        if (interval > 1.2) break;
      }

      // Final "clunk" when wheel stops
      const clunk = ctx.createOscillator();
      const clunkG = ctx.createGain();
      clunk.connect(clunkG);
      clunkG.connect(ctx.destination);
      clunk.frequency.value = 200;
      clunk.type = 'sine';
      clunkG.gain.setValueAtTime(0.3, end - 0.05);
      clunkG.gain.linearRampToValueAtTime(0, end + 0.25);
      clunk.start(end - 0.05);
      clunk.stop(end + 0.3);

      stopRef.current = () => stop.forEach(fn => fn());
    } catch (e) {
      // Audio not available — silently skip
    }
  }, [getCtx]);

  const stop = useCallback(() => { stopRef.current?.(); }, []);

  return { play, stop };
}

export default function SpinWheel({
  onDifficultySelected,
  usedQuestions = {},
  difficultyTimes = {},
  poolSizes = {},
}: Props) {
  const [rotation, setRotation]       = useState(0);
  const [isSpinning, setIsSpinning]   = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const rotRef = useRef(0);
  const { play: playSound, stop: stopSound } = useSpinSound();

  // Check if a category still has available questions
  const categoryHasQuestions = useCallback((cat: string) => {
    const catPool = poolSizes[cat];
    if (!catPool) return true; // unknown pool → assume available
    return DIFFS.some(d => {
      const total = catPool[d.key] ?? 0;
      const used  = usedQuestions[cat]?.[d.key]?.length ?? 0;
      return total === 0 || used < total; // 0 means no data yet
    });
  }, [poolSizes, usedQuestions]);

  /* ── Spin — only land on categories that have available questions ── */
  const spin = useCallback(() => {
    if (isSpinning) return;

    // Build list of eligible category indices
    const eligible = CATEGORIES.map((cat, i) => ({ cat, i }))
      .filter(({ cat }) => categoryHasQuestions(cat))
      .map(({ i }) => i);

    const pool = eligible.length > 0 ? eligible : CATEGORIES.map((_, i) => i);

    setIsSpinning(true);
    setSelectedIdx(null);

    const seg     = 360 / CATEGORIES.length;
    const winner  = pool[Math.floor(Math.random() * pool.length)];
    const extra   = (5 + Math.floor(Math.random() * 4)) * 360;
    const target  = 360 - (winner * seg + seg / 2);
    const total   = rotRef.current + extra + target - (rotRef.current % 360);
    rotRef.current = total;
    setRotation(total);

    playSound(4200);

    setTimeout(() => {
      stopSound();
      setIsSpinning(false);
      setSelectedIdx(winner);
    }, 4200);
  }, [isSpinning, categoryHasQuestions, playSound, stopSound]);

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
    return `M${C},${C} L${C+R*Math.cos(a0)},${C+R*Math.sin(a0)} A${R},${R},0,0,1,${C+R*Math.cos(a1)},${C+R*Math.sin(a1)} Z`;
  };

  const textPos = (i: number, rFrac: number) => {
    const a = i * segAngle - Math.PI / 2 + segAngle / 2;
    return { x: C + R * rFrac * Math.cos(a), y: C + R * rFrac * Math.sin(a), rot: (i * 360 / CATEGORIES.length) + (180 / CATEGORIES.length) };
  };

  const selCat   = selectedIdx !== null ? CATEGORIES[selectedIdx] : null;
  const selColor = selectedIdx !== null ? SEG_COLORS[selectedIdx] : null;

  return (
    <div className="flex flex-col items-center w-full" style={{ maxWidth: 700, gap: 0, paddingBottom: 32 }}>

      {/* ── Title ── */}
      <div className="text-center mb-8">
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: 'clamp(1.8rem,5vw,2.8rem)', lineHeight: 1.15, color: '#f0f0f8' }}>
          <span>Olimpiade KODEIN</span>
          <br />
          <span style={{ background: 'linear-gradient(90deg,#4d96ff,#c77dff,#ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Putar Roda!</span>
        </h1>
        <p style={{ color: '#9898b8', marginTop: 8, fontFamily: 'Nunito,sans-serif', fontSize: '0.95rem' }}>
          Klik tombol ⚙️ di tengah roda untuk memutar
        </p>
      </div>

      {/* ── Wheel container ── */}
      <div className="relative flex items-center justify-center w-full"
        style={{ maxWidth: 520, aspectRatio: '1', margin: '0 auto' }}>

        {/* Glow */}
        <div className="absolute inset-0 rounded-full pointer-events-none" style={{
          boxShadow: isSpinning
            ? '0 0 70px rgba(77,150,255,0.55), 0 0 140px rgba(199,125,255,0.25)'
            : selColor
            ? `0 0 50px ${selColor[0]}44, 0 0 100px ${selColor[0]}18`
            : '0 0 30px rgba(77,150,255,0.18)',
          borderRadius: '50%',
          transition: 'box-shadow 0.8s ease',
        }} />

        {/* ── Arrow pointer — points INTO the wheel from top ── */}
        <div className="absolute z-20" style={{ top: -4, left: '50%', transform: 'translateX(-50%)' }}>
          <svg width="36" height="48" viewBox="0 0 36 48" style={{ filter: 'drop-shadow(0 0 8px #ffd93d)' }}>
            {/* Arrow pointing DOWN into the wheel */}
            <polygon points="18,42 4,8 18,18 32,8" fill="#ffd93d" stroke="#0a0a14" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Wheel SVG */}
        <svg width="100%" height="100%" viewBox={`0 0 ${S} ${S}`} style={{ display: 'block', borderRadius: '50%' }}>
          <defs>
            {SEG_COLORS.map(([c1, c2], i) => (
              <radialGradient key={i} id={`g${i}`} cx="35%" cy="35%" r="75%">
                <stop offset="0%" stopColor={c1} />
                <stop offset="100%" stopColor={c2} />
              </radialGradient>
            ))}
            <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.7)" />
            </filter>
          </defs>

          <g style={{
            transformOrigin: `${C}px ${C}px`,
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4.2s cubic-bezier(0.15,0.6,0.1,1)' : 'none',
          }}>
            {CATEGORIES.map((_, i) => (
              <path key={i} d={segPath(i)} fill={`url(#g${i})`} stroke="#0a0a14" strokeWidth="3" />
            ))}

            {CAT_ICONS.map((icon, i) => {
              const p = textPos(i, 0.82);
              return (
                <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="20" transform={`rotate(${p.rot},${p.x},${p.y})`}>{icon}</text>
              );
            })}

            {CATEGORIES.map((cat, i) => {
              const p     = textPos(i, 0.57);
              const words = cat.split(' ');
              return (
                <g key={i} transform={`rotate(${p.rot},${p.x},${p.y})`} filter="url(#textShadow)">
                  {words.length === 1 ? (
                    <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize="16" fontFamily="Poppins,sans-serif" fontWeight="600">{cat}</text>
                  ) : (
                    <>
                      <text x={p.x} y={p.y - 7} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize="14" fontFamily="Poppins,sans-serif" fontWeight="600">{words[0]}</text>
                      <text x={p.x} y={p.y + 8} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize="14" fontFamily="Poppins,sans-serif" fontWeight="600">{words.slice(1).join(' ')}</text>
                    </>
                  )}
                </g>
              );
            })}

            <circle cx={C} cy={C} r="54" fill="#0a0a14" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
          </g>
          <circle cx={C} cy={C} r={R + 4} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        </svg>

        {/* ── Centre SPIN button ── */}
        <button
          onClick={spin}
          disabled={isSpinning}
          className="absolute flex flex-col items-center justify-center"
          style={{
            width: 100, height: 100, borderRadius: '50%',
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
          <span style={{ fontSize: 30, display:'inline-block', animation: isSpinning ? 'spinIcon 0.6s linear infinite' : 'none' }}>⚙️</span>
          <span style={{ color: isSpinning ? '#9898b8' : 'white', fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:'0.6rem', marginTop:2, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            {isSpinning ? '' : 'PUTAR!'}
          </span>
        </button>
      </div>

      {/* ── Result: category + difficulty buttons ── */}
      {!isSpinning && selectedIdx !== null && selCat && selColor && (
        <div className="flex flex-col items-center w-full mt-10"
          style={{ gap: 20, animation: 'resultReveal 0.45s cubic-bezier(0.34,1.56,0.64,1)' }}>

          {/* Category banner */}
          <div className="flex items-center gap-4 px-7 py-4 rounded-2xl"
            style={{ background:`${selColor[0]}16`, border:`2px solid ${selColor[0]}44`, width:'100%', maxWidth:500, justifyContent:'center' }}>
            <span style={{ fontSize: '2.4rem' }}>{CAT_ICONS[selectedIdx]}</span>
            <div>
              <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:'clamp(1.2rem,4vw,1.6rem)', color:selColor[0], lineHeight:1.2 }}>
                {selCat}
              </div>
              {Object.values(usedQuestions[selCat] ?? {}).flat().length > 0 && (
                <div style={{ fontSize:'0.7rem', fontFamily:'Space Mono,monospace', color:selColor[0], opacity:0.65, marginTop:3 }}>
                  ✓ {Object.values(usedQuestions[selCat] ?? {}).flat().length} soal sudah terpakai
                </div>
              )}
            </div>
          </div>

          {/* Difficulty label */}
          <p style={{ color:'#9898b8', fontFamily:'Nunito,sans-serif', fontSize:'0.95rem' }}>
            Pilih tingkat kesulitan:
          </p>

          {/* 3 Difficulty buttons */}
          <div className="grid grid-cols-3 gap-4 w-full" style={{ maxWidth: 500 }}>
            {DIFFS.map((d, di) => {
              const totalPool = poolSizes[selCat]?.[d.key] ?? 0;
              const used      = usedQuestions[selCat]?.[d.key]?.length ?? 0;
              const exhausted = totalPool > 0 && used >= totalPool;
              const noPool    = totalPool === 0 && Object.keys(poolSizes).length > 0;
              const disabled  = exhausted || noPool;

              return (
                <button key={d.key} disabled={disabled} onClick={() => pickDiff(d.key)}
                  className="flex flex-col items-center py-5 px-3 rounded-2xl"
                  style={{
                    gap: 10,
                    background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${disabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.4 : 1,
                    transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    animation: `fadeInUp 0.4s ease ${di * 0.08}s both`,
                  }}
                  onMouseEnter={e => {
                    if (disabled) return;
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(-6px) scale(1.05)';
                    el.style.background = 'rgba(255,255,255,0.09)';
                    el.style.boxShadow  = `0 16px 40px ${d.glow}44`;
                    el.style.borderColor = `${d.glow}88`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = '';
                    el.style.background = disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)';
                    el.style.boxShadow  = '';
                    el.style.borderColor = disabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
                  }}
                >
                  {/* Emoji — no background wrapper */}
                  <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{d.emoji}</span>
                  <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:'1rem', color: disabled ? '#555' : '#f0f0f8' }}>
                    {d.label}
                  </span>
                  {disabled && (
                    <span style={{ fontSize:'0.6rem', color:'#555', fontFamily:'Space Mono,monospace', textAlign:'center' }}>
                      {noPool ? 'Tidak ada soal' : 'Semua terpakai'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes resultReveal { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes fadeInUp     { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes spinIcon     { from{transform:rotate(0)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
