'use client';
import { useState, useRef, useCallback } from 'react';
import { Difficulty } from '@/hooks/useQuizSession';

const CATEGORIES = ['Bahasa Indonesia', 'English', 'Matematika', 'PAI', 'IT', 'IPA'];
const CATEGORY_ICONS = ['📝', '🌍', '🔢', '🕌', '💻', '🔬'];
const SEGMENT_COLORS = [
  ['#ff6b6b', '#ff4444'],
  ['#4d96ff', '#2277ee'],
  ['#ffd93d', '#ffbb00'],
  ['#6bcb77', '#44aa55'],
  ['#c77dff', '#aa55ee'],
  ['#ff9a3c', '#ee7700'],
];

const DIFFICULTIES: {
  key: Difficulty;
  emoji: string;
  label: string;
  gradient: string;
  glow: string;
}[] = [
  { key: 'Receh',  emoji: '😄', label: 'Receh',  gradient: 'linear-gradient(135deg,#6bcb77,#44aa55)', glow: 'rgba(107,203,119,0.5)' },
  { key: 'Sedang', emoji: '🤔', label: 'Sedang', gradient: 'linear-gradient(135deg,#ffd93d,#ffaa00)', glow: 'rgba(255,217,61,0.5)'  },
  { key: 'Sulit',  emoji: '🔥', label: 'Sulit',  gradient: 'linear-gradient(135deg,#ff6b6b,#ee2244)', glow: 'rgba(255,107,107,0.5)' },
];

interface SpinWheelProps {
  onDifficultySelected: (category: string, difficulty: Difficulty) => void;
  usedQuestions?: Record<string, Record<string, number[]>>;
  difficultyTimes?: Record<string, Record<string, number>>;
}

