'use client';
import { useEffect, useState } from 'react';
import { Difficulty } from '@/hooks/useQuizSession';

interface ResumeToastProps {
  category: string;
  difficulty: Difficulty;
}

export default function ResumeToast({ category, difficulty }: ResumeToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-20 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
      style={{
        transform: 'translateX(-50%)',
        background: 'rgba(26,26,46,0.95)',
        border: '1px solid rgba(77,150,255,0.4)',
        boxShadow: '0 8px 32px rgba(77,150,255,0.25)',
        backdropFilter: 'blur(12px)',
        animation: 'toastSlide 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>🔄</span>
      <div>
        <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: '0.875rem' }}>
          Sesi dipulihkan!
        </p>
        <p style={{ color: '#9898b8', fontSize: '0.75rem' }}>
          {category} · {difficulty}
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        style={{ color: '#9898b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginLeft: 4 }}
      >
        ✕
      </button>

      <style jsx>{`
        @keyframes toastSlide {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
