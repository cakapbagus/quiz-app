'use client';
import dynamic from 'next/dynamic';

// Disable SSR for QuizApp entirely — it uses cookies, sessionStorage, and
// Math.random at render time, all of which cause hydration mismatches.
const QuizApp = dynamic(() => import('./QuizApp'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh', background: '#0a0a14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'linear-gradient(135deg,#4d96ff,#c77dff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        animation: 'qs-pulse 1s ease-in-out infinite',
      }}>🎡</div>
      <p style={{ color: '#9898b8', fontFamily: 'sans-serif', fontSize: 14 }}>
        Memuat QuizSpin...
      </p>
      <style>{`
        @keyframes qs-pulse {
          0%,100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.12); opacity: 0.8; }
        }
      `}</style>
    </div>
  ),
});

export default function ClientRoot() {
  return <QuizApp />;
}
