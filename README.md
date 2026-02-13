# QuizSpin - Simplified Version

Versi yang disederhanakan dari quiz app dengan perubahan utama:

## 🎯 Perubahan Utama

### 1. **Hapus API Routes** ❌
- ❌ `/app/api/session` - tidak diperlukan lagi
- ❌ `/app/api/questions` - tidak diperlukan lagi  
- ❌ `/app/api/bank` - tidak diperlukan lagi
- ❌ `/hooks/useQuizSession.ts` - digabung ke komponen utama
- ❌ `/lib/session.ts` - tidak diperlukan lagi

### 2. **localStorage untuk Session Management** 💾
- Semua session data disimpan di `localStorage` dengan key `quizspin_session`
- Data yang disimpan:
  - `state`: status aplikasi (loading/wheel/question)
  - `category`: kategori yang dipilih
  - `difficulty`: tingkat kesulitan
  - `questionIndex`: index soal yang sedang ditampilkan
  - `usedQuestions`: daftar soal yang sudah dipakai
  - `timerStartedAt`: waktu mulai timer
  - `timerDuration`: durasi timer

### 3. **Penarikan JSON Sekali Saat Load** 🚀
- Bank soal ditarik **SEKALI** saat aplikasi pertama kali dimuat
- Data disimpan di React state (`bankData`)
- Tidak ada request berulang ke server
- Fallback ke `/bank_soal.json` lokal jika URL Google gagal

### 4. **Struktur Lebih Sederhana** 📁
```
quiz-app-simplified/
├── app/
│   ├── page.tsx          # Entry point
│   ├── layout.tsx        # Layout wrapper
│   ├── globals.css       # Global styles
│   └── favicon.ico
├── components/
│   ├── QuizApp.tsx       # Komponen utama (ALL LOGIC HERE)
│   ├── ClientRoot.tsx    # Client-side wrapper
│   ├── SpinWheel.tsx     # Roda kategori
│   ├── QuestionModal.tsx # Modal pertanyaan
│   └── ResumeToast.tsx   # Toast resume
├── public/
│   └── bank_soal.json    # Bank soal lokal
├── package.json
└── README.md
```

## 🔥 Keuntungan Versi Simplified

1. **Lebih Cepat** ⚡
   - Tidak ada roundtrip ke API routes
   - Semua data sudah ada di memory
   - Session management instant dengan localStorage

2. **Lebih Sederhana** 🎯
   - Semua logic ada di 1 file (`QuizApp.tsx`)
   - Tidak perlu manage cookies atau JWT
   - Tidak perlu API endpoints

3. **Tetap Berfungsi** ✅
   - Resume session setelah reload
   - Timer recovery
   - Track soal yang sudah dipakai
   - Reset functionality

4. **Mudah Deploy** 🚀
   - Bisa di-deploy sebagai static site
   - Tidak perlu server-side logic
   - Vercel/Netlify ready

## 📦 Cara Pakai

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Konfigurasi

Edit URL Google Apps Script di `components/QuizApp.tsx`:

```typescript
const BANK_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL';
```

Jika URL gagal, akan otomatis fallback ke `/public/bank_soal.json`

## 🎨 Fitur

- ✅ Spin wheel untuk pilih kategori & kesulitan
- ✅ Timer countdown
- ✅ Resume session otomatis
- ✅ Track soal yang sudah dipakai
- ✅ Reset semua progress
- ✅ Animasi smooth
- ✅ Responsive design
- ✅ Dark theme

## 📝 Notes

- Data quiz disimpan di localStorage (max ~5-10MB tergantung browser)
- Session tetap persists setelah reload browser
- Clear localStorage atau tekan tombol Reset untuk mulai dari awal
- Cocok untuk quiz app dengan jumlah soal moderate (ratusan hingga ribuan soal)
