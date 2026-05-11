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
// CONSTANTS
// ============================================================
const MAPEL = [
  "Matematika","Bahasa Indonesia","Bahasa Inggris","IPA","IPS",
  "PKn","Agama","Seni Budaya","PJOK","Informatika",
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
  .login-logo-icon { width: 48px; height: 48px; background: linear-gradient(135deg, var(--blue), var(--green)); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
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
          <StudentExam
            data={studentData}
            onFinish={(result) => { setExamResult(result); setScreen("result"); }}
          />
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
          const soalData = await supabase(`soal?ujian_id=eq.${data[0].id}`);
          ujian = { ...data[0], soal: soalData };
        }
      }
      if (!ujian || !ujian.soal || ujian.soal.length === 0) {
        setError("Kode ujian tidak ditemukan atau ujian tidak aktif.");
      } else {
        onStudentJoin({ ujian, siswa: { nama: form.nama, kelas: form.kelas } });
      }
    } catch (e) {
      setError("Gagal terhubung. Periksa koneksi internet.");
    }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📝</div>
          <h1>CBT<span>Sekolah</span></h1>
        </div>
        <p className="login-subtitle">Platform Ujian Digital Sekolah</p>
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
            <div className="field"><label>Password</label><input type="password" placeholder="Password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} /></div>
            <button className="btn-primary" onClick={handleGuru}> Login Guru</button>
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
        const [u, h] = await Promise.all([
          supabase("ujian?order=id.desc"),
          supabase("hasil?order=id.desc"),
        ]);
        setUjianList(u);
        setHasilList(h);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const menuItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "ujian", icon: "📋", label: "Kelola Ujian" },
    { id: "soal", icon: "✏️", label: "Buat Soal" },
    { id: "hasil", icon: "📈", label: "Hasil Ujian" },
  ];

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-logo">
          <h2>CBT<span style={{color:"var(--blue)"}}>Sekolah</span></h2>
          <p>Halo, {guru.nama}</p>
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
  const [form, setForm] = useState({ mapel: MAPEL[0], kelas: "X", durasi: 60 });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    const newUjian = { ...form, durasi: Number(form.durasi), key: genKey(), aktif: true, soal: [] };
    try {
      if (useDemo) {
        newUjian.id = Date.now();
        DEMO_UJIAN.push(newUjian);
      } else {
        await supabase("ujian", { method: "POST", body: JSON.stringify({ mapel: form.mapel, kelas: form.kelas, durasi: Number(form.durasi), key: newUjian.key, aktif: true }) });
      }
      await onRefresh();
      setShowForm(false);
      setForm({ mapel: MAPEL[0], kelas: "X", durasi: 60 });
    } catch(e) { alert("Gagal membuat ujian: " + e.message); }
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

  return (
    <>
      <div className="page-header"><h1>Kelola Ujian</h1><p>Buat dan atur sesi ujian</p></div>
      <div className="card">
        <div className="card-header">
          <h2>Daftar Ujian ({ujianList.length})</h2>
          <button className="btn btn-blue" onClick={() => setShowForm(!showForm)}>+ Buat Ujian</button>
        </div>
        {showForm && (
          <div style={{background:"var(--light)", borderRadius:"var(--radius)", padding:"20px", marginBottom:"20px"}}>
            <h3 style={{marginBottom:"16px", fontSize:"15px", fontWeight:"700"}}>Ujian Baru</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Mata Pelajaran</label>
                <select value={form.mapel} onChange={e => setForm(p=>({...p, mapel:e.target.value}))}>
                  {MAPEL.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-field"><label>Kelas</label><input value={form.kelas} onChange={e => setForm(p=>({...p, kelas:e.target.value}))} placeholder="X IPA 1" /></div>
              <div className="form-field"><label>Durasi (menit)</label><input type="number" value={form.durasi} onChange={e => setForm(p=>({...p, durasi:e.target.value}))} /></div>
            </div>
            <div style={{display:"flex", gap:"8px"}}>
              <button className="btn btn-green" onClick={handleCreate} disabled={saving}>{saving?"Menyimpan...":"✅ Simpan Ujian"}</button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
            </div>
          </div>
        )}
        <div className="ujian-grid">
          {ujianList.map(u => (
            <div key={u.id} className="ujian-card">
              <h3>{u.mapel}</h3>
              <div className="meta">Kelas {u.kelas} • {u.durasi} menit • {(u.soal||[]).length} soal</div>
              <div className="key-badge">{u.key}</div>
              <div className="actions">
                <button className="btn btn-blue" onClick={() => setShowKey(u)}>🔑 Lihat Kode</button>
                <button className={`btn ${u.aktif ? "btn-red" : "btn-green"}`} onClick={() => toggleAktif(u)}>{u.aktif ? "⏸ Nonaktif" : "▶ Aktifkan"}</button>
              </div>
            </div>
          ))}
          {ujianList.length === 0 && <div className="empty-state"><div className="icon">📋</div><p>Belum ada ujian. Buat ujian pertama Anda!</p></div>}
        </div>
      </div>
      {showKey && (
        <div className="modal-overlay" onClick={() => setShowKey(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🔑 Kode Ujian</h2>
            <p>Bagikan kode ini kepada siswa untuk memulai ujian {showKey.mapel}</p>
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
    </>
  );
}

// ---- Buat Soal ----
function SoalPage({ ujianList, onRefresh }) {
  const [selectedUjian, setSelectedUjian] = useState("");
  const [soalList, setSoalList] = useState([]);
  const [form, setForm] = useState({ pertanyaan: "", opsi: ["","","",""], jawaban: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedUjian) {
      const u = ujianList.find(u => String(u.id) === selectedUjian);
      setSoalList(u?.soal || []);
    }
  }, [selectedUjian, ujianList]);

  const handleSave = async () => {
    if (!selectedUjian) return alert("Pilih ujian terlebih dahulu.");
    if (!form.pertanyaan.trim()) return alert("Pertanyaan tidak boleh kosong.");
    if (form.opsi.some(o => !o.trim())) return alert("Semua opsi harus diisi.");
    setSaving(true);
    try {
      const soalBaru = { ...form, opsi: [...form.opsi], id: Date.now() };
      if (useDemo) {
        const idx = DEMO_UJIAN.findIndex(u => String(u.id) === selectedUjian);
        if (idx > -1) { DEMO_UJIAN[idx].soal = [...(DEMO_UJIAN[idx].soal||[]), soalBaru]; }
      } else {
        await supabase("soal", { method: "POST", body: JSON.stringify({ ujian_id: Number(selectedUjian), pertanyaan: form.pertanyaan, opsi: form.opsi, jawaban: form.jawaban }) });
      }
      await onRefresh();
      setSoalList(prev => [...prev, soalBaru]);
      setForm({ pertanyaan: "", opsi: ["","","",""], jawaban: 0 });
    } catch(e) { alert("Gagal menyimpan: " + e.message); }
    setSaving(false);
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
    } catch(e) { alert("Gagal hapus: " + e.message); }
  };

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
          <div className="card">
            <div className="card-header"><h2>✏️ Tambah Soal Baru</h2><span className="badge badge-blue">{soalList.length} soal</span></div>
            <div className="form-field">
              <label>Pertanyaan</label>
              <textarea value={form.pertanyaan} onChange={e => setForm(p=>({...p, pertanyaan:e.target.value}))} placeholder="Tulis pertanyaan di sini..." rows={3} />
            </div>
            <label style={{fontSize:"13px", fontWeight:"700", color:"var(--navy3)", display:"block", marginBottom:"10px"}}>Pilihan Jawaban <span style={{color:"var(--green)", fontWeight:"600"}}>(✓ = Jawaban Benar)</span></label>
            {HURUF.map((h,i) => (
              <div key={i} className={`option-row ${form.jawaban === i ? "correct" : ""}`}>
                <div className="option-label">{h}</div>
                <input value={form.opsi[i]} onChange={e => { const o = [...form.opsi]; o[i] = e.target.value; setForm(p=>({...p, opsi:o})); }} placeholder={`Opsi ${h}`} />
                <button className={`btn ${form.jawaban === i ? "btn-green" : "btn-ghost"}`} onClick={() => setForm(p=>({...p, jawaban:i}))}>✓</button>
              </div>
            ))}
            <div style={{marginTop:"16px"}}>
              <button className="btn btn-blue" onClick={handleSave} disabled={saving}>{saving?"Menyimpan...":"💾 Simpan Soal"}</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2>📝 Daftar Soal</h2></div>
            {soalList.length === 0 ? (
              <div className="empty-state"><div className="icon">✏️</div><p>Belum ada soal. Tambahkan soal di atas.</p></div>
            ) : (
              soalList.map((s, idx) => (
                <div key={s.id} style={{border:"1px solid var(--border)", borderRadius:"var(--radius2)", padding:"16px", marginBottom:"12px"}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"12px", fontWeight:"700", color:"var(--blue)", marginBottom:"6px"}}>SOAL {idx+1}</div>
                      <div style={{fontSize:"14px", fontWeight:"500", marginBottom:"10px"}}>{s.pertanyaan}</div>
                      <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}>
                        {s.opsi.map((o,i) => (
                          <span key={i} style={{fontSize:"12px", padding:"3px 10px", borderRadius:"99px", background: i === s.jawaban ? "var(--green3)" : "var(--light)", color: i === s.jawaban ? "var(--green2)" : "var(--gray)", fontWeight: i === s.jawaban ? "700" : "500"}}>
                            {HURUF[i]}. {o}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="btn btn-red" onClick={() => handleDelete(s.id)} style={{marginLeft:"12px"}}>🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
}

// ---- Hasil Ujian ----
function HasilPage({ hasilList, ujianList }) {
  const [filter, setFilter] = useState("");
  const filtered = filter ? hasilList.filter(h => h.mapel === filter) : hasilList;
  return (
    <>
      <div className="page-header"><h1>Hasil Ujian</h1><p>Rekap nilai seluruh peserta</p></div>
      <div className="card">
        <div className="card-header">
          <h2>Rekap Nilai</h2>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{padding:"8px 12px", borderRadius:"var(--radius2)", border:"1.5px solid var(--border)", fontSize:"13px"}}>
            <option value="">Semua Mapel</option>
            {MAPEL.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="icon">📊</div><p>Belum ada data hasil ujian</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Nama</th><th>Kelas</th><th>Mata Pelajaran</th><th>Benar</th><th>Total</th><th>Nilai</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((h,i) => (
                  <tr key={i}>
                    <td style={{color:"var(--gray)", fontSize:"12px"}}>{i+1}</td>
                    <td><strong>{h.nama_siswa}</strong></td>
                    <td>{h.kelas}</td>
                    <td>{h.mapel}</td>
                    <td style={{fontFamily:"var(--mono)"}}>{h.benar}</td>
                    <td style={{fontFamily:"var(--mono)"}}>{h.total}</td>
                    <td><strong style={{fontFamily:"var(--mono)", color: h.nilai >= 75 ? "var(--green2)" : "var(--red2)"}}>{h.nilai}</strong></td>
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

// ============================================================
// STUDENT EXAM (CBT)
// ============================================================
function StudentExam({ data, onFinish }) {
  const { ujian, siswa } = data;
  const soal = ujian.soal;
  const [current, setCurrent] = useState(0);
  const [jawaban, setJawaban] = useState(Array(soal.length).fill(null));
  const [timeLeft, setTimeLeft] = useState(ujian.durasi * 60);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = useCallback(async (auto = false) => {
    const benar = soal.filter((s, i) => jawaban[i] === s.jawaban).length;
    const nilai = Math.round((benar / soal.length) * 100);
    const hasilData = { nama_siswa: siswa.nama, kelas: siswa.kelas, mapel: ujian.mapel, benar, total: soal.length, nilai, ujian_id: ujian.id };
    try {
      if (useDemo) {
        hasilData.id = Date.now();
        DEMO_HASIL.push(hasilData);
      } else {
        await supabase("hasil", { method: "POST", body: JSON.stringify(hasilData) });
      }
    } catch(e) { console.error("Gagal simpan hasil:", e); }
    onFinish({ ...hasilData });
  }, [jawaban, soal, siswa, ujian, onFinish]);

  const HURUF = ["A","B","C","D"];
  const isDanger = timeLeft <= 300;

  return (
    <div className="cbt-wrap">
      <div className="cbt-header">
        <h2>📝 {ujian.mapel} — Kelas {ujian.kelas}</h2>
        <div className="cbt-header-info">
          <div className="cbt-student-info">👤 {siswa.nama} ({siswa.kelas})</div>
          <div className={`cbt-timer ${isDanger ? "danger" : ""}`}>⏱ {formatTime(timeLeft)}</div>
        </div>
      </div>
      <div className="cbt-body">
        <div className="cbt-main">
          <div className="cbt-question-card">
            <div className="cbt-q-num">Soal {current + 1} dari {soal.length}</div>
            <div className="cbt-q-text">{soal[current].pertanyaan}</div>
            <div className="cbt-options">
              {soal[current].opsi.map((o, i) => (
                <div key={i} className={`cbt-option ${jawaban[current] === i ? "selected" : ""}`} onClick={() => { const j = [...jawaban]; j[current] = i; setJawaban(j); }}>
                  <div className="cbt-option-label">{HURUF[i]}</div>
                  <div className="cbt-option-text">{o}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="cbt-nav">
            <button className="btn btn-ghost" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>← Sebelumnya</button>
            <span style={{fontSize:"13px", color:"var(--gray)"}}>Dijawab: {jawaban.filter(j => j !== null).length}/{soal.length}</span>
            {current < soal.length - 1 ? (
              <button className="btn btn-blue" onClick={() => setCurrent(current + 1)}>Selanjutnya →</button>
            ) : (
              <button className="btn btn-green" onClick={() => setShowConfirm(true)}>✅ Selesai & Kumpulkan</button>
            )}
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
          <button className="btn btn-green" style={{width:"100%"}} onClick={() => setShowConfirm(true)}>✅ Kumpulkan Ujian</button>
        </div>
      </div>
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Kumpulkan Ujian?</h2>
            <p>Anda telah menjawab <strong>{jawaban.filter(j=>j!==null).length}</strong> dari <strong>{soal.length}</strong> soal. Soal yang belum dijawab akan dianggap salah.</p>
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
