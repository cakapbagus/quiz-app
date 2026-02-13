import { NextResponse } from 'next/server';

const GAS_URL =
  'https://script.google.com/macros/s/AKfycbwkqpS3OHhigQf95hl3GBQv-NbIUnyt9LD7n6D0gFFVyK-54WNDTp7bbXGEBGykZyIg/exec';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(GAS_URL, {
      headers: { 'User-Agent': 'QuizSpin/1.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`GAS responded ${res.status}`);
    const raw = await res.json();
    const normalised = normalise(raw);
    return NextResponse.json(normalised, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('Failed to fetch bank soal from GAS:', err);
    return NextResponse.json({ error: 'Failed to fetch bank soal' }, { status: 502 });
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawQuestion {
  tipe?: string | null;
  soal?: string | null;
  pg_a?: string | null;
  pg_b?: string | null;
  pg_c?: string | null;
  pg_d?: string | null;
  jawaban?: string | number | null;
  waktu?: string | number | null;
  kategori?: string | null;
  tingkat?: string | null;
}

export interface NormQuestion {
  tipe: string;             // "Pilihan Ganda" | "Isian"
  soal: string;
  pg_a: string; pg_b: string; pg_c: string; pg_d: string;
  jawaban: string | number; // number preserved for Isian (e.g. 50, -80)
  waktu: number;
}

type NormalisedBank = Record<string, [Record<string, NormQuestion[]>]>;

// ─── Normalise a single row ───────────────────────────────────────────────────

function normaliseRow(row: RawQuestion): NormQuestion | null {
  // Must have non-empty question text
  const soal = (row.soal ?? '').toString().trim();
  if (!soal) return null;

  // Must have a valid positive waktu
  const waktu = Number(row.waktu);
  if (!waktu || isNaN(waktu) || waktu <= 0) return null;

  const rawTipe = (row.tipe ?? '').toString().trim();
  const isIsi   = rawTipe.toLowerCase().includes('isian');
  const tipe    = isIsi ? 'Isian' : 'Pilihan Ganda';

  if (isIsi) {
    // jawaban must be non-empty (can be 0 which is a valid numeric answer)
    const jaw    = row.jawaban;
    const jawStr = jaw == null ? '' : jaw.toString().trim();
    if (jawStr === '') return null;

    // Preserve numeric type (50, -80, 0) so it renders without trailing ".0"
    const jawaban: string | number =
      typeof jaw === 'number'
        ? jaw
        : (!isNaN(Number(jawStr)) && jawStr !== '')
          ? Number(jawStr)
          : jawStr;

    return { tipe, soal, pg_a: '', pg_b: '', pg_c: '', pg_d: '', jawaban, waktu };
  } else {
    // Pilihan Ganda: all four options must be non-empty
    const pg_a = (row.pg_a ?? '').toString().trim();
    const pg_b = (row.pg_b ?? '').toString().trim();
    const pg_c = (row.pg_c ?? '').toString().trim();
    const pg_d = (row.pg_d ?? '').toString().trim();
    if (!pg_a || !pg_b || !pg_c || !pg_d) return null;

    const jawaban = (row.jawaban ?? '').toString().trim();
    if (!jawaban) return null;

    return { tipe, soal, pg_a, pg_b, pg_c, pg_d, jawaban, waktu };
  }
}

// ─── Main normaliser ─────────────────────────────────────────────────────────
//
// Shape A (real GAS format):
//   { "English": [{ "Receh": [{...}], ... }], "Matematika": [{ "Receh": [{...}] }] }
//
// Shape B (flat rows):
//   [{ kategori, tingkat, soal, pg_a, ... }, ...]

function normalise(raw: unknown): NormalisedBank {
  // Shape A: object whose values are 1-element arrays containing a diff-map
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj      = raw as Record<string, unknown>;
    const firstVal = Object.values(obj)[0];

    if (Array.isArray(firstVal)) {
      const result: NormalisedBank = {};

      for (const [cat, arr] of Object.entries(obj)) {
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const diffMap = arr[0] as Record<string, unknown>;
        if (!diffMap || typeof diffMap !== 'object') continue;

        result[cat] = [{}];

        for (const [diff, questions] of Object.entries(diffMap)) {
          if (!Array.isArray(questions)) continue;

          const cleaned: NormQuestion[] = questions
            .map(q => normaliseRow(q as RawQuestion))
            .filter((q): q is NormQuestion => q !== null);

          if (cleaned.length > 0) {
            result[cat][0][diff] = cleaned;
          }
        }

        // Drop category if nothing valid survived
        if (Object.keys(result[cat][0]).length === 0) {
          delete result[cat];
        }
      }

      return result;
    }
  }

  // Shape B: flat array of row objects
  if (Array.isArray(raw)) {
    const result: NormalisedBank = {};

    for (const row of raw as RawQuestion[]) {
      const cat  = (row.kategori ?? '').toString().trim();
      const diff = (row.tingkat  ?? '').toString().trim();
      if (!cat || !diff) continue;

      const norm = normaliseRow(row);
      if (!norm) continue;

      if (!result[cat])        result[cat] = [{}];
      if (!result[cat][0])     result[cat][0] = {};
      if (!result[cat][0][diff]) result[cat][0][diff] = [];
      result[cat][0][diff].push(norm);
    }

    return result;
  }

  return {};
}
