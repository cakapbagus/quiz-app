import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const GAS_URL =
  'https://script.google.com/macros/s/AKfycbwkqpS3OHhigQf95hl3GBQv-NbIUnyt9LD7n6D0gFFVyK-54WNDTp7bbXGEBGykZyIg/exec';

const PUBLIC_DIR   = join(process.cwd(), 'public');
const BANK_PATH    = join(PUBLIC_DIR, 'bank_soal.json');
const CHKSUM_PATH  = join(PUBLIC_DIR, 'bank_soal.sha256');

export const dynamic   = 'force-dynamic';
export const revalidate = 0;

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Try to fetch fresh data from GAS
    let gasRaw: string | null = null;
    try {
      const res = await fetch(GAS_URL, {
        headers: { 'User-Agent': 'QuizSpin/1.0' },
        // Don't use Next cache here — we do our own checksum cache
        cache: 'no-store',
      });
      if (res.ok) {
        gasRaw = await res.text();
      }
    } catch (fetchErr) {
      console.warn('[bank] GAS fetch failed, will use local copy:', fetchErr);
    }

    // 2. Decide whether to update local file
    let bankJson: string;

    if (gasRaw) {
      const gasChecksum = sha256(gasRaw);

      // Read stored checksum (if any)
      let storedChecksum = '';
      try {
        storedChecksum = (await readFile(CHKSUM_PATH, 'utf-8')).trim();
      } catch { /* no file yet */ }

      if (gasChecksum !== storedChecksum) {
        // Data changed — validate it's parseable JSON before writing
        try {
          JSON.parse(gasRaw); // throws if invalid
          await writeFile(BANK_PATH,   gasRaw,        'utf-8');
          await writeFile(CHKSUM_PATH, gasChecksum,   'utf-8');
          console.log('[bank] Local cache updated (checksum changed)');
        } catch (parseErr) {
          console.error('[bank] GAS returned invalid JSON, keeping local copy:', parseErr);
          bankJson = await readFile(BANK_PATH, 'utf-8');
        }
        bankJson ??= gasRaw;
      } else {
        // Checksums match — use local copy (skip GAS write)
        console.log('[bank] Checksum match — serving from local cache');
        bankJson = await readFile(BANK_PATH, 'utf-8');
      }
    } else {
      // GAS unavailable — fall back to local file
      bankJson = await readFile(BANK_PATH, 'utf-8');
    }

    const raw        = JSON.parse(bankJson!);
    const normalised = normalise(raw);

    return NextResponse.json(normalised, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'X-Bank-Source': gasRaw ? 'gas' : 'local',
      },
    });
  } catch (err) {
    console.error('[bank] Fatal error:', err);
    return NextResponse.json({ error: 'Failed to load bank soal' }, { status: 502 });
  }
}

// ─── SHA-256 helper ───────────────────────────────────────────────────────────

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface NormQuestion {
  tipe: string;
  soal: string;
  pg_a: string; pg_b: string; pg_c: string; pg_d: string;
  jawaban: string | number;
  waktu: number;
}

type NormalisedBank = Record<string, [Record<string, NormQuestion[]>]>;

// ─── Normalise a single question row ─────────────────────────────────────────

function normaliseRow(row: RawQuestion): NormQuestion | null {
  const soal = (row.soal ?? '').toString().trim();
  if (!soal) return null;

  const waktu = Number(row.waktu);
  if (!waktu || isNaN(waktu) || waktu <= 0) return null;

  const rawTipe = (row.tipe ?? '').toString().trim();
  const isIsi   = rawTipe.toLowerCase().includes('isian');
  const tipe    = isIsi ? 'Isian' : 'Pilihan Ganda';

  if (isIsi) {
    const jaw    = row.jawaban;
    const jawStr = jaw == null ? '' : jaw.toString().trim();
    if (jawStr === '') return null;

    const jawaban: string | number =
      typeof jaw === 'number'
        ? jaw
        : (!isNaN(Number(jawStr)) && jawStr !== '')
          ? Number(jawStr)
          : jawStr;

    return { tipe, soal, pg_a: '', pg_b: '', pg_c: '', pg_d: '', jawaban, waktu };
  } else {
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

// ─── Normalise the full bank structure ───────────────────────────────────────

function normalise(raw: unknown): NormalisedBank {
  // Shape A: { "English": [{ "Receh": [...] }], ... }
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
          if (cleaned.length > 0) result[cat][0][diff] = cleaned;
        }

        if (Object.keys(result[cat][0]).length === 0) delete result[cat];
      }

      return result;
    }
  }

  // Shape B: flat array
  if (Array.isArray(raw)) {
    const result: NormalisedBank = {};

    for (const row of raw as RawQuestion[]) {
      const cat  = (row.kategori ?? '').toString().trim();
      const diff = (row.tingkat  ?? '').toString().trim();
      if (!cat || !diff) continue;

      const norm = normaliseRow(row);
      if (!norm) continue;

      if (!result[cat])            result[cat] = [{}];
      if (!result[cat][0])         result[cat][0] = {};
      if (!result[cat][0][diff])   result[cat][0][diff] = [];
      result[cat][0][diff].push(norm);
    }

    return result;
  }

  return {};
}
