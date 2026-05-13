import { useState, useEffect, useCallback } from "react";

// ============================================================
// SUPABASE CONFIG — Ganti dengan kredensial Supabase Anda
// ============================================================
const SUPABASE_URL = "https://ehnazhgudaspeuolnwkj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xzh7S432JXwxMv8su63D0g_5KHCOmPY";

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Supabase error");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ============================================================
// SUBMIT QUEUE SYSTEM
// Antrian submit untuk mencegah overload saat banyak siswa
// submit bersamaan
// ============================================================
const submitQueue = {
  queue: [],
  running: false,
  maxRetry: 5,
  baseDelay: 500, // ms

  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, retries: 0 });
      this.process();
    });
  },

  async process() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const item = this.queue.shift();
    try {
      const result = await this.runWithRetry(item);
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    }
    this.running = false;
    // Jeda antar submit untuk hindari burst ke Supabase
    await new Promise(r => setTimeout(r, 200));
    this.process();
  },

  async runWithRetry(item) {
    for (let attempt = 0; attempt <= this.maxRetry; attempt++) {
      try {
        return await item.fn();
      } catch (err) {
        if (attempt === this.maxRetry) throw err;
        // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
        const delay = this.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 300; // acak sedikit agar tidak semua retry bersamaan
        await new Promise(r => setTimeout(r, delay + jitter));
      }
    }
  }
};

// ============================================================
// SHUFFLE UTILS
// ============================================================
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Acak soal DAN opsi jawaban, kembalikan soal dengan mapping jawaban benar
function shuffleSoalDanOpsi(soalAsli) {
  if (!soalAsli || soalAsli.length === 0) return [];
  const soalAcak = shuffleArray(soalAsli);
  return soalAcak.map(s => {
    // Pastikan opsi adalah array yang valid
    let opsi = s.opsi;
    if (!Array.isArray(opsi)) {
      try { opsi = JSON.parse(opsi); } catch { opsi = ["A","B","C","D"]; }
    }
    if (!opsi || opsi.length === 0) opsi = ["A","B","C","D"];

    const jawabanIdx = typeof s.jawaban === 'number' ? s.jawaban : 0;
    const jawabanAsli = opsi[jawabanIdx] ?? opsi[0];
    const opsiAcak = shuffleArray([...opsi]);
    const jawabanBaru = opsiAcak.indexOf(jawabanAsli);
    return { ...s, opsi: opsiAcak, jawaban: jawabanBaru < 0 ? 0 : jawabanBaru };
  });
}

// ============================================================
// CONSTANTS
// ============================================================
const MAPEL = [
  "Matematika","Bahasa Indonesia","Bahasa Inggris","IPA","IPS",
  "PKn","Agama","Informatika","PJOK","Prakarya",
];

const GURU_ACCOUNTS = [
  { username: "admin", password: "admin123", nama: "Administrator" },
  { username: "guru1", password: "guru123", nama: "Guru Mapel" },
];

// ============================================================
// STYLES
// ============================================================
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy: #0f172a; --navy2: #1e293b; --navy3: #334155;
    --blue: #3b82f6; --blue2: #2563eb; --blue3: #dbeafe;
    --green: #22c55e; --green2: #16a34a; --green3: #dcfce7;
    --red: #ef4444; --red2: #dc2626; --red3: #fee2e2;
    --yellow: #f59e0b; --yellow3: #fef3c7;
    --white: #ffffff; --gray: #64748b; --gray2: #94a3b8;
    --light: #f1f5f9; --border: #e2e8f0;
    --font: 'Plus Jakarta Sans', sans-serif;
    --mono: 'JetBrains Mono', monospace;
    --radius: 12px; --radius2: 8px;
    --shadow: 0 4px 24px rgba(15,23,42,0.08);
    --shadow2: 0 1px 4px rgba(15,23,42,0.06);
  }
  body { font-family: var(--font); background: var(--light); color: var(--navy); }
  button { font-family: var(--font); cursor: pointer; border: none; outline: none; }
  input, select, textarea { font-family: var(--font); outline: none; }
  .app { min-height: 100vh; }

  /* LOGIN */
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%); padding: 20px; position: relative; overflow: hidden; }
  .login-wrap::before { content: ''; position: absolute; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%); top: -200px; right: -200px; }
  .login-wrap::after { content: ''; position: absolute; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%); bottom: -100px; left: -100px; }
  .login-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 48px; width: 100%; max-width: 420px; position: relative; z-index: 1; }
  .login-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
  .login-logo-icon { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
  .login-logo-icon img { width: 100%; height: 100%; object-fit: cover; }
  .login-logo h1 { font-size: 22px; font-weight: 800; color: white; }
  .login-logo span { color: var(--blue); }
  .login-subtitle { color: rgba(255,255,255,0.6); font-size: 14px; margin-bottom: 32px; }
  .login-tab { display: flex; background: rgba(255,255,255,0.05); border-radius: var(--radius2); padding: 4px; margin-bottom: 28px; }
  .login-tab button { flex: 1; padding: 10px; border-radius: 6px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.5); background: transparent; transition: all .2s; }
  .login-tab button.active { background: var(--blue); color: white; }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
  .field input, .field select { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: var(--radius2); color: white; font-size: 14px; transition: border .2s; }
  .field input::placeholder { color: rgba(255,255,255,0.3); }
  .field input:focus, .field select:focus { border-color: var(--blue); background: rgba(59,130,246,0.08); }
  .field select option { background: var(--navy); }
  .btn-primary { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--blue2), var(--blue)); color: white; border-radius: var(--radius2); font-size: 15px; font-weight: 700; transition: all .2s; margin-top: 4px; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(59,130,246,0.4); }
  .btn-primary:active { transform: translateY(0); }
  .error-msg { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; padding: 10px 14px; border-radius: var(--radius2); font-size: 13px; margin-bottom: 16px; }

  /* DASHBOARD GURU */
  .dashboard { display: flex; min-height: 100vh; }
  .sidebar { width: 260px; background: var(--navy); min-height: 100vh; padding: 24px 0; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; z-index: 100; }
  .sidebar-logo { padding: 0 24px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 16px; }
  .sidebar-logo h2 { font-size: 18px; font-weight: 800; color: white; }
  .sidebar-logo span { color: var(--blue); }
  .sidebar-logo p { color: var(--gray2); font-size: 12px; margin-top: 4px; }
  .sidebar-menu { flex: 1; padding: 0 12px; }
  .sidebar-menu button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border-radius: var(--radius2); color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 500; background: transparent; transition: all .2s; margin-bottom: 4px; text-align: left; }
  .sidebar-menu button:hover { background: rgba(255,255,255,0.06); color: white; }
  .sidebar-menu button.active { background: rgba(59,130,246,0.2); color: var(--blue); }
  .sidebar-bottom { padding: 16px 12px; border-top: 1px solid rgba(255,255,255,0.08); }
  .sidebar-bottom button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border-radius: var(--radius2); color: rgba(255,255,255,0.5); font-size: 14px; background: transparent; transition: all .2s; }
  .sidebar-bottom button:hover { color: var(--red); background: rgba(239,68,68,0.1); }
  .main { margin-left: 260px; flex: 1; padding: 32px; }
  .page-header { margin-bottom: 28px; }
  .page-header h1 { font-size: 24px; font-weight: 800; color: var(--navy); }
  .page-header p { color: var(--gray); font-size: 14px; margin-top: 4px; }

  /* CARDS */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .stat-card { background: white; border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow2); border: 1px solid var(--border); }
  .stat-card .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 12px; }
  .stat-card .stat-val { font-size: 28px; font-weight: 800; color: var(--navy); font-family: var(--mono); }
  .stat-card .stat-label { font-size: 13px; color: var(--gray); margin-top: 2px; }

  .card { background: white; border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow2); border: 1px solid var(--border); margin-bottom: 20px; }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .card-header h2 { font-size: 16px; font-weight: 700; }

  /* FORM SOAL */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-field { margin-bottom: 16px; }
  .form-field label { display: block; font-size: 13px; font-weight: 600; color: var(--navy3); margin-bottom: 6px; }
  .form-field input, .form-field select, .form-field textarea { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--radius2); font-size: 14px; color: var(--navy); transition: border .2s; background: white; }
  .form-field input:focus, .form-field select:focus, .form-field textarea:focus { border-color: var(--blue); }
  .form-field textarea { resize: vertical; min-height: 80px; }
  .option-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .option-label { width: 28px; height: 28px; border-radius: 50%; background: var(--blue3); color: var(--blue2); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
  .option-row input { flex: 1; }
  .option-row.correct .option-label { background: var(--green3); color: var(--green2); }

  /* BUTTONS */
  .btn { padding: 8px 16px; border-radius: var(--radius2); font-size: 13px; font-weight: 600; transition: all .2s; display: inline-flex; align-items: center; gap: 6px; }
  .btn-blue { background: var(--blue); color: white; }
  .btn-blue:hover { background: var(--blue2); }
  .btn-green { background: var(--green); color: white; }
  .btn-green:hover { background: var(--green2); }
  .btn-red { background: var(--red3); color: var(--red2); }
  .btn-red:hover { background: var(--red); color: white; }
  .btn-ghost { background: var(--light); color: var(--navy3); }
  .btn-ghost:hover { background: var(--border); }

  /* TABLE */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { background: var(--light); padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 700; color: var(--gray); text-transform: uppercase; letter-spacing: .05em; }
  td { padding: 12px 14px; border-bottom: 1px solid var(--border); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #fafbff; }
  .badge { display: inline-flex; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; }
  .badge-blue { background: var(--blue3); color: var(--blue2); }
  .badge-green { background: var(--green3); color: var(--green2); }
  .badge-red { background: var(--red3); color: var(--red2); }
  .badge-yellow { background: var(--yellow3); color: #92400e; }

  /* UJIAN KEY MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  .modal { background: white; border-radius: 20px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 24px 64px rgba(15,23,42,0.2); }
  .modal h2 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
  .modal p { color: var(--gray); font-size: 14px; margin-bottom: 24px; }
  .exam-key-display { background: var(--light); border: 2px dashed var(--blue); border-radius: var(--radius); padding: 20px; text-align: center; margin-bottom: 20px; }
  .exam-key-display .key { font-family: var(--mono); font-size: 36px; font-weight: 700; color: var(--blue2); letter-spacing: 6px; }
  .exam-key-display p { font-size: 12px; color: var(--gray); margin-top: 4px; margin-bottom: 0; }

  /* CBT STUDENT */
  .cbt-wrap { min-height: 100vh; background: #f8faff; }
  .cbt-header { background: var(--navy); padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
  .cbt-header h2 { color: white; font-size: 15px; font-weight: 700; }
  .cbt-header-info { display: flex; align-items: center; gap: 16px; }
  .cbt-timer { background: rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 14px; color: white; font-family: var(--mono); font-weight: 700; font-size: 16px; }
  .cbt-timer.danger { background: rgba(239,68,68,0.3); color: #fca5a5; animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .7; } }
  .cbt-student-info { color: rgba(255,255,255,0.7); font-size: 13px; }
  .cbt-body { display: flex; gap: 20px; padding: 20px; max-width: 1100px; margin: 0 auto; }
  .cbt-main { flex: 1; }
  .cbt-sidebar { width: 220px; flex-shrink: 0; }
  .cbt-question-card { background: white; border-radius: var(--radius); padding: 28px; box-shadow: var(--shadow2); border: 1px solid var(--border); }
  .cbt-q-num { font-size: 12px; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 12px; }
  .cbt-q-text { font-size: 16px; line-height: 1.7; color: var(--navy); margin-bottom: 24px; font-weight: 500; }
  .cbt-options { display: flex; flex-direction: column; gap: 10px; }
  .cbt-option { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border: 2px solid var(--border); border-radius: var(--radius2); cursor: pointer; transition: all .15s; }
  .cbt-option:hover { border-color: var(--blue); background: var(--blue3); }
  .cbt-option.selected { border-color: var(--blue2); background: var(--blue3); }
  .cbt-option-label { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: var(--gray); flex-shrink: 0; transition: all .15s; }
  .cbt-option.selected .cbt-option-label { border-color: var(--blue2); background: var(--blue2); color: white; }
  .cbt-option-text { font-size: 15px; color: var(--navy); }
  .cbt-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
  .cbt-sidebar-card { background: white; border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow2); border: 1px solid var(--border); margin-bottom: 12px; }
  .cbt-sidebar-card h3 { font-size: 13px; font-weight: 700; color: var(--navy); margin-bottom: 12px; }
  .cbt-num-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .cbt-num-btn { aspect-ratio: 1; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1.5px solid var(--border); background: white; color: var(--navy3); transition: all .15s; }
  .cbt-num-btn.answered { background: var(--blue2); color: white; border-color: var(--blue2); }
  .cbt-num-btn.current { border-color: var(--blue); color: var(--blue); }
  .cbt-legend { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--gray); }
  .cbt-legend span { display: flex; align-items: center; gap: 6px; }
  .cbt-legend-dot { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid var(--border); }
  .cbt-legend-dot.answered { background: var(--blue2); border-color: var(--blue2); }

  /* RESULT */
  .result-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 20px; }
  .result-card { background: white; border-radius: 24px; padding: 48px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 32px 80px rgba(15,23,42,0.3); }
  .result-score-ring { width: 140px; height: 140px; border-radius: 50%; border: 8px solid var(--border); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; position: relative; }
  .result-score-ring.lulus { border-color: var(--green); }
  .result-score-ring.gagal { border-color: var(--red); }
  .result-score-val { font-size: 42px; font-weight: 800; font-family: var(--mono); }
  .result-score-val.lulus { color: var(--green2); }
  .result-score-val.gagal { color: var(--red2); }
  .result-emoji { font-size: 32px; margin-bottom: 12px; }
  .result-card h2 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
  .result-card p { color: var(--gray); font-size: 14px; }
  .result-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 24px 0; }
  .result-stat { background: var(--light); border-radius: var(--radius2); padding: 14px; }
  .result-stat .val { font-size: 22px; font-weight: 800; font-family: var(--mono); color: var(--navy); }
  .result-stat .lbl { font-size: 11px; color: var(--gray); margin-top: 2px; }

  /* UJIAN MANAGEMENT */
  .ujian-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .ujian-card { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow2); }
  .ujian-card h3 { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
  .ujian-card .meta { font-size: 13px; color: var(--gray); margin-bottom: 16px; }
  .ujian-card .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .key-badge { font-family: var(--mono); font-size: 18px; font-weight: 700; color: var(--blue2); background: var(--blue3); padding: 6px 12px; border-radius: var(--radius2); letter-spacing: 3px; display: inline-block; margin-bottom: 12px; }

  /* RESPONSIVE */
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); transition: transform .3s; }
    .main { margin-left: 0; padding: 16px; }
    .cbt-body { flex-direction: column; }
    .cbt-sidebar { width: 100%; }
    .form-grid { grid-template-columns: 1fr; }
  }
  .empty-state { text-align: center; padding: 48px; color: var(--gray); }
  .empty-state .icon { font-size: 48px; margin-bottom: 12px; }
  .divider { height: 1px; background: var(--border); margin: 20px 0; }
  .loading { display: flex; align-items: center; justify-content: center; padding: 48px; color: var(--gray); gap: 10px; }
