import { NextResponse } from 'next/server';

const GAS_URL =
  'https://script.google.com/macros/s/AKfycbwkqpS3OHhigQf95hl3GBQv-NbIUnyt9LD7n6D0gFFVyK-54WNDTp7bbXGEBGykZyIg/exec';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(GAS_URL, {
      headers: { 'User-Agent': 'QuizSpin/1.0' },
      // Next.js fetch cache – revalidate every 5 minutes
      next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`GAS responded ${res.status}`);

    const raw = await res.json();

    // Normalise whatever structure the GAS returns into our standard format:
    // { [category]: [{ Receh: Question[], Sedang: Question[], Sulit: Question[] }] }
    const normalised = normalise(raw);
    return NextResponse.json(normalised, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('Failed to fetch bank soal from GAS:', err);
    return NextResponse.json({ error: 'Failed to fetch bank soal' }, { status: 502 });
  }
}

// ─── Normaliser ──────────────────────────────────────────────────────────────
// Handles both possible GAS output shapes:
//
// Shape A (already our format):
//   { "English": [{ "Receh": [...], "Sedang": [...], "Sulit": [...] }], ... }
//
// Shape B (flat array rows from Google Sheets):
//   [{ kategori, tingkat, soal, pg_a, pg_b, pg_c, pg_d, jawaban, waktu }, ...]

interface RawQuestion {
  tipe?: string;
  soal: string;
  pg_a: string;
  pg_b: string;
  pg_c: string;
  pg_d: string;
  jawaban: string;
  waktu: number | string;
  kategori?: string;
  tingkat?: string;
}

type NormalisedBank = Record<string, [Record<string, RawQuestion[]>]>;

function normalise(raw: unknown): NormalisedBank {
  // Shape A: top-level is an object with category keys
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    // Check if it already looks like our format
    const firstVal = Object.values(obj)[0];
    if (Array.isArray(firstVal)) {
      // Could be Shape A – return as-is (cast)
      return obj as NormalisedBank;
    }
  }

  // Shape B: flat array of row objects
  if (Array.isArray(raw)) {
    const result: NormalisedBank = {};
    for (const row of raw as RawQuestion[]) {
      const cat  = (row.kategori ?? '').trim();
      const diff = (row.tingkat  ?? '').trim();
      if (!cat || !diff) continue;
      if (!result[cat])    result[cat] = [{}];
      if (!result[cat][0]) result[cat][0] = {};
      if (!result[cat][0][diff]) result[cat][0][diff] = [];
      result[cat][0][diff].push({
        tipe:    'Pilihan Ganda',
        soal:    row.soal,
        pg_a:    row.pg_a,
        pg_b:    row.pg_b,
        pg_c:    row.pg_c,
        pg_d:    row.pg_d,
        jawaban: row.jawaban,
        waktu:   Number(row.waktu) || 30,
      });
    }
    return result;
  }

  return {};
}