export default function SpinWheel({ onDifficultySelected, usedQuestions = {}, difficultyTimes = {} }: SpinWheelProps) {
  const usedPerCategory = (cat: string) =>
    Object.values(usedQuestions[cat] ?? {}).flat().length;

  const [rotation, setRotation]       = useState(0);
  const [isSpinning, setIsSpinning]   = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult]   = useState(false);
  const currentRotationRef            = useRef(0);

  const spin = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowResult(false);
    setSelectedIndex(null);

    const numSegments  = CATEGORIES.length;
    const segmentAngle = 360 / numSegments;
    const winningIndex = Math.floor(Math.random() * numSegments);
    const extraSpins   = (4 + Math.floor(Math.random() * 4)) * 360;
    const targetAngle  = 360 - (winningIndex * segmentAngle + segmentAngle / 2);
    const totalRotation = currentRotationRef.current + extraSpins + targetAngle - (currentRotationRef.current % 360);

    currentRotationRef.current = totalRotation;
    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setSelectedIndex(winningIndex);
      setShowResult(true);
    }, 4500);
  }, [isSpinning]);

  const handleDifficulty = useCallback((difficulty: Difficulty) => {
    if (selectedIndex === null) return;
    onDifficultySelected(CATEGORIES[selectedIndex], difficulty);
  }, [selectedIndex, onDifficultySelected]);

  // SVG geometry
  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 10;
  const numSegments = CATEGORIES.length;
  const segmentAngle = (2 * Math.PI) / numSegments;

  const createSegmentPath = (index: number) => {
    const startAngle = index * segmentAngle - Math.PI / 2;
    const endAngle   = startAngle + segmentAngle;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  const getTextPosition = (index: number) => {
    const angle      = index * segmentAngle - Math.PI / 2 + segmentAngle / 2;
    const textRadius = radius * 0.62;
    return {
      x: center + textRadius * Math.cos(angle),
      y: center + textRadius * Math.sin(angle),
      angle: (index * 360 / numSegments) + (360 / numSegments / 2),
    };
  };

  const getIconPosition = (index: number) => {
    const angle      = index * segmentAngle - Math.PI / 2 + segmentAngle / 2;
    const iconRadius = radius * 0.85;
    return {
      x: center + iconRadius * Math.cos(angle),
      y: center + iconRadius * Math.sin(angle),
    };
  };

  const selectedCat    = selectedIndex !== null ? CATEGORIES[selectedIndex] : null;
  const selectedColor  = selectedIndex !== null ? SEGMENT_COLORS[selectedIndex] : null;
  const selectedIcon   = selectedIndex !== null ? CATEGORY_ICONS[selectedIndex] : null;
  const catTimes       = selectedCat ? difficultyTimes[selectedCat] : {};

  return (
    <div className="flex flex-col items-center gap-6" style={{ maxWidth: 620, width: '100%' }}>

      {/* ── Title ── */}
      <div className="text-center">
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', lineHeight: 1.1 }}>
          <span style={{ background: 'linear-gradient(90deg,#4d96ff,#c77dff,#ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Putar Roda
          </span>
          <br />
          <span style={{ color: '#f0f0f8' }}>Pilih Kategori Soal!</span>
        </h1>
        {!showResult && (
          <p style={{ color: '#9898b8', marginTop: 10, fontFamily: 'Nunito, sans-serif' }}>
            Klik tombol putar dan lihat kategori mana yang terpilih
          </p>
        )}
      </div>

      {/* ── Wheel ── */}
      <div
        className="relative"
        style={{
          filter: isSpinning
            ? 'drop-shadow(0 0 30px rgba(77,150,255,0.5))'
            : showResult && selectedColor
            ? `drop-shadow(0 0 25px ${selectedColor[0]}66)`
            : 'drop-shadow(0 0 15px rgba(77,150,255,0.2))',
          transition: 'filter 0.6s ease',
        }}
      >
        {/* Pointer */}
        <div className="absolute left-1/2 top-0 z-20"
          style={{ transform: 'translateX(-50%) translateY(-8px)', filter: 'drop-shadow(0 0 10px rgba(255,217,61,0.8))' }}>
          <svg width="28" height="36" viewBox="0 0 28 36">
            <polygon points="14,2 26,32 14,26 2,32" fill="#ffd93d" stroke="#0a0a14" strokeWidth="2" />
          </svg>
        </div>

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: '50%', display: 'block' }}>
          <defs>
            {SEGMENT_COLORS.map((colors, i) => (
              <radialGradient key={i} id={`grad${i}`} cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor={colors[0]} />
                <stop offset="100%" stopColor={colors[1]} />
              </radialGradient>
            ))}
          </defs>

          <g style={{
            transformOrigin: `${center}px ${center}px`,
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4.5s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
          }}>
            {/* Segments */}
            {CATEGORIES.map((_, i) => (
              <path key={i} d={createSegmentPath(i)} fill={`url(#grad${i})`} stroke="#0a0a14" strokeWidth="3" />
            ))}
            {/* Labels */}
            {CATEGORIES.map((cat, i) => {
              const pos   = getTextPosition(i);
              const short = cat.length > 9 ? cat.substring(0, 8) + '…' : cat;
              return (
                <text key={i} x={pos.x} y={pos.y + 4} textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="10" fontFamily="Syne,sans-serif" fontWeight="700"
                  transform={`rotate(${pos.angle},${pos.x},${pos.y})`}
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
                  {short}
                </text>
              );
            })}
            {/* Icons */}
            {CATEGORY_ICONS.map((icon, i) => {
              const pos = getIconPosition(i);
              return (
                <text key={i} x={pos.x} y={pos.y + 5} textAnchor="middle" dominantBaseline="middle"
                  fontSize="14" transform={`rotate(${(i * 360 / numSegments) + (360 / numSegments / 2)},${pos.x},${pos.y})`}>
                  {icon}
                </text>
              );
            })}
            {/* Center */}
            <circle cx={center} cy={center} r="30" fill="#0a0a14" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
            <circle cx={center} cy={center} r="20" fill="url(#grad0)" opacity="0.8" />
            <text x={center} y={center + 5} textAnchor="middle" dominantBaseline="middle" fontSize="16">🎡</text>
          </g>
          <circle cx={center} cy={center} r={radius + 5} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        </svg>
      </div>

      {/* ── POST-SPIN: result + re-spin + difficulty buttons ── */}
      {showResult && selectedIndex !== null && selectedCat && selectedColor ? (
        <div
          className="flex flex-col items-center gap-5 w-full"
          style={{ animation: 'resultReveal 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
          {/* Selected category banner */}
          <div
            className="flex items-center gap-3 px-6 py-3 rounded-2xl w-full justify-center"
            style={{
              background: `${selectedColor[0]}18`,
              border: `2px solid ${selectedColor[0]}55`,
            }}
          >
            <span style={{ fontSize: '2rem' }}>{selectedIcon}</span>
            <div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.35rem', color: selectedColor[0] }}>
                {selectedCat}
              </div>
              {usedPerCategory(selectedCat) > 0 && (
                <div style={{ fontSize: '0.7rem', fontFamily: 'Space Mono,monospace', color: selectedColor[0], opacity: 0.7 }}>
                  ✓ {usedPerCategory(selectedCat)} soal sudah terpakai
                </div>
              )}
            </div>
          </div>

          {/* ── Difficulty picker inline ── */}
          <div className="w-full">
            <p style={{ color: '#9898b8', fontFamily: 'Nunito,sans-serif', textAlign: 'center', marginBottom: 12, fontSize: '0.9rem' }}>
              Pilih tingkat kesulitan soal:
            </p>
            <div className="grid grid-cols-3 gap-3 w-full">
              {DIFFICULTIES.map(diff => {
                const timeVal = catTimes?.[diff.key];
                const timeLabel = timeVal ? `${timeVal}s` : '…';
                return (
                  <button
                    key={diff.key}
                    onClick={() => handleDifficulty(diff.key)}
                    className="relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '2px solid rgba(255,255,255,0.09)',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = 'translateY(-5px) scale(1.04)';
                      el.style.background = 'rgba(255,255,255,0.08)';
                      el.style.boxShadow = `0 12px 32px ${diff.glow}`;
                      el.style.borderColor = diff.glow.replace('0.5', '0.7');
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = '';
                      el.style.background = 'rgba(255,255,255,0.04)';
                      el.style.boxShadow = '';
                      el.style.borderColor = 'rgba(255,255,255,0.09)';
                    }}
                  >
                    {/* Gradient icon */}
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-xl text-xl"
                      style={{ background: diff.gradient, boxShadow: `0 4px 12px ${diff.glow}` }}
                    >
                      {diff.emoji}
                    </div>
                    {/* Label */}
                    <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#f0f0f8' }}>
                      {diff.label}
                    </span>
                    {/* Time pill */}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: diff.gradient, color: 'white', fontFamily: 'Space Mono,monospace', fontWeight: 700, fontSize: '0.7rem' }}
                    >
                      ⏱ {timeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Re-spin button ── */}
          <button
            onClick={spin}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#9898b8',
              fontFamily: 'Syne,sans-serif',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#f0f0f8'; el.style.borderColor = 'rgba(255,255,255,0.25)'; el.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#9898b8'; el.style.borderColor = 'rgba(255,255,255,0.12)'; el.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            🎲 Putar Ulang
          </button>
        </div>
      ) : (
        /* ── Initial spin button ── */
        <button
          onClick={spin}
          disabled={isSpinning}
          style={{
            background: isSpinning ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#4d96ff,#c77dff)',
            border: 'none',
            cursor: isSpinning ? 'not-allowed' : 'pointer',
            fontFamily: 'Syne,sans-serif',
            fontWeight: 800,
            fontSize: '1.125rem',
            color: 'white',
            padding: '16px 48px',
            borderRadius: '100px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'all 0.3s',
            opacity: isSpinning ? 0.7 : 1,
            boxShadow: isSpinning ? 'none' : '0 8px 32px rgba(77,150,255,0.4)',
          }}
          onMouseEnter={e => { if (!isSpinning) (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.03)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'; }}
        >
          {isSpinning
            ? <span className="flex items-center gap-2"><span style={{ display:'inline-block', animation:'spinIcon 1s linear infinite' }}>⚙️</span>Memutar...</span>
            : '🎲 PUTAR RODA!'}
        </button>
      )}

      <style jsx>{`
        @keyframes resultReveal {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes spinIcon {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