`;

// ============================================================
// UTILS
// ============================================================
function genKey() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

// ============================================================
// DEMO DATA (dipakai jika Supabase belum dikonfigurasi)
// ============================================================
let DEMO_UJIAN = [
  { id: 1, mapel: "Matematika", kelas: "X", durasi: 60, key: "MTK001", aktif: true, soal: [
    { id: 1, pertanyaan: "Berapakah hasil dari 2³ + 5²?", opsi: ["30","31","32","33"], jawaban: 2 },
    { id: 2, pertanyaan: "Jika x + 5 = 12, maka x = ?", opsi: ["5","6","7","8"], jawaban: 2 },
    { id: 3, pertanyaan: "Luas lingkaran dengan r = 7 (π=22/7) adalah?", opsi: ["144","150","154","160"], jawaban: 2 },
  ]},
  { id: 2, mapel: "Bahasa Indonesia", kelas: "X", durasi: 90, key: "BIN001", aktif: true, soal: [
    { id: 1, pertanyaan: "Kata baku dari 'foto copy' adalah?", opsi: ["fotokopi","foto kopi","Fotokopi","Photo Copy"], jawaban: 0 },
  ]},
];
let DEMO_HASIL = [];
let useDemo = SUPABASE_URL.includes("YOUR_PROJECT");

// ============================================================
// MAIN APP
// ============================================================
// ============================================================
// ERROR BOUNDARY — Tangkap error blank putih
// ============================================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",padding:"20px"}}>
          <div style={{background:"white",borderRadius:"16px",padding:"32px",maxWidth:"480px",width:"100%",textAlign:"center"}}>
            <div style={{fontSize:"48px",marginBottom:"12px"}}>⚠️</div>
            <h2 style={{fontSize:"18px",fontWeight:"800",marginBottom:"8px",color:"#0f172a"}}>Terjadi Kesalahan</h2>
            <p style={{color:"#64748b",fontSize:"14px",marginBottom:"16px"}}>
              {this.state.error?.message || "Error tidak diketahui"}
            </p>
            <div style={{background:"#f1f5f9",borderRadius:"8px",padding:"12px",fontSize:"12px",color:"#64748b",marginBottom:"20px",textAlign:"left",fontFamily:"monospace"}}>
              {String(this.state.error)}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{background:"#2563eb",color:"white",border:"none",borderRadius:"8px",padding:"12px 24px",fontSize:"14px",fontWeight:"700",cursor:"pointer",width:"100%"}}
            >
              🔄 Kembali ke Halaman Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [screen, setScreen] = useState("login"); // login | guru-dashboard | student-exam | result
  const [guru, setGuru] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [examResult, setExamResult] = useState(null);

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {screen === "login" && (
          <LoginScreen
            onGuruLogin={(g) => { setGuru(g); setScreen("guru-dashboard"); }}
            onStudentJoin={(d) => { setStudentData(d); setScreen("student-exam"); }}
          />
        )}
        {screen === "guru-dashboard" && (
          <GuruDashboard guru={guru} onLogout={() => { setGuru(null); setScreen("login"); }} />
        )}
        {screen === "student-exam" && (
          <ErrorBoundary>
            <StudentExam
              data={studentData}
              onFinish={(result) => { setExamResult(result); setScreen("result"); }}
            />
          </ErrorBoundary>
        )}
        {screen === "result" && (
          <ResultScreen result={examResult} onBack={() => setScreen("login")} />
        )}
      </div>
    </>
  );
}

// ============================================================
// LOGIN SCREEN
// ============================================================
function LoginScreen({ onGuruLogin, onStudentJoin }) {
  const [tab, setTab] = useState("siswa");
  const [form, setForm] = useState({ username: "", password: "", nama: "", kelas: "", examKey: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleGuru = async () => {
    setError("");
    const acc = GURU_ACCOUNTS.find(a => a.username === form.username && a.password === form.password);
    if (!acc) return setError("Username atau password salah.");
    onGuruLogin(acc);
  };

  const handleSiswa = async () => {
    setError("");
    if (!form.nama.trim()) return setError("Nama tidak boleh kosong.");
    if (!form.kelas.trim()) return setError("Kelas tidak boleh kosong.");
    if (!form.examKey.trim()) return setError("Kode ujian tidak boleh kosong.");
    setLoading(true);
    try {
      let ujian;
      if (useDemo) {
        ujian = DEMO_UJIAN.find(u => u.key.toUpperCase() === form.examKey.toUpperCase() && u.aktif);
      } else {
        const data = await supabase(`ujian?key=eq.${form.examKey.toUpperCase()}&aktif=eq.true`);
        if (data.length > 0) {
          const soalRaw = await supabase(`soal?ujian_id=eq.${data[0].id}&order=id.asc`);
          // Parse opsi — bisa berupa array atau JSON string
          const soalParsed = soalRaw.map(s => ({
            ...s,
            opsi: Array.isArray(s.opsi)
              ? s.opsi
              : typeof s.opsi === 'string'
                ? (() => { try { return JSON.parse(s.opsi); } catch { return []; } })()
                : [],
          }));
          ujian = { ...data[0], soal: soalParsed };
        }
      }
      if (!ujian || !ujian.soal || ujian.soal.length === 0) {
        setError("Kode ujian tidak ditemukan, ujian tidak aktif, atau belum ada soal.");
      } else {
        // Cek jadwal jam buka/tutup
        if (ujian.jam_buka || ujian.jam_tutup) {
          const now = new Date();
          const toDate = (t) => { const [h,m] = t.split(":"); const d = new Date(); d.setHours(Number(h), Number(m), 0); return d; };
          if (ujian.jam_buka && now < toDate(ujian.jam_buka)) {
            setLoading(false);
            return setError(`⏰ Ujian belum dibuka. Ujian dibuka pukul ${ujian.jam_buka}.`);
          }
          if (ujian.jam_tutup && now > toDate(ujian.jam_tutup)) {
            setLoading(false);
            return setError(`⏰ Waktu ujian sudah berakhir pukul ${ujian.jam_tutup}.`);
          }
        }
        onStudentJoin({ ujian, siswa: { nama: form.nama, kelas: form.kelas } });
      }
    } catch (e) {
      console.error("Error login siswa:", e);
      setError("Gagal terhubung. Periksa koneksi internet. Detail: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon"><img src="data:image/jpeg;base64,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" alt="Logo SMPN 7" /></div>
          <h1>CBT<span>SMPN 7 Tanah Sepenggal</span></h1>
        </div>
        <p className="login-subtitle">Platform Ujian Digital SMPN 7 Tanah Sepenggal</p>
        <div className="login-tab">
          <button className={tab === "siswa" ? "active" : ""} onClick={() => { setTab("siswa"); setError(""); }}>👨‍🎓 Siswa</button>
          <button className={tab === "guru" ? "active" : ""} onClick={() => { setTab("guru"); setError(""); }}>👨‍🏫 Guru</button>
        </div>
        {error && <div className="error-msg">⚠️ {error}</div>}
        {tab === "siswa" ? (
          <>
            <div className="field"><label>Nama Lengkap</label><input placeholder="Nama lengkap Anda" value={form.nama} onChange={e => setForm(p => ({...p, nama: e.target.value}))} /></div>
            <div className="field"><label>Kelas</label><input placeholder="Contoh: X IPA 1" value={form.kelas} onChange={e => setForm(p => ({...p, kelas: e.target.value}))} /></div>
            <div className="field"><label>Kode Ujian</label><input placeholder="Masukkan kode dari guru" value={form.examKey} onChange={e => setForm(p => ({...p, examKey: e.target.value.toUpperCase()}))} style={{letterSpacing:"3px", fontFamily:"var(--mono)", fontWeight:"700"}} /></div>
            <button className="btn-primary" onClick={handleSiswa} disabled={loading}>{loading ? "Memuat..." : "🚀 Mulai Ujian"}</button>
            {useDemo && <p style={{color:"rgba(255,255,255,0.4)", fontSize:"12px", textAlign:"center", marginTop:"12px"}}>Demo: gunakan kode <strong style={{color:"#93c5fd"}}>MTK001</strong></p>}
          </>
        ) : (
          <>
            <div className="field"><label>Username</label><input placeholder="Username" value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))} /></div>
            <div className="field">
              <label>Password</label>
              <div style={{position:"relative"}}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Password"
                  value={form.password}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))}
                  style={{paddingRight:"48px"}}
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",fontSize:"18px",color:"rgba(255,255,255,0.6)",padding:"4px",lineHeight:"1"}}
                  title={showPass ? "Sembunyikan" : "Tampilkan password"}
                >{showPass ? "🙈" : "👁️"}</button>
              </div>
            </div>
            <button className="btn-primary" onClick={handleGuru}>🔐 Login Guru</button>
            {useDemo && <p style={{color:"rgba(255,255,255,0.4)", fontSize:"12px", textAlign:"center", marginTop:"12px"}}>Demo: admin / admin123</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// GURU DASHBOARD
// ============================================================
function GuruDashboard({ guru, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [ujianList, setUjianList] = useState([]);
  const [hasilList, setHasilList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (useDemo) {
        setUjianList([...DEMO_UJIAN]);
        setHasilList([...DEMO_HASIL]);
      } else {
        // Load ujian, soal, dan hasil sekaligus
        const [ujianRaw, soalRaw, hasilRaw] = await Promise.all([
          supabase("ujian?order=id.desc"),
          supabase("soal?order=ujian_id.asc,id.asc"),
          supabase("hasil?order=id.desc"),
        ]);
        // Gabungkan soal ke masing-masing ujian
        const ujianDenganSoal = ujianRaw.map(u => ({
          ...u,
          soal: soalRaw.filter(s => s.ujian_id === u.id).map(s => ({
            ...s,
            opsi: Array.isArray(s.opsi) ? s.opsi : (typeof s.opsi === 'string' ? JSON.parse(s.opsi) : []),
          }))
        }));
        setUjianList(ujianDenganSoal);
        setHasilList(hasilRaw);
      }
    } catch(e) {
      console.error("Gagal load data:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const menuItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "ujian", icon: "📋", label: "Kelola Ujian" },
    { id: "soal", icon: "✏️", label: "Buat Soal" },
    { id: "monitor", icon: "🖥️", label: "Monitor Ujian" },
    { id: "hasil", icon: "📈", label: "Hasil Ujian" },
  ];

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
            <img src="data:image/jpeg;base64,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" alt="Logo" style={{width:"40px",height:"40px",borderRadius:"50%",objectFit:"cover"}} />
            <div>
              <h2 style={{fontSize:"14px",lineHeight:"1.2"}}>CBT<span style={{color:"var(--blue)"}}> SMPN 7</span></h2>
              <p style={{fontSize:"10px",marginTop:"2px"}}>Tanah Sepenggal</p>
            </div>
          </div>
          <p style={{fontSize:"12px",color:"var(--gray2)"}}>Halo, {guru.nama}</p>
        </div>
        <div className="sidebar-menu">
          {menuItems.map(m => (
            <button key={m.id} className={page === m.id ? "active" : ""} onClick={() => setPage(m.id)}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <button onClick={onLogout}>🚪 Keluar</button>
        </div>
      </div>
      <div className="main">
        {loading ? (
          <div className="loading">⏳ Memuat data...</div>
        ) : (
          <>
            {page === "dashboard" && <DashboardPage ujianList={ujianList} hasilList={hasilList} />}
            {page === "ujian" && <UjianPage ujianList={ujianList} onRefresh={loadData} />}
            {page === "soal" && <SoalPage ujianList={ujianList} onRefresh={loadData} />}
            {page === "monitor" && <MonitorPage ujianList={ujianList} />}
            {page === "hasil" && <HasilPage hasilList={hasilList} ujianList={ujianList} />}
          </>
        )}
      </div>
    </div>
  );
}

// ---- Dashboard Overview ----
function DashboardPage({ ujianList, hasilList }) {
  const rataRata = hasilList.length ? Math.round(hasilList.reduce((a,h) => a + (h.nilai||0), 0) / hasilList.length) : 0;
  return (
    <>
      <div className="page-header"><h1>Dashboard</h1><p>Ringkasan aktivitas ujian sekolah</p></div>
      <div className="stats-grid">
        {[
          { icon: "📋", label: "Total Ujian", val: ujianList.length, bg: "#dbeafe", color: "#2563eb" },
          { icon: "✅", label: "Ujian Aktif", val: ujianList.filter(u=>u.aktif).length, bg: "#dcfce7", color: "#16a34a" },
          { icon: "👥", label: "Peserta", val: hasilList.length, bg: "#fef3c7", color: "#92400e" },
          { icon: "⭐", label: "Rata-rata Nilai", val: rataRata, bg: "#f3e8ff", color: "#7c3aed" },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{background:s.bg}}>{s.icon}</div>
            <div className="stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><h2>📊 Hasil Terbaru</h2></div>
        {hasilList.length === 0 ? (
          <div className="empty-state"><div className="icon">📭</div><p>Belum ada hasil ujian</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nama</th><th>Kelas</th><th>Mata Pelajaran</th><th>Nilai</th><th>Status</th></tr></thead>
              <tbody>
                {hasilList.slice(0,10).map((h,i) => (
                  <tr key={i}>
                    <td><strong>{h.nama_siswa}</strong></td>
                    <td>{h.kelas}</td>
                    <td>{h.mapel}</td>
                    <td><strong style={{fontFamily:"var(--mono)"}}>{h.nilai}</strong></td>
                    <td><span className={`badge ${h.nilai >= 75 ? "badge-green" : "badge-red"}`}>{h.nilai >= 75 ? "Lulus" : "Remedi"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ---- Kelola Ujian ----
function UjianPage({ ujianList, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [showKey, setShowKey] = useState(null);
  const [editUjian, setEditUjian] = useState(null); // ujian yang sedang diedit
  const [form, setForm] = useState({ mapel: MAPEL[0], kelas: "", durasi: 60, jam_buka: "", jam_tutup: "" });
  const [saving, setSaving] = useState(false);
  const [confirmHapus, setConfirmHapus] = useState(null); // ujian yang akan dihapus

  const resetForm = () => {
    setForm({ mapel: MAPEL[0], kelas: "", durasi: 60, jam_buka: "", jam_tutup: "" });
    setEditUjian(null);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.kelas.trim()) return alert("Kelas tidak boleh kosong.");
    setSaving(true);
    try {
      if (useDemo) {
        DEMO_UJIAN.push({ ...form, durasi: Number(form.durasi), key: genKey(), aktif: true, soal: [], id: Date.now() });
      } else {
        await supabase("ujian", { method: "POST", body: JSON.stringify({ mapel: form.mapel, kelas: form.kelas, durasi: Number(form.durasi), key: genKey(), aktif: true, jam_buka: form.jam_buka || null, jam_tutup: form.jam_tutup || null }) });
      }
      await onRefresh();
      resetForm();
    } catch(e) { alert("Gagal membuat ujian: " + e.message); }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!form.kelas.trim()) return alert("Kelas tidak boleh kosong.");
    setSaving(true);
    try {
      if (useDemo) {
        const idx = DEMO_UJIAN.findIndex(u => u.id === editUjian.id);
        if (idx > -1) DEMO_UJIAN[idx] = { ...DEMO_UJIAN[idx], mapel: form.mapel, kelas: form.kelas, durasi: Number(form.durasi), jam_buka: form.jam_buka || null, jam_tutup: form.jam_tutup || null };
      } else {
        await supabase(`ujian?id=eq.${editUjian.id}`, { method: "PATCH", body: JSON.stringify({ mapel: form.mapel, kelas: form.kelas, durasi: Number(form.durasi), jam_buka: form.jam_buka || null, jam_tutup: form.jam_tutup || null }) });
      }
      await onRefresh();
      resetForm();
    } catch(e) { alert("Gagal edit ujian: " + e.message); }
    setSaving(false);
  };

  const handleHapus = async (ujian) => {
    setSaving(true);
    try {
      if (useDemo) {
        const idx = DEMO_UJIAN.findIndex(u => u.id === ujian.id);
        if (idx > -1) DEMO_UJIAN.splice(idx, 1);
      } else {
        // Hapus soal dulu, baru ujian
        await supabase(`soal?ujian_id=eq.${ujian.id}`, { method: "DELETE" });
        await supabase(`hasil?ujian_id=eq.${ujian.id}`, { method: "DELETE" });
        await supabase(`ujian?id=eq.${ujian.id}`, { method: "DELETE" });
      }
      await onRefresh();
      setConfirmHapus(null);
    } catch(e) { alert("Gagal hapus: " + e.message); }
    setSaving(false);
  };

  const toggleAktif = async (ujian) => {
    try {
      if (useDemo) {
        const idx = DEMO_UJIAN.findIndex(u => u.id === ujian.id);
        if (idx > -1) DEMO_UJIAN[idx].aktif = !DEMO_UJIAN[idx].aktif;
      } else {
        await supabase(`ujian?id=eq.${ujian.id}`, { method: "PATCH", body: JSON.stringify({ aktif: !ujian.aktif }) });
      }
      await onRefresh();
    } catch(e) { alert("Gagal update: " + e.message); }
  };

  const bukaFormEdit = (ujian) => {
    setEditUjian(ujian);
    setForm({ mapel: ujian.mapel, kelas: ujian.kelas, durasi: ujian.durasi, jam_buka: ujian.jam_buka || "", jam_tutup: ujian.jam_tutup || "" });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const getJadwalStatus = (u) => {
    if (!u.jam_buka && !u.jam_tutup) return null;
    const now = new Date();
    const pad = (t) => { const [h,m] = t.split(":"); const d = new Date(); d.setHours(h,m,0); return d; };
    if (u.jam_buka && now < pad(u.jam_buka)) return { label: `Buka ${u.jam_buka}`, color: "badge-yellow" };
    if (u.jam_tutup && now > pad(u.jam_tutup)) return { label: `Tutup ${u.jam_tutup}`, color: "badge-red" };
    return { label: `Buka s/d ${u.jam_tutup||"∞"}`, color: "badge-green" };
  };

  return (
    <>
      <div className="page-header"><h1>Kelola Ujian</h1><p>Buat, edit, dan atur sesi ujian</p></div>
      <div className="card">
        <div className="card-header">
          <h2>Daftar Ujian ({ujianList.length})</h2>
          <button className="btn btn-blue" onClick={() => { resetForm(); setShowForm(true); }}>+ Buat Ujian</button>
        </div>

        {/* Form Buat / Edit Ujian */}
        {showForm && (
          <div style={{background: editUjian ? "var(--yellow3)" : "var(--light)", borderRadius:"var(--radius)", padding:"20px", marginBottom:"20px", border: editUjian ? "1.5px solid var(--yellow)" : "none"}}>
            <h3 style={{marginBottom:"16px", fontSize:"15px", fontWeight:"700"}}>
              {editUjian ? `✏️ Edit Ujian: ${editUjian.mapel} — ${editUjian.kelas}` : "Ujian Baru"}
            </h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Mata Pelajaran</label>
                <select value={form.mapel} onChange={e => setForm(p=>({...p, mapel:e.target.value}))}>
                  {MAPEL.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-field"><label>Kelas</label><input value={form.kelas} onChange={e => setForm(p=>({...p, kelas:e.target.value}))} placeholder="VII A" /></div>
              <div className="form-field"><label>Durasi (menit)</label><input type="number" value={form.durasi} onChange={e => setForm(p=>({...p, durasi:e.target.value}))} /></div>
              <div className="form-field"><label>⏰ Jam Buka (opsional)</label><input type="time" value={form.jam_buka} onChange={e => setForm(p=>({...p, jam_buka:e.target.value}))} /></div>
              <div className="form-field"><label>⏰ Jam Tutup (opsional)</label><input type="time" value={form.jam_tutup} onChange={e => setForm(p=>({...p, jam_tutup:e.target.value}))} /></div>
            </div>
            <div style={{background:"rgba(255,255,255,0.7)", borderRadius:"8px", padding:"10px 14px", fontSize:"12px", marginBottom:"16px", color:"#92400e"}}>
              💡 Jam Buka/Tutup opsional. Kosongkan jika tidak perlu jadwal otomatis.
            </div>
            <div style={{display:"flex", gap:"8px"}}>
              <button className="btn btn-green" onClick={editUjian ? handleEdit : handleCreate} disabled={saving}>
                {saving ? "Menyimpan..." : editUjian ? "💾 Simpan Perubahan" : "✅ Buat Ujian"}
              </button>
              <button className="btn btn-ghost" onClick={resetForm}>Batal</button>
            </div>
          </div>
        )}

        <div className="ujian-grid">
          {ujianList.map(u => {
            const jadwal = getJadwalStatus(u);
            return (
              <div key={u.id} className="ujian-card">
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px"}}>
                  <h3 style={{margin:0}}>{u.mapel}</h3>
                  <span className={`badge ${u.aktif ? "badge-green" : "badge-red"}`}>{u.aktif ? "Aktif" : "Nonaktif"}</span>
                </div>
                <div className="meta">Kelas {u.kelas} • {u.durasi} menit • {(u.soal||[]).length} soal</div>
                {u.jam_buka && <div style={{fontSize:"12px", color:"var(--gray)", marginBottom:"4px"}}>⏰ {u.jam_buka} – {u.jam_tutup||"∞"}</div>}
                {jadwal && <span className={`badge ${jadwal.color}`} style={{marginBottom:"8px", display:"inline-block"}}>{jadwal.label}</span>}
                <div className="key-badge">{u.key}</div>
                <div className="actions" style={{marginTop:"12px"}}>
                  <button className="btn btn-blue" onClick={() => setShowKey(u)}>🔑 Kode</button>
                  <button className="btn btn-ghost" onClick={() => bukaFormEdit(u)}>✏️ Edit</button>
                  <button className={`btn ${u.aktif ? "btn-red" : "btn-green"}`} onClick={() => toggleAktif(u)}>
                    {u.aktif ? "⏸ Nonaktif" : "▶ Aktif"}
                  </button>
                  <button className="btn btn-red" onClick={() => setConfirmHapus(u)}>🗑️ Hapus</button>
                </div>
              </div>
            );
          })}
          {ujianList.length === 0 && <div className="empty-state"><div className="icon">📋</div><p>Belum ada ujian.</p></div>}
        </div>
      </div>

      {/* Modal Kode Ujian */}
      {showKey && (
        <div className="modal-overlay" onClick={() => setShowKey(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🔑 Kode Ujian</h2>
            <p>Bagikan kode ini kepada siswa untuk ujian {showKey.mapel}</p>
            <div className="exam-key-display">
              <div className="key">{showKey.key}</div>
              <p>Kelas {showKey.kelas} • {showKey.durasi} menit</p>
            </div>
            <button className="btn btn-blue" style={{width:"100%"}} onClick={() => { navigator.clipboard?.writeText(showKey.key); alert("Kode disalin!"); }}>📋 Salin Kode</button>
            <div style={{height:"8px"}}/>
            <button className="btn btn-ghost" style={{width:"100%"}} onClick={() => setShowKey(null)}>Tutup</button>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {confirmHapus && (
        <div className="modal-overlay" onClick={() => setConfirmHapus(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{fontSize:"48px", textAlign:"center", marginBottom:"12px"}}>⚠️</div>
            <h2 style={{textAlign:"center"}}>Hapus Ujian?</h2>
            <p style={{textAlign:"center", color:"var(--gray)"}}>
              Anda akan menghapus ujian <strong>{confirmHapus.mapel} — Kelas {confirmHapus.kelas}</strong> beserta seluruh soal dan hasil nilainya.
            </p>
            <div style={{background:"var(--red3)", borderRadius:"var(--radius2)", padding:"12px", margin:"16px 0", fontSize:"13px", color:"var(--red2)", fontWeight:"600", textAlign:"center"}}>
              ❌ Tindakan ini tidak bisa dibatalkan!
            </div>
            <div style={{display:"flex", gap:"8px"}}>
              <button className="btn btn-red" style={{flex:1, padding:"12px"}} onClick={() => handleHapus(confirmHapus)} disabled={saving}>
                {saving ? "Menghapus..." : "🗑️ Ya, Hapus"}
              </button>
              <button className="btn btn-ghost" style={{flex:1, padding:"12px"}} onClick={() => setConfirmHapus(null)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---- Buat Soal ----
function SoalPage({ ujianList, onRefresh }) {
  const [selectedUjian, setSelectedUjian] = useState("");
  const [soalList, setSoalList] = useState([]);
  const [form, setForm] = useState({ pertanyaan: "", gambar: "", opsi: ["","","",""], jawaban: 0 });
  const [editSoal, setEditSoal] = useState(null); // soal yang sedang diedit
  const [saving, setSaving] = useState(false);
  const [uploadMode, setUploadMode] = useState("manual");
  const [uploadStatus, setUploadStatus] = useState("");
  const [previewSoal, setPreviewSoal] = useState([]);
  const [importing, setImporting] = useState(false);
  const [hapusSemua, setHapusSemua] = useState(false);

  useEffect(() => {
    if (selectedUjian) {
      const u = ujianList.find(u => String(u.id) === selectedUjian);
      setSoalList(u?.soal || []);
    }
  }, [selectedUjian, ujianList]);

  const resetForm = () => {
    setForm({ pertanyaan: "", gambar: "", opsi: ["","","",""], jawaban: 0 });
    setEditSoal(null);
  };

  const handleSave = async () => {
    if (!selectedUjian) return alert("Pilih ujian terlebih dahulu.");
    if (!form.pertanyaan.trim()) return alert("Pertanyaan tidak boleh kosong.");
    if (form.opsi.some(o => !o.trim())) return alert("Semua opsi harus diisi.");
    setSaving(true);
    try {
      if (editSoal) {
        // MODE EDIT
        if (useDemo) {
          const idx = DEMO_UJIAN.findIndex(u => String(u.id) === selectedUjian);
          if (idx > -1) {
            const si = DEMO_UJIAN[idx].soal.findIndex(s => s.id === editSoal.id);
            if (si > -1) DEMO_UJIAN[idx].soal[si] = { ...editSoal, ...form, opsi: [...form.opsi] };
          }
        } else {
          await supabase(`soal?id=eq.${editSoal.id}`, { method: "PATCH", body: JSON.stringify({ pertanyaan: form.pertanyaan, gambar: form.gambar || null, opsi: form.opsi, jawaban: form.jawaban }) });
        }
        await onRefresh();
        setSoalList(prev => prev.map(s => s.id === editSoal.id ? { ...s, ...form, opsi: [...form.opsi] } : s));
        resetForm();
      } else {
        // MODE TAMBAH BARU
        const soalBaru = { ...form, opsi: [...form.opsi], id: Date.now() };
        if (useDemo) {
          const idx = DEMO_UJIAN.findIndex(u => String(u.id) === selectedUjian);
          if (idx > -1) { DEMO_UJIAN[idx].soal = [...(DEMO_UJIAN[idx].soal||[]), soalBaru]; }
        } else {
          await supabase("soal", { method: "POST", body: JSON.stringify({ ujian_id: Number(selectedUjian), pertanyaan: form.pertanyaan, gambar: form.gambar || null, opsi: form.opsi, jawaban: form.jawaban }) });
        }
        await onRefresh();
        setSoalList(prev => [...prev, soalBaru]);
        resetForm();
      }
    } catch(e) { alert("Gagal menyimpan: " + e.message); }
    setSaving(false);
  };

  const handleEdit = (s) => {
    setEditSoal(s);
    setForm({ pertanyaan: s.pertanyaan, gambar: s.gambar || "", opsi: [...s.opsi], jawaban: s.jawaban });
    setUploadMode("manual");
    window.scrollTo(0, 400);
  };

  const handleDelete = async (soalId) => {
    if (!confirm("Hapus soal ini?")) return;
    try {
      if (useDemo) {
        const idx = DEMO_UJIAN.findIndex(u => String(u.id) === selectedUjian);
        if (idx > -1) DEMO_UJIAN[idx].soal = DEMO_UJIAN[idx].soal.filter(s => s.id !== soalId);
      } else {
        await supabase(`soal?id=eq.${soalId}`, { method: "DELETE" });
      }
      await onRefresh();
      setSoalList(prev => prev.filter(s => s.id !== soalId));
      if (editSoal?.id === soalId) resetForm();
    } catch(e) { alert("Gagal hapus: " + e.message); }
  };

  const handleHapusSemua = async () => {
    setSaving(true);
    try {
      if (useDemo) {
        const idx = DEMO_UJIAN.findIndex(u => String(u.id) === selectedUjian);
        if (idx > -1) DEMO_UJIAN[idx].soal = [];
      } else {
        await supabase(`soal?ujian_id=eq.${selectedUjian}`, { method: "DELETE" });
      }
      await onRefresh();
      setSoalList([]);
      setHapusSemua(false);
      resetForm();
    } catch(e) { alert("Gagal hapus: " + e.message); }
    setSaving(false);
  };

  // ── EXCEL PARSER ──────────────────────────────────────────
  const parseExcel = (file) => {
    setUploadStatus("⏳ Membaca file Excel...");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        // Manual CSV-like parsing for simple xlsx (read as binary)
        // We use SheetJS via CDN loaded dynamically
        if (window.XLSX) {
          const wb = window.XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          const parsed = parseRowsToSoal(rows);
          if (parsed.length === 0) {
            setUploadStatus("❌ Tidak ada soal yang terbaca. Pastikan format sesuai template.");
          } else {
            setPreviewSoal(parsed);
            setUploadStatus(`✅ Berhasil membaca ${parsed.length} soal. Cek preview lalu klik Import.`);
          }
        } else {
          setUploadStatus("❌ Library Excel belum siap. Refresh halaman dan coba lagi.");
        }
      } catch(err) {
        setUploadStatus("❌ Gagal membaca file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── WORD PARSER ───────────────────────────────────────────
  const parseWord = (file) => {
    setUploadStatus("⏳ Membaca file Word...");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (window.mammoth) {
          window.mammoth.extractRawText({ arrayBuffer: e.target.result })
            .then(result => {
              const text = result.value;
              const parsed = parseTextToSoal(text);
              if (parsed.length === 0) {
                setUploadStatus("❌ Tidak ada soal yang terbaca. Pastikan format sesuai template.");
              } else {
                setPreviewSoal(parsed);
                setUploadStatus(`✅ Berhasil membaca ${parsed.length} soal. Cek preview lalu klik Import.`);
              }
            });
        } else {
          setUploadStatus("❌ Library Word belum siap. Refresh halaman dan coba lagi.");
        }
      } catch(err) {
        setUploadStatus("❌ Gagal membaca file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Parse baris Excel → array soal
  // Format: Kolom A=Pertanyaan, B=Opsi A, C=Opsi B, D=Opsi C, E=Opsi D, F=Jawaban Benar (A/B/C/D)
  const parseRowsToSoal = (rows) => {
    const hasil = [];
    for (let i = 1; i < rows.length; i++) { // skip header baris 0
      const row = rows[i];
      const pertanyaan = String(row[0] || "").trim();
      const opsiA = String(row[1] || "").trim();
      const opsiB = String(row[2] || "").trim();
      const opsiC = String(row[3] || "").trim();
      const opsiD = String(row[4] || "").trim();
      const jwbRaw = String(row[5] || "").trim().toUpperCase();
      if (!pertanyaan || !opsiA) continue;
      const jwbMap = { "A":0, "B":1, "C":2, "D":3 };
      const jawaban = jwbMap[jwbRaw] ?? 0;
      hasil.push({ id: Date.now() + i, pertanyaan, opsi: [opsiA, opsiB, opsiC, opsiD], jawaban });
    }
    return hasil;
  };

  // Parse teks Word → array soal
  // Format: 1. Pertanyaan\nA. Opsi A\nB. Opsi B\nC. Opsi C\nD. Opsi D\nJawaban: A
  const parseTextToSoal = (text) => {
    const hasil = [];
    const blocks = text.split(/\n(?=\d+[\.\)])/);
    for (const block of blocks) {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 5) continue;
      const pertanyaan = lines[0].replace(/^\d+[\.\)]\s*/, "").trim();
      const opsi = [];
      let jawaban = 0;
      for (let i = 1; i < lines.length; i++) {
        const match = lines[i].match(/^([A-D])[\.\)]\s*(.+)/i);
        if (match) opsi.push(match[2].trim());
        const jwbMatch = lines[i].match(/^[Jj]awaban\s*:\s*([A-D])/i);
        if (jwbMatch) jawaban = ["A","B","C","D"].indexOf(jwbMatch[1].toUpperCase());
      }
      if (pertanyaan && opsi.length >= 2) {
        while (opsi.length < 4) opsi.push("-");
        hasil.push({ id: Date.now() + hasil.length, pertanyaan, opsi: opsi.slice(0,4), jawaban });
      }
    }
    return hasil;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewSoal([]);
    setUploadStatus("");
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "xlsx" || ext === "xls") parseExcel(file);
    else if (ext === "docx") parseWord(file);
    else setUploadStatus("❌ Format tidak didukung. Gunakan .xlsx atau .docx");
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!selectedUjian) return alert("Pilih ujian terlebih dahulu.");
    if (previewSoal.length === 0) return;
    setImporting(true);
    let berhasil = 0;
    try {
      for (const s of previewSoal) {
        if (useDemo) {
          const idx = DEMO_UJIAN.findIndex(u => String(u.id) === selectedUjian);
          if (idx > -1) DEMO_UJIAN[idx].soal = [...(DEMO_UJIAN[idx].soal||[]), s];
        } else {
          await supabase("soal", { method: "POST", body: JSON.stringify({ ujian_id: Number(selectedUjian), pertanyaan: s.pertanyaan, opsi: s.opsi, jawaban: s.jawaban }) });
        }
        berhasil++;
      }
      await onRefresh();
      setPreviewSoal([]);
      setUploadStatus(`🎉 ${berhasil} soal berhasil diimport!`);
    } catch(e) {
      setUploadStatus(`❌ Gagal import soal ke-${berhasil+1}: ${e.message}`);
    }
    setImporting(false);
  };

  // Load libraries dynamically
  useEffect(() => {
    if (!window.XLSX) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      document.head.appendChild(s);
    }
    if (!window.mammoth) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
      document.head.appendChild(s);
    }
  }, []);

  const HURUF = ["A","B","C","D"];

  return (
    <>
      <div className="page-header"><h1>Buat Soal</h1><p>Tambahkan soal ke ujian yang sudah dibuat</p></div>
      <div className="card">
        <div className="card-header"><h2>Pilih Ujian</h2></div>
        <div className="form-field" style={{maxWidth:"360px"}}>
          <select value={selectedUjian} onChange={e => setSelectedUjian(e.target.value)}>
            <option value="">-- Pilih Ujian --</option>
            {ujianList.map(u => <option key={u.id} value={u.id}>{u.mapel} - Kelas {u.kelas}</option>)}
          </select>
        </div>
      </div>

      {selectedUjian && (
        <>
          {/* Tab pilih mode input */}
          <div className="card" style={{padding:"16px"}}>
            <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}>
              {[["manual","✏️ Input Manual"],["excel","📊 Upload Excel"],["word","📄 Upload Word"]].map(([m,l]) => (
                <button key={m} className={`btn ${uploadMode===m?"btn-blue":"btn-ghost"}`} onClick={() => { setUploadMode(m); setPreviewSoal([]); setUploadStatus(""); }}>{l}</button>
              ))}
            </div>
          </div>

          {/* MODE: MANUAL */}
          {uploadMode === "manual" && (
            <div className="card" style={{border: editSoal ? "2px solid var(--yellow)" : "1px solid var(--border)"}}>
              <div className="card-header">
                <h2>{editSoal ? "✏️ Edit Soal" : "✏️ Tambah Soal Manual"}</h2>
                <div style={{display:"flex", gap:"8px", alignItems:"center"}}>
                  <span className="badge badge-blue">{soalList.length} soal</span>
                  {editSoal && <button className="btn btn-ghost" style={{fontSize:"12px"}} onClick={resetForm}>✕ Batal Edit</button>}
                </div>
              </div>
              {editSoal && (
                <div style={{background:"var(--yellow3)", borderRadius:"var(--radius2)", padding:"10px 14px", marginBottom:"16px", fontSize:"13px", color:"#92400e", fontWeight:"600"}}>
                  ✏️ Mode Edit — Anda sedang mengedit Soal {soalList.findIndex(s => s.id === editSoal.id) + 1}
                </div>
              )}
              <div className="form-field">
                <label>Pertanyaan</label>
                <textarea value={form.pertanyaan} onChange={e => setForm(p=>({...p, pertanyaan:e.target.value}))} placeholder="Tulis pertanyaan di sini..." rows={3} />
              </div>
              <div className="form-field">
                <label>🖼️ URL Gambar (opsional)</label>
                <input
                  value={form.gambar}
                  onChange={e => setForm(p=>({...p, gambar:e.target.value}))}
                  placeholder="Paste link gambar dari ImgBB/Google Drive (kosongkan jika tidak ada)"
                />
                {form.gambar && (
                  <div style={{marginTop:"8px", borderRadius:"var(--radius2)", overflow:"hidden", border:"1px solid var(--border)", maxHeight:"200px"}}>
                    <img src={form.gambar} alt="Preview" style={{width:"100%", objectFit:"contain", maxHeight:"200px"}}
                      onError={e => { e.target.style.display="none"; }}
                    />
                  </div>
                )}
              </div>
              <label style={{fontSize:"13px", fontWeight:"700", color:"var(--navy3)", display:"block", marginBottom:"10px"}}>Pilihan Jawaban <span style={{color:"var(--green)", fontWeight:"600"}}>(✓ = Jawaban Benar)</span></label>
              {HURUF.map((h,i) => (
                <div key={i} className={`option-row ${form.jawaban === i ? "correct" : ""}`}>
                  <div className="option-label">{h}</div>
                  <input value={form.opsi[i]} onChange={e => { const o = [...form.opsi]; o[i] = e.target.value; setForm(p=>({...p, opsi:o})); }} placeholder={`Opsi ${h}`} />
                  <button className={`btn ${form.jawaban === i ? "btn-green" : "btn-ghost"}`} onClick={() => setForm(p=>({...p, jawaban:i}))}>✓</button>
                </div>
              ))}
              <div style={{marginTop:"16px", display:"flex", gap:"8px"}}>
                <button className="btn btn-blue" onClick={handleSave} disabled={saving}>
                  {saving ? "Menyimpan..." : editSoal ? "💾 Simpan Perubahan" : "💾 Simpan Soal"}
                </button>
                {editSoal && <button className="btn btn-ghost" onClick={resetForm}>✕ Batal</button>}
              </div>
            </div>
          )}

          {/* MODE: EXCEL */}
          {uploadMode === "excel" && (
            <div className="card">
              <div className="card-header"><h2>📊 Upload Soal dari Excel</h2></div>
              {/* Panduan format */}
              <div style={{background:"var(--blue3)", borderRadius:"var(--radius2)", padding:"16px", marginBottom:"20px"}}>
                <div style={{fontSize:"13px", fontWeight:"700", color:"var(--blue2)", marginBottom:"8px"}}>📋 Format Excel yang Harus Digunakan:</div>
                <div style={{fontSize:"12px", color:"var(--navy3)", lineHeight:"1.8"}}>
                  <strong>Baris 1 (Header):</strong> Pertanyaan | Opsi A | Opsi B | Opsi C | Opsi D | Jawaban<br/>
                  <strong>Baris 2 dst (Soal):</strong> Isi pertanyaan | Opsi A | Opsi B | Opsi C | Opsi D | A/B/C/D<br/>
                  <strong>Kolom Jawaban:</strong> isi huruf A, B, C, atau D (huruf kapital)
                </div>
                <div style={{marginTop:"10px", fontSize:"12px", background:"white", borderRadius:"6px", padding:"10px", fontFamily:"var(--mono)"}}>
                  <div style={{color:"var(--gray)", borderBottom:"1px solid var(--border)", paddingBottom:"4px", marginBottom:"4px"}}>Pertanyaan | Opsi A | Opsi B | Opsi C | Opsi D | Jawaban</div>
                  <div>Ibu kota Indonesia? | Jakarta | Bandung | Surabaya | Medan | A</div>
                  <div>2 + 2 = ? | 3 | 4 | 5 | 6 | B</div>
                </div>
              </div>
              <div style={{border:"2px dashed var(--blue)", borderRadius:"var(--radius)", padding:"32px", textAlign:"center"}}>
                <div style={{fontSize:"36px", marginBottom:"8px"}}>📊</div>
                <div style={{fontSize:"14px", fontWeight:"600", marginBottom:"4px"}}>Pilih file Excel (.xlsx)</div>
                <div style={{fontSize:"12px", color:"var(--gray)", marginBottom:"16px"}}>Format .xlsx atau .xls</div>
                <label className="btn btn-blue" style={{cursor:"pointer"}}>
                  📂 Pilih File Excel
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{display:"none"}} />
                </label>
              </div>
              {uploadStatus && (
                <div style={{marginTop:"12px", padding:"12px 16px", borderRadius:"var(--radius2)", background: uploadStatus.startsWith("✅")||uploadStatus.startsWith("🎉") ? "var(--green3)" : uploadStatus.startsWith("⏳") ? "var(--yellow3)" : "var(--red3)", fontSize:"14px", fontWeight:"500"}}>
                  {uploadStatus}
                </div>
              )}
              {previewSoal.length > 0 && (
                <div style={{marginTop:"16px"}}>
                  <div style={{fontSize:"14px", fontWeight:"700", marginBottom:"12px"}}>Preview {previewSoal.length} soal:</div>
                  {previewSoal.slice(0,3).map((s,i) => (
                    <div key={i} style={{border:"1px solid var(--border)", borderRadius:"var(--radius2)", padding:"12px", marginBottom:"8px", fontSize:"13px"}}>
                      <div style={{fontWeight:"600", marginBottom:"6px"}}>Soal {i+1}: {s.pertanyaan}</div>
                      <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                        {s.opsi.map((o,j) => <span key={j} style={{padding:"2px 8px", borderRadius:"99px", background: j===s.jawaban?"var(--green3)":"var(--light)", color: j===s.jawaban?"var(--green2)":"var(--gray)", fontSize:"12px"}}>{HURUF[j]}. {o}</span>)}
                      </div>
                    </div>
                  ))}
                  {previewSoal.length > 3 && <div style={{fontSize:"12px", color:"var(--gray)", textAlign:"center", marginBottom:"12px"}}>...dan {previewSoal.length-3} soal lainnya</div>}
                  <button className="btn btn-green" style={{width:"100%", padding:"12px"}} onClick={handleImport} disabled={importing}>
                    {importing ? "⏳ Mengimport..." : `🚀 Import ${previewSoal.length} Soal ke Ujian`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE: WORD */}
          {uploadMode === "word" && (
            <div className="card">
              <div className="card-header"><h2>📄 Upload Soal dari Word</h2></div>
              {/* Panduan format */}
              <div style={{background:"var(--blue3)", borderRadius:"var(--radius2)", padding:"16px", marginBottom:"20px"}}>
                <div style={{fontSize:"13px", fontWeight:"700", color:"var(--blue2)", marginBottom:"8px"}}>📋 Format Word yang Harus Digunakan:</div>
                <div style={{fontSize:"12px", color:"var(--navy3)", lineHeight:"1.8", marginBottom:"10px"}}>
                  Tulis soal dengan format berikut, satu soal per blok:
                </div>
                <div style={{fontSize:"12px", background:"white", borderRadius:"6px", padding:"12px", fontFamily:"var(--mono)", lineHeight:"1.8"}}>
                  <div>1. Ibu kota Indonesia adalah?</div>
                  <div>A. Bandung</div>
                  <div>B. Jakarta</div>
                  <div>C. Surabaya</div>
                  <div>D. Medan</div>
                  <div style={{color:"var(--green2)", fontWeight:"700"}}>Jawaban: B</div>
                  <div style={{color:"var(--gray)", margin:"4px 0"}}>---</div>
                  <div>2. 2 + 2 sama dengan?</div>
                  <div>A. 3</div>
                  <div>B. 5</div>
                  <div>C. 4</div>
                  <div>D. 6</div>
                  <div style={{color:"var(--green2)", fontWeight:"700"}}>Jawaban: C</div>
                </div>
              </div>
              <div style={{border:"2px dashed var(--green)", borderRadius:"var(--radius)", padding:"32px", textAlign:"center"}}>
                <div style={{fontSize:"36px", marginBottom:"8px"}}>📄</div>
                <div style={{fontSize:"14px", fontWeight:"600", marginBottom:"4px"}}>Pilih file Word (.docx)</div>
                <div style={{fontSize:"12px", color:"var(--gray)", marginBottom:"16px"}}>Format .docx (Microsoft Word 2007+)</div>
                <label className="btn btn-green" style={{cursor:"pointer"}}>
                  📂 Pilih File Word
                  <input type="file" accept=".docx" onChange={handleFileUpload} style={{display:"none"}} />
                </label>
              </div>
              {uploadStatus && (
                <div style={{marginTop:"12px", padding:"12px 16px", borderRadius:"var(--radius2)", background: uploadStatus.startsWith("✅")||uploadStatus.startsWith("🎉") ? "var(--green3)" : uploadStatus.startsWith("⏳") ? "var(--yellow3)" : "var(--red3)", fontSize:"14px", fontWeight:"500"}}>
                  {uploadStatus}
                </div>
              )}
              {previewSoal.length > 0 && (
                <div style={{marginTop:"16px"}}>
                  <div style={{fontSize:"14px", fontWeight:"700", marginBottom:"12px"}}>Preview {previewSoal.length} soal:</div>
                  {previewSoal.slice(0,3).map((s,i) => (
                    <div key={i} style={{border:"1px solid var(--border)", borderRadius:"var(--radius2)", padding:"12px", marginBottom:"8px", fontSize:"13px"}}>
                      <div style={{fontWeight:"600", marginBottom:"6px"}}>Soal {i+1}: {s.pertanyaan}</div>
                      <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                        {s.opsi.map((o,j) => <span key={j} style={{padding:"2px 8px", borderRadius:"99px", background: j===s.jawaban?"var(--green3)":"var(--light)", color: j===s.jawaban?"var(--green2)":"var(--gray)", fontSize:"12px"}}>{HURUF[j]}. {o}</span>)}
                      </div>
                    </div>
                  ))}
                  {previewSoal.length > 3 && <div style={{fontSize:"12px", color:"var(--gray)", textAlign:"center", marginBottom:"12px"}}>...dan {previewSoal.length-3} soal lainnya</div>}
                  <button className="btn btn-green" style={{width:"100%", padding:"12px"}} onClick={handleImport} disabled={importing}>
                    {importing ? "⏳ Mengimport..." : `🚀 Import ${previewSoal.length} Soal ke Ujian`}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h2>📝 Daftar Soal</h2>
              <div style={{display:"flex", gap:"8px", alignItems:"center"}}>
                <span className="badge badge-blue">{soalList.length} soal</span>
                {soalList.length > 0 && (
                  <button className="btn btn-red" style={{fontSize:"12px"}} onClick={() => setHapusSemua(true)}>🗑️ Hapus Semua</button>
                )}
              </div>
            </div>
            {soalList.length === 0 ? (
              <div className="empty-state"><div className="icon">✏️</div><p>Belum ada soal. Tambahkan soal di atas.</p></div>
            ) : (
              soalList.map((s, idx) => (
                <div key={s.id} style={{border:`2px solid ${editSoal?.id === s.id ? "var(--yellow)" : "var(--border)"}`, borderRadius:"var(--radius2)", padding:"16px", marginBottom:"12px", background: editSoal?.id === s.id ? "var(--yellow3)" : "white"}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"12px", fontWeight:"700", color:"var(--blue)", marginBottom:"6px"}}>SOAL {idx+1} {editSoal?.id === s.id ? "— ✏️ Sedang Diedit" : ""}</div>
                      {s.gambar && (
                        <div style={{marginBottom:"8px", borderRadius:"6px", overflow:"hidden", border:"1px solid var(--border)", maxHeight:"120px", display:"flex", alignItems:"center", background:"var(--light)"}}>
                          <img src={s.gambar} alt="gambar soal" style={{maxHeight:"120px", objectFit:"contain", width:"100%"}} onError={e => e.target.style.display="none"} />
                        </div>
                      )}
                      <div style={{fontSize:"14px", fontWeight:"500", marginBottom:"10px"}}>{s.pertanyaan}</div>
                      <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}>
                        {s.opsi.map((o,i) => (
                          <span key={i} style={{fontSize:"12px", padding:"3px 10px", borderRadius:"99px", background: i === s.jawaban ? "var(--green3)" : "var(--light)", color: i === s.jawaban ? "var(--green2)" : "var(--gray)", fontWeight: i === s.jawaban ? "700" : "500"}}>
                            {HURUF[i]}. {o}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{display:"flex", flexDirection:"column", gap:"6px", marginLeft:"12px"}}>
                      <button className="btn btn-ghost" style={{fontSize:"12px"}} onClick={() => handleEdit(s)}>✏️ Edit</button>
                      <button className="btn btn-red" style={{fontSize:"12px"}} onClick={() => handleDelete(s.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal Konfirmasi Hapus Semua */}
          {hapusSemua && (
            <div className="modal-overlay">
              <div className="modal">
                <div style={{fontSize:"48px", textAlign:"center", marginBottom:"12px"}}>⚠️</div>
                <h2 style={{textAlign:"center"}}>Hapus Semua Soal?</h2>
                <p style={{textAlign:"center", color:"var(--gray)"}}>Semua <strong>{soalList.length} soal</strong> pada ujian ini akan dihapus permanen.</p>
                <div style={{background:"var(--red3)", borderRadius:"var(--radius2)", padding:"10px", margin:"16px 0", fontSize:"13px", color:"var(--red2)", fontWeight:"600", textAlign:"center"}}>
                  ❌ Tindakan ini tidak bisa dibatalkan!
                </div>
                <div style={{display:"flex", gap:"8px"}}>
                  <button className="btn btn-red" style={{flex:1, padding:"12px"}} onClick={handleHapusSemua} disabled={saving}>
                    {saving ? "Menghapus..." : "🗑️ Ya, Hapus Semua"}
                  </button>
                  <button className="btn btn-ghost" style={{flex:1, padding:"12px"}} onClick={() => setHapusSemua(false)}>Batal</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---- Monitor Ujian & Buka Kunci ----
function MonitorPage({ ujianList }) {
  const [hasilLive, setHasilLive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [unlockedSiswa, setUnlockedSiswa] = useState(() => {
    try { return JSON.parse(localStorage.getItem("unlocked_siswa") || "[]"); } catch { return []; }
  });

  const loadHasil = useCallback(async () => {
    setLoading(true);
    try {
      if (!useDemo) {
        const data = await supabase("hasil?order=id.desc");
        setHasilLive(data);
      } else {
        setHasilLive([...DEMO_HASIL]);
      }
      setLastRefresh(new Date());
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadHasil(); }, [loadHasil]);

  // Auto-refresh setiap 10 detik
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(loadHasil, 10000);
    return () => clearInterval(t);
  }, [autoRefresh, loadHasil]);

  const saveUnlocked = (list) => {
    setUnlockedSiswa(list);
    localStorage.setItem("unlocked_siswa", JSON.stringify(list));
  };

  const bukaKunci = (nama, kelas) => {
    const key = `${nama}_${kelas}`;
    saveUnlocked([...unlockedSiswa.filter(k => k !== key), key]);
    alert(`✅ Kunci ujian ${nama} (${kelas}) berhasil dibuka!\nMinta siswa refresh browser dan masuk ulang.`);
  };

  // Statistik
  const totalSiswa = hasilLive.length;
  const sudahSelesai = hasilLive.length;
  const curiga = hasilLive.filter(h => h.mencurigakan).length;
  const rataRata = totalSiswa > 0 ? Math.round(hasilLive.reduce((a,h) => a + (h.nilai||0), 0) / totalSiswa) : 0;

  return (
    <>
      <div className="page-header">
        <h1>🖥️ Monitor Ujian Live</h1>
        <p>Pantau aktivitas siswa secara real-time</p>
      </div>

      {/* Status bar */}
      <div style={{display:"flex", gap:"12px", marginBottom:"20px", flexWrap:"wrap"}}>
        {[
          { icon:"✅", label:"Sudah Submit", val:sudahSelesai, bg:"var(--green3)", color:"var(--green2)" },
          { icon:"🚨", label:"Mencurigakan", val:curiga, bg:"var(--red3)", color:"var(--red2)" },
          { icon:"⭐", label:"Rata-rata Nilai", val:rataRata, bg:"var(--blue3)", color:"var(--blue2)" },
        ].map((s,i) => (
          <div key={i} style={{background:s.bg, borderRadius:"var(--radius)", padding:"16px 20px", flex:"1", minWidth:"140px"}}>
            <div style={{fontSize:"22px", fontWeight:"800", color:s.color, fontFamily:"var(--mono)"}}>{s.icon} {s.val}</div>
            <div style={{fontSize:"12px", color:s.color, marginTop:"4px"}}>{s.label}</div>
          </div>
        ))}
        <div style={{background:"white", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"16px 20px", flex:"1", minWidth:"160px", display:"flex", flexDirection:"column", gap:"8px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
            <div style={{width:"8px", height:"8px", borderRadius:"50%", background: autoRefresh ? "var(--green)" : "var(--gray)", animation: autoRefresh ? "pulse 1.5s infinite" : "none"}}></div>
            <span style={{fontSize:"13px", fontWeight:"600"}}>{autoRefresh ? "Auto Refresh ON" : "Auto Refresh OFF"}</span>
          </div>
          <div style={{fontSize:"11px", color:"var(--gray)"}}>Update: {lastRefresh.toLocaleTimeString('id-ID')}</div>
          <div style={{display:"flex", gap:"6px"}}>
            <button className="btn btn-blue" style={{fontSize:"11px", padding:"4px 10px"}} onClick={loadHasil} disabled={loading}>
              {loading ? "..." : "🔄 Refresh"}
            </button>
            <button className={`btn ${autoRefresh ? "btn-red" : "btn-green"}`} style={{fontSize:"11px", padding:"4px 10px"}} onClick={() => setAutoRefresh(v => !v)}>
              {autoRefresh ? "⏸ Pause" : "▶ Auto"}
            </button>
          </div>
        </div>
      </div>

      {/* Alert mencurigakan */}
      {curiga > 0 && (
        <div style={{background:"var(--red3)", border:"1px solid var(--red)", borderRadius:"var(--radius)", padding:"14px 18px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"12px"}}>
          <div style={{fontSize:"20px"}}>🚨</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:"700", color:"var(--red2)"}}>Terdeteksi {curiga} siswa mencurigakan!</div>
            <div style={{fontSize:"12px", color:"var(--red2)", opacity:0.8}}>Lihat detail di tabel bawah — kolom Pelanggaran.</div>
          </div>
        </div>
      )}

      {/* Tabel hasil live */}
      <div className="card">
        <div className="card-header">
          <h2>📊 Rekap Siswa ({totalSiswa})</h2>
        </div>
        {hasilLive.length === 0 ? (
          <div className="empty-state">
            <div className="icon">⏳</div>
            <p>Belum ada siswa yang submit. Halaman ini auto-refresh setiap 10 detik.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Nama</th><th>Kelas</th><th>Mapel</th><th>Nilai</th><th>Status</th><th>Pelanggaran</th></tr>
              </thead>
              <tbody>
                {hasilLive.map((h, i) => (
                  <tr key={i} style={{background: h.mencurigakan ? "#fff5f5" : ""}}>
                    <td style={{color:"var(--gray)", fontSize:"12px"}}>{i+1}</td>
                    <td>
                      <strong>{h.nama_siswa}</strong>
                      {h.mencurigakan && <span style={{marginLeft:"6px", fontSize:"10px", color:"var(--red2)", fontWeight:"700", background:"var(--red3)", padding:"1px 6px", borderRadius:"99px"}}>⚠️ Curiga</span>}
                    </td>
                    <td>{h.kelas}</td>
                    <td>{h.mapel}</td>
                    <td><strong style={{fontFamily:"var(--mono)", color: h.nilai>=75?"var(--green2)":"var(--red2)"}}>{h.nilai}</strong></td>
                    <td><span className={`badge ${h.nilai>=75?"badge-green":"badge-red"}`}>{h.nilai>=75?"Lulus":"Remedi"}</span></td>
                    <td>
                      {(h.pelanggaran||0) === 0
                        ? <span style={{color:"var(--green2)", fontSize:"12px"}}>✅ Bersih</span>
                        : <span style={{color:"var(--red2)", fontSize:"12px", fontWeight:"700"}}>⚠️ {h.pelanggaran}x</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Buka Kunci */}
      <div className="card">
        <div className="card-header"><h2>🔓 Buka Kunci Siswa</h2></div>
        <div style={{background:"var(--blue3)", borderRadius:"var(--radius2)", padding:"12px 16px", marginBottom:"16px", fontSize:"13px", color:"var(--navy3)"}}>
          ℹ️ Jika ada siswa yang ujiannya terkunci (3x pelanggaran), isi nama dan kelas di bawah lalu klik Buka Kunci. Minta siswa refresh browser dan masuk ulang.
        </div>
        <BukaKunciManual onBukaKunci={bukaKunci} />
        {unlockedSiswa.length > 0 && (
          <div style={{marginTop:"16px"}}>
            <div style={{fontSize:"13px", fontWeight:"700", marginBottom:"8px"}}>Riwayat Buka Kunci:</div>
            <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}>
              {unlockedSiswa.map((key, i) => {
                const [nama, kelas] = key.split("_");
                return (
                  <div key={i} style={{background:"var(--green3)", padding:"4px 12px", borderRadius:"99px", fontSize:"12px", color:"var(--green2)", fontWeight:"600"}}>
                    ✅ {nama} ({kelas})
                  </div>
                );
              })}
            </div>
            <button className="btn btn-ghost" style={{fontSize:"12px", marginTop:"8px"}} onClick={() => saveUnlocked([])}>Hapus Riwayat</button>
          </div>
        )}
      </div>
    </>
  );
}

function BukaKunciManual({ onBukaKunci }) {
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("");
  const [success, setSuccess] = useState(false);

  const handleBuka = () => {
    if (!nama.trim()) return alert("Isi nama siswa terlebih dahulu.");
    if (!kelas.trim()) return alert("Isi kelas siswa terlebih dahulu.");
    onBukaKunci(nama.trim(), kelas.trim());
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setNama(""); setKelas("");
  };

  return (
    <div style={{background:"var(--light)", borderRadius:"var(--radius)", padding:"20px"}}>
      <div style={{display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"flex-end"}}>
        <div className="form-field" style={{flex:"1", minWidth:"160px", marginBottom:0}}>
          <label>Nama Siswa</label>
          <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap siswa" />
        </div>
        <div className="form-field" style={{flex:"1", minWidth:"120px", marginBottom:0}}>
          <label>Kelas</label>
          <input value={kelas} onChange={e => setKelas(e.target.value)} placeholder="Contoh: VII A" />
        </div>
        <button className="btn btn-green" style={{padding:"10px 20px", height:"42px"}} onClick={handleBuka}>🔓 Buka Kunci</button>
      </div>
      {success && (
        <div style={{marginTop:"12px", padding:"10px 14px", background:"var(--green3)", borderRadius:"var(--radius2)", fontSize:"13px", color:"var(--green2)", fontWeight:"600"}}>
          ✅ Kunci berhasil dibuka! Minta siswa refresh browser dan masuk ulang.
        </div>
      )}
    </div>
  );
}

// ---- Hasil Ujian ----
function HasilPage({ hasilList, ujianList }) {
  const [filter, setFilter] = useState("");
  const [tabView, setTabView] = useState("semua"); // semua | curiga
  const filtered = hasilList.filter(h => {
    const matchMapel = filter ? h.mapel === filter : true;
    const matchTab = tabView === "curiga" ? h.mencurigakan : true;
    return matchMapel && matchTab;
  });
  const curigaCount = hasilList.filter(h => h.mencurigakan).length;

  const exportCSV = () => {
    const rows = [
      ["No","Nama","Kelas","Mata Pelajaran","Benar","Total","Nilai","Status","Pelanggaran","Mencurigakan"],
      ...filtered.map((h,i) => [i+1, h.nama_siswa, h.kelas, h.mapel, h.benar, h.total, h.nilai, h.nilai>=75?"Lulus":"Remedi", h.pelanggaran||0, h.mencurigakan?"Ya":"Tidak"])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hasil-ujian-${filter||"semua"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-header"><h1>Hasil Ujian</h1><p>Rekap nilai & deteksi kecurangan peserta</p></div>

      {curigaCount > 0 && (
        <div style={{background:"var(--red3)", border:"1px solid var(--red)", borderRadius:"var(--radius)", padding:"16px 20px", marginBottom:"20px", display:"flex", alignItems:"center", gap:"12px"}}>
          <div style={{fontSize:"24px"}}>🚨</div>
          <div>
            <div style={{fontWeight:"700", color:"var(--red2)"}}>Terdeteksi {curigaCount} siswa mencurigakan!</div>
            <div style={{fontSize:"13px", color:"var(--red2)", opacity:0.8}}>Siswa ini terdeteksi berpindah tab atau keluar fullscreen lebih dari 1 kali.</div>
          </div>
          <button className="btn btn-red" style={{marginLeft:"auto"}} onClick={() => setTabView("curiga")}>Lihat Detail</button>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div style={{display:"flex", gap:"8px"}}>
            <button className={`btn ${tabView==="semua"?"btn-blue":"btn-ghost"}`} onClick={() => setTabView("semua")}>📊 Semua ({hasilList.length})</button>
            <button className={`btn ${tabView==="curiga"?"btn-red":"btn-ghost"}`} onClick={() => setTabView("curiga")}>🚨 Mencurigakan ({curigaCount})</button>
          </div>
          <div style={{display:"flex", gap:"8px"}}>
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{padding:"8px 12px", borderRadius:"var(--radius2)", border:"1.5px solid var(--border)", fontSize:"13px"}}>
              <option value="">Semua Mapel</option>
              {MAPEL.map(m => <option key={m}>{m}</option>)}
            </select>
            <button className="btn btn-green" onClick={exportCSV}>⬇️ Export CSV</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><div className="icon">📊</div><p>{tabView==="curiga" ? "Tidak ada siswa mencurigakan 🎉" : "Belum ada data hasil ujian"}</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Nama</th><th>Kelas</th><th>Mata Pelajaran</th>
                  <th>Benar</th><th>Total</th><th>Nilai</th><th>Status</th>
                  <th>Pelanggaran</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h,i) => (
                  <tr key={i} style={{background: h.mencurigakan ? "#fff5f5" : ""}}>
                    <td style={{color:"var(--gray)", fontSize:"12px"}}>{i+1}</td>
                    <td>
                      <strong>{h.nama_siswa}</strong>
                      {h.mencurigakan && <span style={{marginLeft:"6px", fontSize:"11px", color:"var(--red2)", fontWeight:"700"}}>⚠️ Curiga</span>}
                    </td>
                    <td>{h.kelas}</td>
                    <td>{h.mapel}</td>
                    <td style={{fontFamily:"var(--mono)"}}>{h.benar}</td>
                    <td style={{fontFamily:"var(--mono)"}}>{h.total}</td>
                    <td><strong style={{fontFamily:"var(--mono)", color: h.nilai >= 75 ? "var(--green2)" : "var(--red2)"}}>{h.nilai}</strong></td>
                    <td><span className={`badge ${h.nilai >= 75 ? "badge-green" : "badge-red"}`}>{h.nilai >= 75 ? "Lulus" : "Remedi"}</span></td>
                    <td>
                      {(h.pelanggaran||0) === 0
                        ? <span style={{color:"var(--green2)", fontSize:"12px", fontWeight:"600"}}>✅ Bersih</span>
                        : <span style={{color:"var(--red2)", fontSize:"12px", fontWeight:"700"}}>⚠️ {h.pelanggaran}x</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// STUDENT EXAM (CBT)
// ============================================================
function StudentExam({ data, onFinish }) {
  const { ujian, siswa } = data;
  // Acak soal dan opsi saat komponen pertama kali dimuat
  const [soal] = useState(() => shuffleSoalDanOpsi(ujian.soal));
  const [current, setCurrent] = useState(0);
  const [jawaban, setJawaban] = useState(Array(soal.length).fill(null));
  const [timeLeft, setTimeLeft] = useState(ujian.durasi * 60);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabViolation, setTabViolation] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [queuePos, setQueuePos] = useState(null);
  const [timerPaused, setTimerPaused] = useState(false); // pause saat layar mati
  const hiddenSinceRef = React.useRef(null); // waktu layar mulai gelap
  const VIOLATION_THRESHOLD_MS = 5000; // 5 detik — lebih dari ini = pelanggaran
  const MAX_VIOLATIONS = 3;

  // ── Fullscreen ──────────────────────────────────────────────
  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    setIsFullscreen(true);
  };

  useEffect(() => {
    enterFullscreen();
    const onFsChange = () => {
      const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(fs);
      if (!fs && !submitting) {
        setTabViolation(v => {
          const nv = v + 1;
          if (nv >= MAX_VIOLATIONS) {
            setLocked(true);
            setWarningMsg(`🔒 Ujian dikunci! Anda keluar layar penuh ${nv}x. Hubungi pengawas.`);
          } else {
            setWarningMsg(`⚠️ PERINGATAN ${nv}/${MAX_VIOLATIONS}: Anda keluar dari layar penuh!`);
          }
          setShowWarning(true);
          return nv;
        });
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, [submitting]);

  // ── Deteksi pindah tab vs layar mati ───────────────────────
  // Logika: catat waktu layar gelap. Saat kembali, cek durasinya.
  // Jika < 5 detik → kemungkinan layar mati (tidak dihitung pelanggaran, timer di-pause)
  // Jika >= 5 detik → kemungkinan berpindah tab (dihitung pelanggaran)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !submitting) {
        // Layar mulai gelap / tab disembunyikan
        hiddenSinceRef.current = Date.now();
        setTimerPaused(true); // pause timer dulu
      } else if (!document.hidden && !submitting) {
        // Layar menyala kembali / kembali ke tab
        setTimerPaused(false); // lanjutkan timer
        if (hiddenSinceRef.current) {
          const durasi = Date.now() - hiddenSinceRef.current;
          hiddenSinceRef.current = null;
          if (durasi >= VIOLATION_THRESHOLD_MS) {
            // Berpindah tab / aplikasi lain (lebih dari 5 detik)
            setTabViolation(v => {
              const nv = v + 1;
              if (nv >= MAX_VIOLATIONS) {
                setLocked(true);
                setWarningMsg(`🔒 Ujian dikunci! Anda terdeteksi meninggalkan ujian ${nv}x. Hubungi pengawas.`);
              } else {
                setWarningMsg(`⚠️ PERINGATAN ${nv}/${MAX_VIOLATIONS}: Anda terdeteksi meninggalkan halaman ujian selama ${Math.round(durasi/1000)} detik!`);
              }
              setShowWarning(true);
              return nv;
            });
          }
          // Jika < 5 detik: layar mati sebentar, tidak dihitung pelanggaran
          // Timer sudah dilanjutkan otomatis di atas
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [submitting]);

  // ── Blokir klik kanan & shortcut ───────────────────────────
  useEffect(() => {
    const block = e => e.preventDefault();
    const blockKeys = e => {
      if (e.ctrlKey && ["c","v","u","s","a","p"].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) e.preventDefault();
      if (e.key === "PrintScreen") e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  // ── Timer (pause saat layar mati) ──────────────────────────
  useEffect(() => {
    if (locked || submitting || timerPaused) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [locked, submitting, timerPaused]);

  // ── Submit dengan Antrian ───────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    setShowConfirm(false);
    setShowReview(false);

    const benar = soal.filter((s, i) => jawaban[i] === s.jawaban).length;
    const nilai = Math.round((benar / soal.length) * 100);
    const hasilData = {
      nama_siswa: siswa.nama, kelas: siswa.kelas, mapel: ujian.mapel,
      benar, total: soal.length, nilai, ujian_id: ujian.id,
      pelanggaran: tabViolation,
      mencurigakan: tabViolation >= 2,
    };

    try {
      if (useDemo) {
        setSubmitStatus("saving");
        await new Promise(r => setTimeout(r, 800));
        hasilData.id = Date.now();
        DEMO_HASIL.push(hasilData);
        setSubmitStatus("done");
      } else {
        setSubmitStatus("queued");
        // Masukkan ke antrian — otomatis retry jika gagal
        await submitQueue.add(async () => {
          setSubmitStatus("saving");
          await supabase("hasil", {
            method: "POST",
            body: JSON.stringify(hasilData),
          });
        });
        setSubmitStatus("done");
      }
    } catch(e) {
      setSubmitStatus("error");
      console.error("Gagal simpan hasil:", e);
    }

    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    onFinish({ ...hasilData });
  }, [jawaban, soal, siswa, ujian, onFinish, tabViolation, submitting]);

  const HURUF = ["A","B","C","D"];
  const isDanger = timeLeft <= 300;
  const dijawab = jawaban.filter(j => j !== null).length;
  const belumDijawab = soal.length - dijawab;

  // ── LOADING SCREEN saat submit ──────────────────────────────
  if (submitting) {
    return (
      <div style={{minHeight:"100vh", background:"var(--navy)", display:"flex", alignItems:"center", justifyContent:"center"}}>
        <div style={{textAlign:"center", color:"white", padding:"32px"}}>
          <div style={{fontSize:"48px", marginBottom:"16px"}}>
            {submitStatus === "queued" && "⏳"}
            {submitStatus === "saving" && "💾"}
            {submitStatus === "done" && "✅"}
            {submitStatus === "error" && "❌"}
          </div>
          <h2 style={{fontSize:"20px", fontWeight:"800", marginBottom:"8px"}}>
            {submitStatus === "queued" && "Menunggu antrian..."}
            {submitStatus === "saving" && "Menyimpan jawaban..."}
            {submitStatus === "done" && "Jawaban tersimpan!"}
            {submitStatus === "error" && "Gagal menyimpan"}
          </h2>
          <p style={{color:"rgba(255,255,255,0.6)", fontSize:"14px"}}>
            {submitStatus === "queued" && "Sedang banyak siswa submit. Harap tunggu, jawaban Anda aman."}
            {submitStatus === "saving" && "Sedang mengirim ke server..."}
            {submitStatus === "done" && "Menampilkan hasil..."}
            {submitStatus === "error" && "Jawaban tetap tercatat. Menampilkan hasil..."}
          </p>
          {submitStatus === "queued" && (
            <div style={{marginTop:"20px", background:"rgba(255,255,255,0.1)", borderRadius:"8px", padding:"12px", fontSize:"13px", color:"rgba(255,255,255,0.7)"}}>
              💡 Server sedang memproses banyak pengiriman secara bersamaan. Sistem antrian memastikan jawaban Anda tidak hilang.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── REVIEW SCREEN ───────────────────────────────────────────
  if (showReview) {
    return (
      <div style={{minHeight:"100vh", background:"var(--light)", padding:"20px"}}>
        <div style={{maxWidth:"800px", margin:"0 auto"}}>
          <div style={{background:"var(--navy)", borderRadius:"var(--radius)", padding:"20px", marginBottom:"20px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <h2 style={{color:"white", fontSize:"18px", fontWeight:"800"}}>📋 Review Jawaban</h2>
              <p style={{color:"rgba(255,255,255,0.6)", fontSize:"13px"}}>Periksa kembali sebelum dikumpulkan</p>
            </div>
            <div className={`cbt-timer ${isDanger ? "danger" : ""}`}>⏱ {formatTime(timeLeft)}</div>
          </div>

          {belumDijawab > 0 && (
            <div style={{background:"var(--yellow3)", borderRadius:"var(--radius)", padding:"14px 18px", marginBottom:"16px", fontSize:"14px", color:"#92400e", fontWeight:"600"}}>
              ⚠️ Masih ada {belumDijawab} soal yang belum dijawab!
            </div>
          )}

          <div style={{display:"grid", gap:"10px", marginBottom:"20px"}}>
            {soal.map((s, i) => (
              <div key={i} style={{background:"white", borderRadius:"var(--radius2)", padding:"16px", border:`2px solid ${jawaban[i]===null ? "var(--red)" : "var(--border)"}`, cursor:"pointer"}} onClick={() => { setShowReview(false); setCurrent(i); }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"12px"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"12px", fontWeight:"700", color:"var(--blue)", marginBottom:"4px"}}>Soal {i+1}</div>
                    <div style={{fontSize:"14px", color:"var(--navy)", marginBottom:"8px"}}>{s.pertanyaan.length > 80 ? s.pertanyaan.slice(0,80)+"..." : s.pertanyaan}</div>
                    {jawaban[i] !== null ? (
                      <span style={{fontSize:"12px", padding:"3px 10px", borderRadius:"99px", background:"var(--blue3)", color:"var(--blue2)", fontWeight:"600"}}>
                        Jawaban: {HURUF[jawaban[i]]}. {s.opsi[jawaban[i]]}
                      </span>
                    ) : (
                      <span style={{fontSize:"12px", padding:"3px 10px", borderRadius:"99px", background:"var(--red3)", color:"var(--red2)", fontWeight:"600"}}>Belum dijawab</span>
                    )}
                  </div>
                  <div style={{fontSize:"12px", color:"var(--gray)", flexShrink:0}}>Klik untuk edit</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{display:"flex", gap:"12px"}}>
            <button className="btn btn-ghost" style={{flex:1, padding:"14px"}} onClick={() => setShowReview(false)}>← Kembali ke Soal</button>
            <button className="btn btn-green" style={{flex:1, padding:"14px", fontSize:"15px", fontWeight:"700"}} onClick={() => setShowConfirm(true)}>
              ✅ Kumpulkan Ujian
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cbt-wrap" style={{userSelect:"none"}}>
      {/* Warning overlay */}
      {showWarning && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
          <div style={{background:"white",borderRadius:"16px",padding:"32px",maxWidth:"420px",textAlign:"center"}}>
            <div style={{fontSize:"48px",marginBottom:"12px"}}>{locked ? "🔒" : "⚠️"}</div>
            <h2 style={{fontSize:"18px",fontWeight:"800",marginBottom:"12px",color:locked?"var(--red2)":"var(--yellow)"}}>
              {locked ? "Ujian Dikunci" : "Peringatan"}
            </h2>
            <p style={{fontSize:"14px",color:"var(--gray)",marginBottom:"20px",lineHeight:"1.6"}}>{warningMsg}</p>
            {!locked && (
              <button className="btn btn-blue" style={{width:"100%",padding:"12px"}} onClick={() => { setShowWarning(false); enterFullscreen(); }}>
                🔄 Kembali ke Ujian
              </button>
            )}
            {locked && <p style={{fontSize:"12px",color:"var(--red2)",fontWeight:"600"}}>Panggil pengawas untuk membuka kunci.</p>}
          </div>
        </div>
      )}

      <div className="cbt-header">
        <h2>📝 {ujian.mapel} — Kelas {ujian.kelas}</h2>
        <div className="cbt-header-info">
          <div className="cbt-student-info">👤 {siswa.nama} ({siswa.kelas})</div>
          {tabViolation > 0 && (
            <div style={{background:"rgba(239,68,68,0.3)",borderRadius:"8px",padding:"4px 10px",fontSize:"12px",color:"#fca5a5",fontWeight:"700"}}>⚠️ {tabViolation}/{MAX_VIOLATIONS}</div>
          )}
          <div style={{background:isFullscreen?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)",borderRadius:"8px",padding:"4px 10px",fontSize:"12px",color:isFullscreen?"#86efac":"#fca5a5",cursor:"pointer"}} onClick={enterFullscreen}>
            {isFullscreen ? "🔒 Fullscreen" : "⚠️ Klik Fullscreen"}
          </div>
          <div className={`cbt-timer ${isDanger && !timerPaused ? "danger" : ""}`}
            style={timerPaused ? {background:"rgba(251,191,36,0.3)",color:"#fcd34d"} : {}}>
            {timerPaused ? "⏸ Timer Dijeda" : `⏱ ${formatTime(timeLeft)}`}
          </div>
        </div>
      </div>

      <div className="cbt-body">
        <div className="cbt-main">
          <div className="cbt-question-card">
            <div className="cbt-q-num">Soal {current + 1} dari {soal.length}</div>
            <div className="cbt-q-text">{soal[current].pertanyaan}</div>
            {soal[current].gambar && (
              <div style={{margin:"12px 0 20px", borderRadius:"var(--radius2)", overflow:"hidden", border:"1px solid var(--border)", textAlign:"center", background:"var(--light)"}}>
                <img src={soal[current].gambar} alt="Gambar soal" style={{maxWidth:"100%", maxHeight:"300px", objectFit:"contain"}}
                  onError={e => e.target.style.display="none"}
                />
              </div>
            )}
            <div className="cbt-options">
              {soal[current].opsi.map((o, i) => (
                <div key={i} className={`cbt-option ${jawaban[current] === i ? "selected" : ""}`}
                  onClick={() => { if(locked) return; const j = [...jawaban]; j[current] = i; setJawaban(j); }}>
                  <div className="cbt-option-label">{HURUF[i]}</div>
                  <div className="cbt-option-text">{o}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="cbt-nav">
            <button className="btn btn-ghost" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>← Sebelumnya</button>
            <span style={{fontSize:"13px", color:"var(--gray)"}}>Dijawab: {dijawab}/{soal.length}</span>
            {current < soal.length - 1
              ? <button className="btn btn-blue" onClick={() => setCurrent(current + 1)}>Selanjutnya →</button>
              : <button className="btn btn-green" onClick={() => setShowReview(true)}>📋 Review & Kumpulkan</button>
            }
          </div>
        </div>

        <div className="cbt-sidebar">
          <div className="cbt-sidebar-card">
            <h3>Navigasi Soal</h3>
            <div className="cbt-num-grid">
              {soal.map((_, i) => (
                <button key={i} className={`cbt-num-btn ${jawaban[i] !== null ? "answered" : ""} ${current === i ? "current" : ""}`} onClick={() => setCurrent(i)}>{i+1}</button>
              ))}
            </div>
          </div>
          <div className="cbt-sidebar-card">
            <div className="cbt-legend">
              <span><div className="cbt-legend-dot answered"></div>Sudah dijawab</span>
              <span><div className="cbt-legend-dot"></div>Belum dijawab</span>
            </div>
          </div>
          <button className="btn btn-green" style={{width:"100%", marginBottom:"8px"}} onClick={() => setShowReview(true)} disabled={locked}>📋 Review Jawaban</button>
          <button className="btn btn-ghost" style={{width:"100%", fontSize:"12px"}} onClick={() => setShowConfirm(true)} disabled={locked}>Langsung Kumpulkan</button>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Kumpulkan Ujian?</h2>
            <p>Dijawab: <strong>{dijawab}</strong> dari <strong>{soal.length}</strong> soal.</p>
            {belumDijawab > 0 && <p style={{color:"var(--red2)", fontSize:"13px", marginTop:"6px"}}>⚠️ {belumDijawab} soal belum dijawab — akan dianggap salah.</p>}
            {tabViolation > 0 && <p style={{color:"var(--red2)", fontSize:"13px", marginTop:"6px"}}>📋 Tercatat {tabViolation} pelanggaran.</p>}
            <div style={{display:"flex", gap:"8px", marginTop:"20px"}}>
              <button className="btn btn-green" style={{flex:1}} onClick={() => handleSubmit(false)}>✅ Ya, Kumpulkan</button>
              <button className="btn btn-ghost" style={{flex:1}} onClick={() => setShowConfirm(false)}>Kembali</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ============================================================
// RESULT SCREEN
// ============================================================
function ResultScreen({ result, onBack }) {
  const lulus = result.nilai >= 75;
  return (
    <div className="result-wrap">
      <div className="result-card">
        <div className="result-emoji">{lulus ? "🎉" : "💪"}</div>
        <div className={`result-score-ring ${lulus ? "lulus" : "gagal"}`}>
          <div className={`result-score-val ${lulus ? "lulus" : "gagal"}`}>{result.nilai}</div>
        </div>
        <h2>{lulus ? "Selamat, Anda Lulus!" : "Tetap Semangat!"}</h2>
        <p>{result.nama_siswa} • Kelas {result.kelas} • {result.mapel}</p>
        <div className="result-stats">
          <div className="result-stat"><div className="val" style={{color:"var(--green2)"}}>{result.benar}</div><div className="lbl">Benar</div></div>
          <div className="result-stat"><div className="val" style={{color:"var(--red2)"}}>{result.total - result.benar}</div><div className="lbl">Salah</div></div>
          <div className="result-stat"><div className="val">{result.total}</div><div className="lbl">Total Soal</div></div>
        </div>
        <div style={{background: lulus ? "var(--green3)" : "var(--red3)", borderRadius:"var(--radius2)", padding:"12px", marginBottom:"20px", fontSize:"14px", color: lulus ? "var(--green2)" : "var(--red2)", fontWeight:"600"}}>
          {lulus ? "✅ Nilai Anda memenuhi KKM (75)" : "❌ Nilai belum memenuhi KKM (75) — Perlu remedi"}
        </div>
        <button className="btn btn-blue" style={{width:"100%", padding:"12px"}} onClick={onBack}>🏠 Kembali ke Halaman Utama</button>
      </div>
    </div>
  );
}
