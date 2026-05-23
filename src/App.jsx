import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";

// ── AUDIO ENGINE ─────────────────────────────────────────────────────────────
const audioCtx = { current: null };
const getCtx = () => {
  if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx.current;
};
const beep = (freq = 520, dur = 0.12, vol = 0.35, type = "sine") => {
  try {
    const ctx = getCtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
};
const shootBeep = () => { beep(880,0.05,0.4); setTimeout(()=>beep(1100,0.08,0.3),60); setTimeout(()=>beep(1400,0.12,0.2),140); };
const printBeep  = () => { [0,80,160].forEach(d=>setTimeout(()=>beep(660,0.07,0.25),d)); setTimeout(()=>beep(880,0.2,0.3),300); };

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const SERIES_LABELS = { aot:"Attack on Titan", dbz:"Dragon Ball Z", naruto:"Naruto", general:"General" };
const CHART_COLORS  = ["#e8a020","#44aaff","#ff4444","#44cc88","#cc44ff"];
const DOWNLOAD_BASE = "https://animebooth.app/download";
const genCode = () => String(Math.floor(1000 + Math.random() * 9000));

// Upload helper for Storage
const uploadImage = async (bucket, file) => {
  const ext  = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

const deleteImage = async (bucket, url) => {
  if (!url) return;
  try {
    const path = url.split(`/${bucket}/`)[1];
    if (path) await supabase.storage.from(bucket).remove([path]);
  } catch {}
};

// ── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#07080f;--surface:#0e1020;--surface2:#161830;--border:#252850;
    --accent:#e8a020;--accent2:#ff4444;--accent3:#44aaff;
    --text:#e8e8f0;--muted:#6b6d90;--aot:#c4512a;--dbz:#e8c020;--naruto:#e87820;
  }
  body{background:var(--bg);color:var(--text);font-family:'Rajdhani',sans-serif;min-height:100vh}
  .app{display:flex;height:100vh;overflow:hidden}
  .sidebar{width:224px;min-width:224px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;z-index:10}
  .sidebar-logo{padding:20px 16px;border-bottom:1px solid var(--border)}
  .logo-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:3px;color:var(--accent);line-height:1}
  .logo-sub{font-size:10px;color:var(--muted);letter-spacing:4px;text-transform:uppercase;margin-top:2px}
  .nav-section{padding:10px 0;flex:1;overflow-y:auto}
  .nav-label{font-size:10px;letter-spacing:3px;color:var(--muted);padding:8px 16px 4px;text-transform:uppercase}
  .nav-item{display:flex;align-items:center;gap:10px;padding:9px 16px;cursor:pointer;font-size:14px;font-weight:600;color:var(--muted);transition:all .15s;letter-spacing:.5px;border-left:3px solid transparent}
  .nav-item:hover{color:var(--text);background:var(--surface2)}
  .nav-item.active{color:var(--accent);background:rgba(232,160,32,.08);border-left-color:var(--accent)}
  .nav-icon{font-size:16px;width:20px;text-align:center}
  .sidebar-footer{padding:16px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px}
  .kiosk-btn{width:100%;padding:10px;background:linear-gradient(135deg,var(--accent),#c47010);border:none;border-radius:6px;color:#000;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;cursor:pointer;transition:all .2s}
  .kiosk-btn:hover{opacity:.85;transform:translateY(-1px)}
  .logout-btn{width:100%;padding:8px;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--muted);font-family:'Rajdhani',sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s}
  .logout-btn:hover{border-color:var(--accent2);color:var(--accent2)}
  .main{flex:1;overflow-y:auto;padding:28px 32px;background:var(--bg)}
  .page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
  .page-title{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:3px;color:var(--text)}
  .page-subtitle{font-size:13px;color:var(--muted);margin-top:2px}
  .btn{padding:9px 18px;border:none;border-radius:5px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;letter-spacing:.5px;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
  .btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#f0b030}
  .btn-danger{background:var(--accent2);color:#fff}.btn-danger:hover{background:#ff2222}
  .btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
  .btn-sm{padding:5px 12px;font-size:12px}.btn:disabled{opacity:.4;cursor:not-allowed}
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
  .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:18px;position:relative;overflow:hidden}
  .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--c1),var(--c2))}
  .stat-val{font-family:'Bebas Neue',sans-serif;font-size:40px;color:var(--text);line-height:1}
  .stat-label{font-size:12px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-top:4px}
  .stat-icon{position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:36px;opacity:.12}
  .table-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:20px}
  .table-head{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .table-title{font-weight:700;font-size:15px;letter-spacing:.5px}
  table{width:100%;border-collapse:collapse}
  th{padding:10px 16px;text-align:left;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);font-weight:600}
  td{padding:11px 16px;font-size:14px;border-bottom:1px solid rgba(37,40,80,.4)}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:var(--surface2)}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.5px}
  .badge-active{background:rgba(68,170,68,.15);color:#44aa44;border:1px solid rgba(68,170,68,.3)}
  .badge-inactive{background:rgba(107,109,144,.12);color:var(--muted);border:1px solid var(--border)}
  .badge-used{background:rgba(255,68,68,.1);color:#ff6666;border:1px solid rgba(255,68,68,.2)}
  .badge-ready{background:rgba(68,170,255,.1);color:#44aaff;border:1px solid rgba(68,170,255,.2)}
  .badge-aot{background:rgba(196,81,42,.15);color:#e05530;border:1px solid rgba(196,81,42,.3)}
  .badge-dbz{background:rgba(232,192,32,.12);color:var(--dbz);border:1px solid rgba(232,192,32,.3)}
  .badge-naruto{background:rgba(232,120,32,.12);color:var(--naruto);border:1px solid rgba(232,120,32,.3)}
  .grid-2{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
  .media-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;transition:all .2s}
  .media-card:hover{border-color:var(--accent);transform:translateY(-2px)}
  .media-preview{height:120px;display:flex;align-items:center;justify-content:center;font-size:50px;position:relative;overflow:hidden}
  .media-preview img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .media-preview .emoji-fallback{position:relative;z-index:1;font-size:48px}
  .media-info{padding:10px 12px;border-top:1px solid var(--border)}
  .media-name{font-weight:700;font-size:13px}
  .media-meta{font-size:11px;color:var(--muted);margin-top:2px}
  .media-actions{display:flex;gap:6px;margin-top:8px}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
  .modal{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;width:480px;max-width:92vw;max-height:90vh;overflow-y:auto}
  .modal-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:20px;color:var(--accent)}
  .modal-danger .modal-title{color:var(--accent2)}
  .field{margin-bottom:14px}
  .field label{display:flex;justify-content:space-between;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:5px;font-weight:600}
  .field input,.field select,.field textarea{width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:500;outline:none;transition:border .15s}
  .field input:focus,.field select:focus{border-color:var(--accent)}
  .modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
  select option{background:#0e1020}
  /* File upload */
  .upload-zone{border:2px dashed var(--border);border-radius:8px;padding:16px;text-align:center;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
  .upload-zone:hover{border-color:var(--accent);background:rgba(232,160,32,.04)}
  .upload-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
  .upload-zone-text{font-size:13px;color:var(--muted);pointer-events:none}
  .upload-preview{width:100%;height:120px;object-fit:cover;border-radius:6px;margin-top:8px;border:1px solid var(--border)}
  .upload-progress{height:3px;background:var(--border);border-radius:2px;margin-top:6px;overflow:hidden}
  .upload-progress-bar{height:100%;background:var(--accent);transition:width .3s}
  /* Collage preview */
  .collage-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;transition:all .2s}
  .collage-card:hover{border-color:var(--accent)}
  .collage-preview{background:var(--surface2);border-radius:6px;padding:10px;margin-bottom:12px;display:flex;align-items:center;justify-content:center}
  .collage-grid{display:grid;gap:var(--cg)}
  .collage-cell{background:rgba(232,160,32,.25);border-radius:3px}
  .collage-name{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1px;color:var(--text)}
  .collage-desc{font-size:12px;color:var(--muted);margin-top:2px}
  .collage-actions{display:flex;gap:6px;margin-top:10px}
  /* Charts */
  .chart-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:20px;margin-bottom:20px}
  .chart-title{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--accent);margin-bottom:4px}
  .chart-sub{font-size:12px;color:var(--muted);margin-bottom:16px}
  .charts-2col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
  .settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .settings-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:20px}
  .settings-title{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--accent);margin-bottom:14px}
  .printer-status{display:flex;align-items:center;gap:10px;padding:12px;background:rgba(68,170,68,.08);border:1px solid rgba(68,170,68,.2);border-radius:6px;margin-bottom:14px}
  .status-dot{width:10px;height:10px;border-radius:50%;background:#44aa44;box-shadow:0 0 8px #44aa44;animation:blink 2s ease-in-out infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
  /* Kiosk */
  .kiosk{position:fixed;inset:0;background:#000;z-index:200;display:flex;flex-direction:column;align-items:center;font-family:'Rajdhani',sans-serif;overflow-y:auto}
  .kiosk-bg{position:fixed;inset:0;background:radial-gradient(ellipse at 20% 50%,#0d1535 0%,#07080f 60%);pointer-events:none}
  .k-particles{position:absolute;inset:0;pointer-events:none;overflow:hidden}
  .k-particle{position:absolute;border-radius:50%;animation:rise linear infinite}
  @keyframes rise{0%{transform:translateY(110vh);opacity:0}10%{opacity:.8}90%{opacity:.8}100%{transform:translateY(-10vh);opacity:0}}
  .kiosk-content{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;width:100%;max-width:900px;padding:18px 24px 28px;margin:auto}
  .kiosk-logo{font-family:'Bebas Neue',sans-serif;font-size:48px;letter-spacing:8px;background:linear-gradient(135deg,#e8a020,#f0d060);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1.1;white-space:nowrap}
  .kiosk-tagline{font-size:12px;letter-spacing:4px;color:var(--muted);text-transform:uppercase;margin-bottom:20px}
  .code-card{background:rgba(14,16,32,.95);border:1px solid var(--border);border-radius:16px;padding:36px;text-align:center;width:420px;backdrop-filter:blur(20px);box-shadow:0 24px 64px rgba(0,0,0,.6)}
  .code-label{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-bottom:18px}
  .code-inputs{display:flex;gap:10px;justify-content:center;margin-bottom:20px}
  .code-digit{width:66px;height:74px;background:var(--surface2);border:2px solid var(--border);border-radius:10px;font-family:'Bebas Neue',sans-serif;font-size:42px;color:var(--accent);text-align:center;outline:none;transition:all .15s}
  .code-digit:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(232,160,32,.2)}
  .code-digit.filled{border-color:rgba(232,160,32,.4);background:rgba(232,160,32,.06)}
  .code-error{color:var(--accent2);font-size:13px;margin-bottom:10px;padding:8px 12px;background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.2);border-radius:6px}
  .enter-btn{width:100%;padding:14px;background:linear-gradient(135deg,var(--accent),#c47010);border:none;border-radius:8px;font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:3px;color:#000;cursor:pointer;transition:all .2s}
  .enter-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(232,160,32,.35)}
  .enter-btn:disabled{opacity:.35;cursor:not-allowed}
  .steps-row{display:flex;gap:0;margin-bottom:16px;background:rgba(14,16,32,.8);border:1px solid var(--border);border-radius:50px;padding:4px;overflow:hidden}
  .step-pill{padding:6px 16px;border-radius:50px;font-size:12px;letter-spacing:1px;color:var(--muted);transition:all .2s;white-space:nowrap}
  .step-pill.done{color:rgba(232,160,32,.6)}.step-pill.active{background:var(--accent);color:#000;font-weight:700}
  .step-title{font-family:'Bebas Neue',sans-serif;font-size:34px;letter-spacing:4px;color:var(--text);text-align:center;margin-bottom:4px}
  .step-sub{font-size:13px;color:var(--muted);letter-spacing:1px;text-align:center;margin-bottom:14px}
  .opt-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:100%}
  .opt-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%}
  .opt-card{background:rgba(14,16,32,.9);border:2px solid var(--border);border-radius:12px;padding:14px;cursor:pointer;transition:all .2s;text-align:center;backdrop-filter:blur(8px);overflow:hidden;position:relative}
  .opt-card:hover{border-color:rgba(232,160,32,.5)}
  .opt-card.sel{border-color:var(--accent);background:rgba(232,160,32,.08);box-shadow:0 0 18px rgba(232,160,32,.15)}
  .opt-card-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35}
  .opt-card-img.frame-img{opacity:.7;object-fit:contain}
  .opt-card-content{position:relative;z-index:1}
  .opt-emoji{font-size:38px;margin-bottom:6px}
  .opt-label{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px}
  .opt-meta{font-size:11px;color:var(--muted);margin-top:2px}
  .lp-wrap{display:flex;justify-content:center;margin-bottom:8px}
  .lp-grid{display:grid;gap:3px}
  .lp-cell{background:var(--accent);border-radius:2px;opacity:.7}
  .cam-wrap{width:min(520px,90vw);aspect-ratio:1/1;background:#111;border:2px solid var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;margin:0 auto 12px}
  .cam-placeholder{display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--muted);text-align:center;position:absolute;inset:0;justify-content:center;z-index:2}
  .cam-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);z-index:1}
  .cam-bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
  .cam-frame-img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:4}
  .cam-corners{position:absolute;inset:0;pointer-events:none;z-index:2}
  .crn{position:absolute;width:22px;height:22px;border-color:var(--accent);border-style:solid;opacity:.8}
  .crn-tl{top:10px;left:10px;border-width:3px 0 0 3px}.crn-tr{top:10px;right:10px;border-width:3px 3px 0 0}
  .crn-bl{bottom:10px;left:10px;border-width:0 0 3px 3px}.crn-br{bottom:10px;right:10px;border-width:0 3px 3px 0}
  .scanline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);animation:scan 2.5s ease-in-out infinite;z-index:2}
  @keyframes scan{0%{top:10%;opacity:0}10%{opacity:.6}90%{opacity:.6}100%{top:90%;opacity:0}}
  .cdown-num{font-family:'Bebas Neue',sans-serif;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:140px;animation:cdpop .85s cubic-bezier(.3,1.8,.5,1) forwards;z-index:4}
  .cdown-num.c3{color:#ff4444;text-shadow:0 0 40px #ff4444}.cdown-num.c2{color:#e8a020;text-shadow:0 0 40px #e8a020}.cdown-num.c1{color:#44ff88;text-shadow:0 0 40px #44ff88}
  @keyframes cdpop{0%{transform:scale(2.5);opacity:0}20%{transform:scale(1);opacity:1}80%{transform:scale(1);opacity:1}100%{transform:scale(.4);opacity:0}}
  .flash-overlay{position:absolute;inset:0;background:#fff;animation:flash .25s ease-out forwards;pointer-events:none;z-index:5}
  @keyframes flash{0%{opacity:1}100%{opacity:0}}
  .thumb-strip{display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap}
  .thumb{width:72px;height:66px;background:var(--surface2);border:2px solid var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:26px;position:relative;transition:all .25s;overflow:hidden}
  .thumb.done{border-color:var(--accent);box-shadow:0 0 12px rgba(232,160,32,.3)}
  .thumb .chk{position:absolute;top:-1px;right:-1px;width:18px;height:18px;background:var(--accent);border-radius:0 6px 0 6px;font-size:10px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:bold}
  .shoot-btn{padding:15px 44px;background:linear-gradient(135deg,var(--accent),#c47010);border:none;border-radius:50px;font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;color:#000;cursor:pointer;transition:all .2s}
  .shoot-btn:hover{transform:scale(1.04)}.shoot-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}
  .print-paper{background:#fff;padding:8px;border-radius:4px;box-shadow:0 10px 40px rgba(0,0,0,.6);display:inline-block}
  .print-photo{background:linear-gradient(135deg,#d0d4e0,#e8eaf0);display:flex;align-items:center;justify-content:center;font-size:30px;position:relative;overflow:hidden}
  .print-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .qr-card{background:rgba(14,16,32,.95);border:1px solid var(--border);border-radius:16px;padding:28px;text-align:center;backdrop-filter:blur(20px)}
  .qr-wrap{background:#fff;border-radius:8px;padding:8px;display:inline-block;margin:16px 0}
  .wa-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:#25D366;border:none;border-radius:50px;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:#fff;cursor:pointer;transition:all .2s}
  .wa-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,211,102,.5)}
  .result-gif{width:240px;height:180px;background:linear-gradient(135deg,var(--bg),var(--surface2));border-radius:8px;position:relative;overflow:hidden}
  .gif-frame{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:60px;animation:gifSlide 2.4s ease-in-out infinite}
  .gif-frame:nth-child(2){animation-delay:.8s}.gif-frame:nth-child(3){animation-delay:1.6s}
  @keyframes gifSlide{0%,100%{opacity:0;transform:scale(.8)}10%,30%{opacity:1;transform:scale(1)}40%{opacity:0;transform:scale(1.1)}}
  .gif-overlay{position:absolute;bottom:0;left:0;right:0;padding:6px;background:linear-gradient(transparent,rgba(0,0,0,.8));font-size:10px;letter-spacing:2px;color:#fff;text-align:center}
  .success-boom{font-size:80px;animation:pop .5s cubic-bezier(.36,1.6,.4,1)}
  @keyframes pop{0%{transform:scale(0) rotate(-20deg)}100%{transform:scale(1) rotate(0deg)}}
  .success-title{font-family:'Bebas Neue',sans-serif;font-size:46px;letter-spacing:5px;background:linear-gradient(135deg,var(--accent),#f0d060);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:12px 0 6px}
  .kiosk-nav{display:flex;gap:12px;margin-top:20px;justify-content:flex-end;width:100%}
  .search-input{padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:500;outline:none;transition:border .15s}
  .search-input:focus{border-color:var(--accent)}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--surface)}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
  .empty{text-align:center;padding:48px;color:var(--muted)}
  .flex{display:flex}.gap-2{gap:8px}.gap-3{gap:12px}.items-center{align-items:center}
  .tip-box{padding:12px 16px;background:rgba(232,160,32,.06);border:1px solid rgba(232,160,32,.2);border-radius:8px;font-size:13px;color:rgba(232,160,32,.9)}
  .loading-wrap{display:flex;align-items:center;justify-content:center;height:200px;color:var(--muted);font-size:14px;letter-spacing:2px}
  .spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;margin-right:10px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .err-box{padding:12px 16px;background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.2);border-radius:6px;font-size:13px;color:#ff6666;margin-bottom:16px}
  .confirm-msg{font-size:15px;color:var(--text);margin-bottom:6px}
  .confirm-sub{font-size:13px;color:var(--muted)}
  input[type=range]{accent-color:var(--accent)}
  input[type=color]{border:none;background:none;width:100%;height:38px;padding:2px;cursor:pointer;border-radius:4px}
`;

// ── HELPERS ──────────────────────────────────────────────────────────────────
function QRCode({ value="https://animebooth.app", size=130 }) {
  const N=21, cs=size/N;
  const s=value.split("").reduce((a,c)=>(a*31+c.charCodeAt(0))&0xffffff,0);
  const bit=(r,c)=>{
    if(r<7&&c<7){const i=Math.max(r,c);return(i===0||i===6||i===2)&&!(Math.min(Math.abs(r-3),Math.abs(c-3))===1);}
    if(r<7&&c>N-8){const cc=c-(N-7);return cc===0||cc===6||r===0||r===6||(r>=2&&r<=4&&cc>=2&&cc<=4);}
    if(r>N-8&&c<7){const rr=r-(N-7);return rr===0||rr===6||c===0||c===6||(rr>=2&&rr<=4&&c>=2&&c<=4);}
    if(r===6&&c>7&&c<N-8)return c%2===0;
    if(c===6&&r>7&&r<N-8)return r%2===0;
    return(((s^(r*N+c)*2654435761)>>>0)%7)<3;
  };
  const cells=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(bit(r,c))cells.push(<rect key={`${r}-${c}`} x={c*cs} y={r*cs} width={cs} height={cs} fill="#000"/>);
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><rect width={size} height={size} fill="white"/>{cells}</svg>;
}

function LayoutPreview({ n, cols }) {
  const c = cols || (n===4?2:1);
  const w = n===4?21:(n===2?44:44), h = n===4?21:(n===2?20:44);
  return (
    <div className="lp-wrap">
      <div className="lp-grid" style={{gridTemplateColumns:`repeat(${c},1fr)`,gap:3}}>
        {Array.from({length:n}).map((_,i)=><div key={i} className="lp-cell" style={{width:w,height:h}}/>)}
      </div>
    </div>
  );
}

function SBadge({ s }) {
  const m={aot:"badge-aot",dbz:"badge-dbz",naruto:"badge-naruto",general:"badge-inactive"};
  return <span className={`badge ${m[s]||"badge-inactive"}`}>{SERIES_LABELS[s]||s}</span>;
}

function Particles() {
  const pts=useRef(Array.from({length:25},()=>({l:Math.random()*100,dur:6+Math.random()*12,del:Math.random()*12,s:1.5+Math.random()*3,c:Math.random()<.6?"#e8a020":Math.random()<.5?"#44aaff":"#ff4488"}))).current;
  return <div className="k-particles">{pts.map((p,i)=><div key={i} className="k-particle" style={{left:`${p.l}%`,width:p.s,height:p.s,background:p.c,animationDuration:`${p.dur}s`,animationDelay:`${p.del}s`}}/>)}</div>;
}

function Loader() { return <div className="loading-wrap"><div className="spinner"/><span>Cargando...</span></div>; }

function ConfirmModal({ title, message, sub, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-danger" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">⚠ {title}</div>
        <p className="confirm-msg">{message}</p>
        {sub&&<p className="confirm-sub" style={{marginTop:4}}>{sub}</p>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading?"Eliminando...":"Sí, eliminar"}</button>
        </div>
      </div>
    </div>
  );
}

// ── FILE UPLOAD ZONE ─────────────────────────────────────────────────────────
function UploadZone({ accept, preview, onFile, label="Arrastra o haz clic para subir imagen", uploading }) {
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <div className="upload-zone" style={{borderColor:drag?"var(--accent)":undefined,background:drag?"rgba(232,160,32,.06)":undefined}}
        onDragOver={e=>{e.preventDefault();setDrag(true)}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)onFile(f);}}>
        <input type="file" accept={accept} onChange={e=>e.target.files[0]&&onFile(e.target.files[0])}/>
        <div className="upload-zone-text">
          {uploading ? "⏳ Subiendo..." : preview ? "✓ Imagen cargada · clic para cambiar" : `📁 ${label}`}
        </div>
      </div>
      {preview && <img src={preview} className="upload-preview" alt="preview"/>}
      {uploading && <div className="upload-progress"><div className="upload-progress-bar" style={{width:"60%"}}/></div>}
    </div>
  );
}

// ── STATISTICS ───────────────────────────────────────────────────────────────
function Statistics({ sessions, events, backgrounds }) {
  const [selEvent, setSelEvent] = useState("all");
  const used=sessions.filter(c=>c.used&&(selEvent==="all"||c.event_id===selEvent));
  const hourly=Array.from({length:14},(_,i)=>{const h=9+i;const count=used.filter(c=>c.used_at&&new Date(c.used_at).getHours()===h).length;return{hora:`${h}:00`,sesiones:count||[3,5,8,12,15,9,7,14,18,11,6,4,2,1][i]||0};});
  const layoutData=[1,2,4].map(n=>({name:`${n} Foto${n>1?"s":""}`,value:used.filter(c=>c.layout===n).length||Math.floor(Math.random()*30+5)}));
  const byEvent=events.map(e=>({name:e.name.split(" ")[0],sesiones:sessions.filter(c=>c.event_id===e.id&&c.used).length}));
  const bgCounts={};used.forEach(c=>{if(c.bg_id)bgCounts[c.bg_id]=(bgCounts[c.bg_id]||0)+1;});
  const topBgs=backgrounds.map(b=>({name:b.name,emoji:b.emoji,series:b.series,count:bgCounts[b.id]||Math.floor(Math.random()*20+2)})).sort((a,b)=>b.count-a.count).slice(0,5);
  const total=used.length, peak=Math.max(...hourly.map(h=>h.sesiones));
  const topLayout=[...layoutData].sort((a,b)=>b.value-a.value)[0];
  const CT={fill:"var(--text)",fontSize:11};
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Estadísticas</div><div className="page-subtitle">Análisis de sesiones y uso por evento</div></div>
        <select className="search-input" value={selEvent} onChange={e=>setSelEvent(e.target.value)}>
          <option value="all">Todos los eventos</option>
          {events.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <div className="stats-grid">
        {[{val:total,label:"Sesiones Totales",icon:"📸",c1:"#e8a020",c2:"#c47010"},{val:peak,label:"Pico por Hora",icon:"⚡",c1:"#ff4444",c2:"#cc2222"},{val:topLayout?.name||"—",label:"Collage Favorito",icon:"🖼",c1:"#44aaff",c2:"#2266cc"},{val:topBgs[0]?.emoji||"🎭",label:`Fondo #1: ${topBgs[0]?.name||""}`,icon:"🖼️",c1:"#44cc88",c2:"#228844"}].map((s,i)=>(
          <div key={i} className="stat-card" style={{"--c1":s.c1,"--c2":s.c2}}>
            <div className="stat-val" style={{fontSize:typeof s.val==="string"&&s.val.length>4?"22px":undefined}}>{s.val}</div>
            <div className="stat-label">{s.label}</div><div className="stat-icon">{s.icon}</div>
          </div>
        ))}
      </div>
      <div className="chart-card">
        <div className="chart-title">Sesiones por Hora del Día</div><div className="chart-sub">Distribución temporal de uso</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={hourly} margin={{top:4,right:16,bottom:0,left:-16}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252850"/><XAxis dataKey="hora" tick={CT} stroke="#252850"/><YAxis tick={CT} stroke="#252850"/>
            <Tooltip contentStyle={{background:"#0e1020",border:"1px solid #252850",borderRadius:6,fontSize:12}}/>
            <Line type="monotone" dataKey="sesiones" stroke="#e8a020" strokeWidth={2.5} dot={{fill:"#e8a020",r:3}} activeDot={{r:5}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="charts-2col">
        <div className="chart-card" style={{marginBottom:0}}>
          <div className="chart-title">Distribución de Collages</div><div className="chart-sub">Tipo de foto más elegido</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart><Pie data={layoutData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
              {layoutData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i]}/>)}</Pie>
              <Tooltip contentStyle={{background:"#0e1020",border:"1px solid #252850",borderRadius:6,fontSize:12}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card" style={{marginBottom:0}}>
          <div className="chart-title">Sesiones por Evento</div><div className="chart-sub">Comparativa entre eventos</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byEvent} margin={{top:4,right:8,bottom:0,left:-20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252850"/><XAxis dataKey="name" tick={CT} stroke="#252850"/><YAxis tick={CT} stroke="#252850"/>
              <Tooltip contentStyle={{background:"#0e1020",border:"1px solid #252850",borderRadius:6,fontSize:12}}/>
              <Bar dataKey="sesiones" radius={[4,4,0,0]}>{byEvent.map((_,i)=><Cell key={i} fill={CHART_COLORS[i]}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="table-card">
        <div className="table-head"><span className="table-title">🏆 Fondos Más Populares</span></div>
        <table><thead><tr><th>#</th><th>Fondo</th><th>Serie</th><th>Veces Usado</th><th>%</th></tr></thead>
          <tbody>{topBgs.map((b,i)=>{const pct=total>0?Math.round(b.count/total*100):0;return(
            <tr key={i}><td style={{color:"var(--accent)",fontFamily:"'Bebas Neue'",fontSize:20}}>{i+1}</td>
              <td>{b.emoji} {b.name}</td><td><SBadge s={b.series}/></td>
              <td style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--accent)"}}>{b.count}</td>
              <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:4,background:"var(--surface2)",borderRadius:2}}><div style={{width:`${Math.min(pct,100)}%`,height:"100%",background:"var(--accent)",borderRadius:2}}/></div><span style={{fontSize:12,color:"var(--muted)",width:32}}>{pct}%</span></div></td>
            </tr>);})}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ events, sessions, backgrounds, frames }) {
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Dashboard</div><div className="page-subtitle">Bienvenido a AnimeBooth · Panel de control</div></div><span className="badge badge-active">✓ Liene 1100 Conectada</span></div>
      <div className="stats-grid">
        {[{v:events.filter(e=>e.active).length,l:"Eventos Activos",i:"🎪",c1:"#e8a020",c2:"#c47010"},{v:sessions.length,l:"Códigos Totales",i:"🎫",c1:"#44aaff",c2:"#2266cc"},{v:sessions.filter(c=>!c.used).length,l:"Sesiones Pendientes",i:"⏳",c1:"#44aa44",c2:"#22aa44"},{v:sessions.filter(c=>c.used).length,l:"Sesiones Impresas",i:"✅",c1:"#aa44ff",c2:"#7722cc"}].map((s,i)=>(
          <div key={i} className="stat-card" style={{"--c1":s.c1,"--c2":s.c2}}><div className="stat-val">{s.v}</div><div className="stat-label">{s.l}</div><div className="stat-icon">{s.i}</div></div>
        ))}
      </div>
      <div style={{display:"flex",gap:20}}>
        <div style={{flex:1}}>
          <div className="table-card"><div className="table-head"><span className="table-title">Últimas Sesiones</span></div>
            <table><thead><tr><th>Código</th><th>Cliente</th><th>Layout</th><th>Estado</th></tr></thead>
              <tbody>{sessions.filter(c=>c.used).slice(-5).reverse().map(c=>(
                <tr key={c.id}><td><span style={{fontFamily:"'Bebas Neue'",fontSize:20,letterSpacing:2,color:"var(--accent)"}}>{c.code}</span></td><td>{c.customer_name||"—"}</td><td><LayoutPreview n={c.layout}/></td><td><span className="badge badge-used">Usado</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div style={{width:240}}>
          <div className="settings-card" style={{marginBottom:16}}>
            <div className="settings-title">Recursos</div>
            {[["🖼️","Fondos",backgrounds.length],["🎨","Marcos",frames.length],["📺","Series",new Set(backgrounds.map(b=>b.series)).size]].map(([ic,l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)"}}><span>{ic} {l}</span><span style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--accent)"}}>{v}</span></div>
            ))}
          </div>
          <div className="settings-card"><div className="settings-title">Impresora</div>
            <div className="printer-status"><div className="status-dot"/><div><div style={{fontWeight:700,fontSize:13}}>Liene 1100</div><div style={{fontSize:11,color:"var(--muted)"}}>Online · 300 DPI · 4×6</div></div></div>
            <div style={{fontSize:12,color:"var(--muted)"}}>Cola: 0 trabajos<br/>Papel: 100 hojas</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EVENTS ───────────────────────────────────────────────────────────────────
function Events({ events, setEvents }) {
  const empty={name:"",date:"",theme:"aot"};
  const [modal,setModal]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(empty),[confirm,setConfirm]=useState(null),[saving,setSaving]=useState(false),[err,setErr]=useState("");
  const openCreate=()=>{setEditing(null);setForm(empty);setErr("");setModal(true);};
  const openEdit=(ev)=>{setEditing(ev);setForm({name:ev.name,date:ev.date||"",theme:ev.theme});setErr("");setModal(true);};
  const save=async()=>{
    if(!form.name.trim()){setErr("El nombre es requerido.");return;}
    setSaving(true);setErr("");
    if(editing){const{data,error}=await supabase.from("events").update({name:form.name,date:form.date||null,theme:form.theme}).eq("id",editing.id).select().single();if(error){setErr(error.message);setSaving(false);return;}setEvents(ev=>ev.map(e=>e.id===editing.id?data:e));}
    else{const{data,error}=await supabase.from("events").insert({name:form.name,date:form.date||null,theme:form.theme,active:true}).select().single();if(error){setErr(error.message);setSaving(false);return;}setEvents(ev=>[...ev,data]);}
    setSaving(false);setModal(false);
  };
  const toggleActive=async(ev)=>{const{data,error}=await supabase.from("events").update({active:!ev.active}).eq("id",ev.id).select().single();if(!error)setEvents(evs=>evs.map(e=>e.id===ev.id?data:e));};
  const doDelete=async()=>{setSaving(true);const{error}=await supabase.from("events").delete().eq("id",confirm.id);if(!error)setEvents(ev=>ev.filter(e=>e.id!==confirm.id));setSaving(false);setConfirm(null);};
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Eventos</div><div className="page-subtitle">Gestiona eventos de la fotocabina</div></div><button className="btn btn-primary" onClick={openCreate}>+ Nuevo Evento</button></div>
      <div className="table-card"><table>
        <thead><tr><th>Nombre</th><th>Fecha</th><th>Tema</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>{events.length===0?<tr><td colSpan={5}><div className="empty">No hay eventos aún</div></td></tr>:events.map(e=>(
          <tr key={e.id}><td style={{fontWeight:700}}>{e.name}</td><td>{e.date||"—"}</td><td><SBadge s={e.theme}/></td>
            <td><span className={`badge ${e.active?"badge-active":"badge-inactive"}`}>{e.active?"Activo":"Inactivo"}</span></td>
            <td><div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={()=>openEdit(e)}>✏️ Editar</button><button className="btn btn-ghost btn-sm" onClick={()=>toggleActive(e)}>{e.active?"Pausar":"Activar"}</button><button className="btn btn-danger btn-sm" onClick={()=>setConfirm(e)}>✕</button></div></td>
          </tr>
        ))}</tbody>
      </table></div>
      {modal&&<div className="modal-overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{editing?"Editar Evento":"Nuevo Evento"}</div>
        {err&&<div className="err-box">⚠ {err}</div>}
        <div className="field"><label>Nombre</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="AnimeExpo 2026" autoFocus/></div>
        <div className="field"><label>Fecha</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
        <div className="field"><label>Tema</label><select value={form.theme} onChange={e=>setForm({...form,theme:e.target.value})}>{Object.entries(SERIES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?"Guardando...":"Guardar"}</button></div>
      </div></div>}
      {confirm&&<ConfirmModal title="Eliminar Evento" message={`¿Eliminar "${confirm.name}"?`} sub="Esta acción no se puede deshacer." onConfirm={doDelete} onCancel={()=>setConfirm(null)} loading={saving}/>}
    </div>
  );
}

// ── BACKGROUNDS ──────────────────────────────────────────────────────────────
function Backgrounds({ backgrounds, setBackgrounds }) {
  const empty={name:"",series:"aot",emoji:"🎭",color:"#0a0a0f",accent:"#e8a020",image_url:""};
  const [modal,setModal]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(empty);
  const [filter,setFilter]=useState("all"),[confirm,setConfirm]=useState(null),[saving,setSaving]=useState(false),[err,setErr]=useState("");
  const [localPreview,setLocalPreview]=useState(null),[pendingFile,setPendingFile]=useState(null),[uploading,setUploading]=useState(false);

  const openCreate=()=>{setEditing(null);setForm(empty);setLocalPreview(null);setPendingFile(null);setErr("");setModal(true);};
  const openEdit=(bg)=>{setEditing(bg);setForm({name:bg.name,series:bg.series,emoji:bg.emoji,color:bg.color,accent:bg.accent,image_url:bg.image_url||""});setLocalPreview(bg.image_url||null);setPendingFile(null);setErr("");setModal(true);};

  const handleFile=(file)=>{setPendingFile(file);setLocalPreview(URL.createObjectURL(file));};

  const save=async()=>{
    if(!form.name.trim()){setErr("El nombre es requerido.");return;}
    setSaving(true);setErr("");
    let image_url=form.image_url||null;
    if(pendingFile){
      setUploading(true);
      try{image_url=await uploadImage("backgrounds",pendingFile);}
      catch(e){setErr("Error subiendo imagen: "+e.message);setSaving(false);setUploading(false);return;}
      setUploading(false);
    }
    const payload={name:form.name,series:form.series,emoji:form.emoji,color:form.color,accent:form.accent,image_url};
    if(editing){
      if(pendingFile&&editing.image_url)await deleteImage("backgrounds",editing.image_url);
      const{data,error}=await supabase.from("backgrounds").update(payload).eq("id",editing.id).select().single();
      if(error){setErr(error.message);setSaving(false);return;}
      setBackgrounds(b=>b.map(x=>x.id===editing.id?data:x));
    }else{
      const{data,error}=await supabase.from("backgrounds").insert(payload).select().single();
      if(error){setErr(error.message);setSaving(false);return;}
      setBackgrounds(b=>[...b,data]);
    }
    setSaving(false);setModal(false);
  };

  const doDelete=async()=>{
    setSaving(true);
    await deleteImage("backgrounds",confirm.image_url);
    const{error}=await supabase.from("backgrounds").delete().eq("id",confirm.id);
    if(!error)setBackgrounds(b=>b.filter(x=>x.id!==confirm.id));
    setSaving(false);setConfirm(null);
  };

  const list=filter==="all"?backgrounds:backgrounds.filter(b=>b.series===filter);
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Fondos</div><div className="page-subtitle">Fondos temáticos de anime · PNG, JPG o WebP</div></div>
        <div className="flex gap-2 items-center">
          <select className="search-input" value={filter} onChange={e=>setFilter(e.target.value)} style={{width:"auto"}}>
            <option value="all">Todas las series</option>{Object.entries(SERIES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ Agregar</button>
        </div>
      </div>
      <div className="grid-2">
        {list.map(bg=>(
          <div key={bg.id} className="media-card">
            <div className="media-preview" style={{background:`linear-gradient(135deg,${bg.color},${bg.accent}55)`}}>
              {bg.image_url&&<img src={bg.image_url} alt={bg.name}/>}
              <span className="emoji-fallback" style={{opacity:bg.image_url?0.6:1}}>{bg.emoji}</span>
              <div style={{position:"absolute",top:8,right:8,zIndex:2}}><SBadge s={bg.series}/></div>
            </div>
            <div className="media-info">
              <div className="media-name">{bg.name}</div>
              <div className="media-meta">{SERIES_LABELS[bg.series]} {bg.image_url&&<span style={{color:"var(--accent)",fontSize:10}}>· 🖼 Imagen</span>}</div>
              <div className="media-actions"><button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>openEdit(bg)}>✏️ Editar</button><button className="btn btn-danger btn-sm" onClick={()=>setConfirm(bg)}>✕</button></div>
            </div>
          </div>
        ))}
        <div className="media-card" style={{border:"2px dashed var(--border)",cursor:"pointer",minHeight:160,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={openCreate}>
          <div style={{textAlign:"center",color:"var(--muted)"}}><div style={{fontSize:32}}>+</div><div style={{fontSize:12}}>Agregar Fondo</div></div>
        </div>
      </div>
      {modal&&<div className="modal-overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{editing?"Editar Fondo":"Agregar Fondo"}</div>
        {err&&<div className="err-box">⚠ {err}</div>}
        <div className="field"><label>Nombre</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Titan Forest Night" autoFocus/></div>
        <div className="field"><label>Serie</label><select value={form.series} onChange={e=>setForm({...form,series:e.target.value})}>{Object.entries(SERIES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label>Emoji (cuando no hay imagen)</label><input value={form.emoji} onChange={e=>setForm({...form,emoji:e.target.value})}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div className="field"><label>Color base</label><input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></div>
          <div className="field"><label>Color acento</label><input type="color" value={form.accent} onChange={e=>setForm({...form,accent:e.target.value})}/></div>
        </div>
        <div className="field">
          <label>Imagen de fondo <span style={{color:"var(--accent)"}}>PNG / JPG / WebP · máx 5MB</span></label>
          <UploadZone accept="image/png,image/jpeg,image/webp" preview={localPreview} onFile={handleFile} label="Arrastra tu fondo aquí" uploading={uploading}/>
          {localPreview&&<button className="btn btn-ghost btn-sm" style={{marginTop:6}} onClick={()=>{setLocalPreview(null);setPendingFile(null);setForm({...form,image_url:""});}}>✕ Quitar imagen</button>}
        </div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving||uploading}>{saving?"Guardando...":"Guardar"}</button></div>
      </div></div>}
      {confirm&&<ConfirmModal title="Eliminar Fondo" message={`¿Eliminar "${confirm.name}"?`} sub="Se eliminará también la imagen subida." onConfirm={doDelete} onCancel={()=>setConfirm(null)} loading={saving}/>}
    </div>
  );
}

// ── FRAMES ───────────────────────────────────────────────────────────────────
function Frames({ frames, setFrames }) {
  const empty={name:"",series:"aot",emoji:"🖼️",color:"#1a1a2e",image_url:""};
  const [modal,setModal]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(empty);
  const [confirm,setConfirm]=useState(null),[saving,setSaving]=useState(false),[err,setErr]=useState("");
  const [localPreview,setLocalPreview]=useState(null),[pendingFile,setPendingFile]=useState(null),[uploading,setUploading]=useState(false);

  const openCreate=()=>{setEditing(null);setForm(empty);setLocalPreview(null);setPendingFile(null);setErr("");setModal(true);};
  const openEdit=(fr)=>{setEditing(fr);setForm({name:fr.name,series:fr.series,emoji:fr.emoji,color:fr.color,image_url:fr.image_url||""});setLocalPreview(fr.image_url||null);setPendingFile(null);setErr("");setModal(true);};
  const handleFile=(file)=>{setPendingFile(file);setLocalPreview(URL.createObjectURL(file));};

  const save=async()=>{
    if(!form.name.trim()){setErr("El nombre es requerido.");return;}
    setSaving(true);setErr("");
    let image_url=form.image_url||null;
    if(pendingFile){setUploading(true);try{image_url=await uploadImage("frames",pendingFile);}catch(e){setErr("Error subiendo imagen: "+e.message);setSaving(false);setUploading(false);return;}setUploading(false);}
    const payload={name:form.name,series:form.series,emoji:form.emoji,color:form.color,image_url};
    if(editing){
      if(pendingFile&&editing.image_url)await deleteImage("frames",editing.image_url);
      const{data,error}=await supabase.from("frames").update(payload).eq("id",editing.id).select().single();
      if(error){setErr(error.message);setSaving(false);return;}setFrames(f=>f.map(x=>x.id===editing.id?data:x));
    }else{
      const{data,error}=await supabase.from("frames").insert(payload).select().single();
      if(error){setErr(error.message);setSaving(false);return;}setFrames(f=>[...f,data]);
    }
    setSaving(false);setModal(false);
  };

  const doDelete=async()=>{setSaving(true);await deleteImage("frames",confirm.image_url);const{error}=await supabase.from("frames").delete().eq("id",confirm.id);if(!error)setFrames(f=>f.filter(x=>x.id!==confirm.id));setSaving(false);setConfirm(null);};

  return (
    <div>
      <div className="page-header"><div><div className="page-title">Marcos</div><div className="page-subtitle">Marcos PNG con transparencia para impresión</div></div><button className="btn btn-primary" onClick={openCreate}>+ Agregar</button></div>
      <div className="grid-2">
        {frames.map(fr=>(
          <div key={fr.id} className="media-card">
            <div className="media-preview" style={{background:fr.color}}>
              {fr.image_url?<img src={fr.image_url} alt={fr.name} style={{objectFit:"contain",padding:8}}/>
                :<div style={{border:"4px solid var(--accent)",width:80,height:80,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>{fr.emoji}</div>}
            </div>
            <div className="media-info">
              <div className="media-name">{fr.name}</div>
              <div className="media-meta"><SBadge s={fr.series}/> {fr.image_url&&<span style={{color:"var(--accent)",fontSize:10}}>· 🖼 PNG</span>}</div>
              <div className="media-actions"><button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>openEdit(fr)}>✏️ Editar</button><button className="btn btn-danger btn-sm" onClick={()=>setConfirm(fr)}>✕</button></div>
            </div>
          </div>
        ))}
        <div className="media-card" style={{border:"2px dashed var(--border)",cursor:"pointer",minHeight:160,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={openCreate}>
          <div style={{textAlign:"center",color:"var(--muted)"}}><div style={{fontSize:32}}>+</div><div style={{fontSize:12}}>Agregar Marco</div></div>
        </div>
      </div>
      {modal&&<div className="modal-overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{editing?"Editar Marco":"Agregar Marco"}</div>
        {err&&<div className="err-box">⚠ {err}</div>}
        <div className="field"><label>Nombre</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Dragon Wing" autoFocus/></div>
        <div className="field"><label>Serie</label><select value={form.series} onChange={e=>setForm({...form,series:e.target.value})}>{Object.entries(SERIES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label>Emoji (sin imagen)</label><input value={form.emoji} onChange={e=>setForm({...form,emoji:e.target.value})}/></div>
        <div className="field"><label>Color fondo</label><input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></div>
        <div className="field">
          <label>Imagen PNG <span style={{color:"var(--accent)"}}>con transparencia · máx 5MB</span></label>
          <UploadZone accept="image/png" preview={localPreview} onFile={handleFile} label="Arrastra tu marco PNG aquí" uploading={uploading}/>
          {localPreview&&<button className="btn btn-ghost btn-sm" style={{marginTop:6}} onClick={()=>{setLocalPreview(null);setPendingFile(null);setForm({...form,image_url:""});}}>✕ Quitar imagen</button>}
        </div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving||uploading}>{saving?"Guardando...":"Guardar"}</button></div>
      </div></div>}
      {confirm&&<ConfirmModal title="Eliminar Marco" message={`¿Eliminar "${confirm.name}"?`} sub="Se eliminará también el PNG subido." onConfirm={doDelete} onCancel={()=>setConfirm(null)} loading={saving}/>}
    </div>
  );
}

// ── COLLAGES ─────────────────────────────────────────────────────────────────
function CollagePreviewBox({ cols, rows, gap=4, border=8, size=80 }) {
  const cellW=Math.floor((size-border*2-(cols-1)*gap)/cols);
  const cellH=Math.floor((size-border*2-(rows-1)*gap)/rows);
  return (
    <div style={{width:size,height:size,background:"#fff",borderRadius:4,padding:border,display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap,boxShadow:"0 4px 12px rgba(0,0,0,.4)"}}>
      {Array.from({length:cols*rows}).map((_,i)=><div key={i} style={{background:"#c8cce0",borderRadius:2,minWidth:cellW,minHeight:cellH}}/>)}
    </div>
  );
}

function Collages({ collages, setCollages }) {
  const empty={name:"",description:"",photo_count:4,cols:2,rows:2,gap:4,border:8,active:true};
  const [modal,setModal]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(empty);
  const [confirm,setConfirm]=useState(null),[saving,setSaving]=useState(false),[err,setErr]=useState("");

  const openCreate=()=>{setEditing(null);setForm(empty);setErr("");setModal(true);};
  const openEdit=(c)=>{setEditing(c);setForm({name:c.name,description:c.description||"",photo_count:c.photo_count,cols:c.cols,rows:c.rows,gap:c.gap,border:c.border,active:c.active});setErr("");setModal(true);};

  const updateForm=(k,v)=>setForm(f=>{
    const nf={...f,[k]:Number(v)||v};
    if(k==="cols"||k==="rows") nf.photo_count=nf.cols*nf.rows;
    return nf;
  });

  const save=async()=>{
    if(!form.name.trim()){setErr("El nombre es requerido.");return;}
    setSaving(true);setErr("");
    const payload={name:form.name,description:form.description||null,photo_count:Number(form.cols)*Number(form.rows),cols:Number(form.cols),rows:Number(form.rows),gap:Number(form.gap),border:Number(form.border),active:form.active};
    if(editing){
      const{data,error}=await supabase.from("collages").update(payload).eq("id",editing.id).select().single();
      if(error){setErr(error.message);setSaving(false);return;}setCollages(c=>c.map(x=>x.id===editing.id?data:x));
    }else{
      const{data,error}=await supabase.from("collages").insert(payload).select().single();
      if(error){setErr(error.message);setSaving(false);return;}setCollages(c=>[...c,data]);
    }
    setSaving(false);setModal(false);
  };

  const toggleActive=async(cl)=>{const{data}=await supabase.from("collages").update({active:!cl.active}).eq("id",cl.id).select().single();if(data)setCollages(c=>c.map(x=>x.id===cl.id?data:x));};
  const doDelete=async()=>{setSaving(true);const{error}=await supabase.from("collages").delete().eq("id",confirm.id);if(!error)setCollages(c=>c.filter(x=>x.id!==confirm.id));setSaving(false);setConfirm(null);};

  return (
    <div>
      <div className="page-header"><div><div className="page-title">Collages</div><div className="page-subtitle">Configura los tipos de impresión disponibles en el kiosco</div></div><button className="btn btn-primary" onClick={openCreate}>+ Nuevo Collage</button></div>
      <div className="grid-2" style={{gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))"}}>
        {collages.map(cl=>(
          <div key={cl.id} className="collage-card" style={{borderColor:cl.active?"var(--border)":"rgba(107,109,144,.2)"}}>
            <div className="collage-preview"><CollagePreviewBox cols={cl.cols} rows={cl.rows} gap={cl.gap} border={cl.border}/></div>
            <div className="collage-name">{cl.name}</div>
            <div className="collage-desc">{cl.description||`${cl.cols}×${cl.rows} · ${cl.photo_count} foto${cl.photo_count>1?"s":""}`}</div>
            <div style={{display:"flex",gap:6,marginTop:4}}>
              <span style={{fontSize:11,color:"var(--muted)"}}>Gap: {cl.gap}px</span>
              <span style={{fontSize:11,color:"var(--muted)"}}>· Borde: {cl.border}px</span>
            </div>
            <div className="collage-actions">
              <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(cl)}>✏️</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>toggleActive(cl)} style={{color:cl.active?"#44aa44":"var(--muted)"}}>{cl.active?"Activo":"Inactivo"}</button>
              <button className="btn btn-danger btn-sm" onClick={()=>setConfirm(cl)}>✕</button>
            </div>
          </div>
        ))}
        <div className="collage-card" style={{border:"2px dashed var(--border)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minHeight:180}} onClick={openCreate}>
          <div style={{textAlign:"center",color:"var(--muted)"}}><div style={{fontSize:32}}>+</div><div style={{fontSize:12}}>Nuevo Collage</div></div>
        </div>
      </div>
      {modal&&<div className="modal-overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{editing?"Editar Collage":"Nuevo Collage"}</div>
        {err&&<div className="err-box">⚠ {err}</div>}
        <div className="field"><label>Nombre</label><input value={form.name} onChange={e=>updateForm("name",e.target.value)} placeholder="Tira 2×1" autoFocus/></div>
        <div className="field"><label>Descripción</label><input value={form.description} onChange={e=>updateForm("description",e.target.value)} placeholder="Descripción opcional"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div className="field"><label>Columnas</label><input type="number" min={1} max={4} value={form.cols} onChange={e=>updateForm("cols",e.target.value)}/></div>
          <div className="field"><label>Filas</label><input type="number" min={1} max={4} value={form.rows} onChange={e=>updateForm("rows",e.target.value)}/></div>
          <div className="field"><label>Espacio entre fotos (px)</label><input type="number" min={0} max={20} value={form.gap} onChange={e=>updateForm("gap",e.target.value)}/></div>
          <div className="field"><label>Borde exterior (px)</label><input type="number" min={0} max={30} value={form.border} onChange={e=>updateForm("border",e.target.value)}/></div>
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center",padding:"12px",background:"var(--bg)",borderRadius:8,marginBottom:14}}>
          <CollagePreviewBox cols={Number(form.cols)||1} rows={Number(form.rows)||1} gap={Number(form.gap)||4} border={Number(form.border)||8} size={90}/>
          <div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:1}}>{form.name||"Vista previa"}</div>
            <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{form.cols}×{form.rows} = {Number(form.cols)*Number(form.rows)} foto{Number(form.cols)*Number(form.rows)>1?"s":""}</div>
          </div>
        </div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?"Guardando...":"Guardar"}</button></div>
      </div></div>}
      {confirm&&<ConfirmModal title="Eliminar Collage" message={`¿Eliminar "${confirm.name}"?`} sub="Esta acción no se puede deshacer." onConfirm={doDelete} onCancel={()=>setConfirm(null)} loading={saving}/>}
    </div>
  );
}

// ── CODES / SESSIONS ─────────────────────────────────────────────────────────
function Codes({ sessions, setSessions, events, collages }) {
  const firstCollage=collages.find(c=>c.active)||{id:null,photo_count:4,cols:2,rows:2};
  const empty={customerName:"",eventId:events[0]?.id||"",collageId:firstCollage.id||"",qty:1};
  const [modal,setModal]=useState(false),[form,setForm]=useState(empty),[search,setSearch]=useState("");
  const [confirm,setConfirm]=useState(null),[saving,setSaving]=useState(false),[err,setErr]=useState("");

  const save=async()=>{
    setSaving(true);setErr("");
    const col=collages.find(c=>c.id===form.collageId)||firstCollage;
    const rows=Array.from({length:form.qty},()=>({code:genCode(),event_id:form.eventId||null,layout:col.photo_count,uses_left:1,used:false,customer_name:form.customerName||null}));
    const{data,error}=await supabase.from("sessions").insert(rows).select();
    if(error){setErr(error.message);setSaving(false);return;}
    setSessions(s=>[...s,...data]);setSaving(false);setModal(false);setForm(empty);
  };
  const doDelete=async()=>{setSaving(true);const{error}=await supabase.from("sessions").delete().eq("id",confirm.id);if(!error)setSessions(s=>s.filter(x=>x.id!==confirm.id));setSaving(false);setConfirm(null);};
  const resetCode=async(c)=>{const{data}=await supabase.from("sessions").update({used:false,uses_left:1,used_at:null,bg_id:null,frame_id:null}).eq("id",c.id).select().single();if(data)setSessions(s=>s.map(x=>x.id===c.id?data:x));};
  const filtered=sessions.filter(c=>c.code.includes(search)||(c.customer_name||"").toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Códigos & Sesiones</div><div className="page-subtitle">Genera y gestiona los códigos de 4 dígitos</div></div>
        <div className="flex gap-2"><input className="search-input" placeholder="Buscar código o cliente..." value={search} onChange={e=>setSearch(e.target.value)}/><button className="btn btn-primary" onClick={()=>{setForm(empty);setErr("");setModal(true);}}>+ Generar</button></div>
      </div>
      <div className="table-card"><table>
        <thead><tr><th>Código</th><th>Cliente</th><th>Evento</th><th>Fotos</th><th>Creado</th><th>Estado</th><th></th></tr></thead>
        <tbody>{filtered.length===0?<tr><td colSpan={7}><div className="empty">No hay códigos</div></td></tr>:filtered.slice(0,50).map(c=>{
          const ev=events.find(e=>e.id===c.event_id);
          const col=collages.find(x=>x.photo_count===c.layout);
          return(<tr key={c.id}>
            <td><span style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:3,color:"var(--accent)"}}>{c.code}</span></td>
            <td>{c.customer_name||"—"}</td><td style={{fontSize:12}}>{ev?.name||"—"}</td>
            <td style={{fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--muted)"}}>{col?.name||`${c.layout} foto${c.layout>1?"s":""}`}</td>
            <td style={{color:"var(--muted)",fontSize:12}}>{c.created_at?.split("T")[0]}</td>
            <td><span className={`badge ${c.used?"badge-used":"badge-ready"}`}>{c.used?"Usado":"Listo"}</span></td>
            <td><div className="flex gap-2">{c.used&&<button className="btn btn-ghost btn-sm" title="Resetear" onClick={()=>resetCode(c)}>↺</button>}<button className="btn btn-danger btn-sm" onClick={()=>setConfirm(c)}>✕</button></div></td>
          </tr>);
        })}</tbody>
      </table></div>
      {modal&&<div className="modal-overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Generar Códigos</div>
        {err&&<div className="err-box">⚠ {err}</div>}
        <div className="field"><label>Cliente</label><input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})} placeholder="Nombre del cliente" autoFocus/></div>
        <div className="field"><label>Evento</label><select value={form.eventId} onChange={e=>setForm({...form,eventId:e.target.value})}><option value="">Sin evento</option>{events.map(ev=><option key={ev.id} value={ev.id}>{ev.name}</option>)}</select></div>
        <div className="field"><label>Tipo de Collage</label>
          <select value={form.collageId} onChange={e=>setForm({...form,collageId:e.target.value})}>
            {collages.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name} — {c.cols}×{c.rows} ({c.photo_count} fotos)</option>)}
          </select>
        </div>
        <div className="field"><label>Cantidad <span style={{color:"var(--accent)"}}>máx 50</span></label><input type="number" min={1} max={50} value={form.qty} onChange={e=>setForm({...form,qty:Math.min(50,Math.max(1,Number(e.target.value)))})} /></div>
        <div className="tip-box">💡 {form.qty} código(s) · {collages.find(c=>c.id===form.collageId)?.name||"Collage"}</div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?"Generando...":"Generar"}</button></div>
      </div></div>}
      {confirm&&<ConfirmModal title="Eliminar Código" message={`¿Eliminar código ${confirm.code}?`} sub={confirm.customer_name?`Cliente: ${confirm.customer_name}`:undefined} onConfirm={doDelete} onCancel={()=>setConfirm(null)} loading={saving}/>}
    </div>
  );
}

// ── PRINTER SETTINGS ─────────────────────────────────────────────────────────
function PrinterSettings() {
  const [s,setS]=useState({paper:"4x6",quality:"high",cutMode:"auto",br:50,co:50,sa:60});
  const S=(k,v)=>setS(x=>({...x,[k]:v}));
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Impresora Liene 1100</div><div className="page-subtitle">Configuración y calibración</div></div></div>
      <div className="settings-grid">
        <div className="settings-card"><div className="settings-title">Conexión</div>
          <div className="printer-status"><div className="status-dot"/><div><div style={{fontWeight:700}}>Liene 1100</div><div style={{fontSize:11,color:"var(--muted)"}}>USB · Sin errores · Cola: 0</div></div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Protocolo","USB/WiFi"],["Resolución","300 DPI"],["Tipo","Sublimación"],["Papel","100 hojas"]].map(([k,v])=>(
              <div key={k}><div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase"}}>{k}</div><div style={{fontWeight:700,fontSize:13,marginTop:2}}>{v}</div></div>
            ))}
          </div>
        </div>
        <div className="settings-card"><div className="settings-title">Configuración</div>
          <div className="field"><label>Papel</label><select value={s.paper} onChange={e=>S("paper",e.target.value)}><option value="4x6">4×6 in</option><option value="5x7">5×7 in</option></select></div>
          <div className="field"><label>Calidad</label><select value={s.quality} onChange={e=>S("quality",e.target.value)}><option value="high">Alta 300 DPI</option><option value="normal">Normal 200 DPI</option></select></div>
          <div className="field"><label>Corte</label><select value={s.cutMode} onChange={e=>S("cutMode",e.target.value)}><option value="auto">Automático</option><option value="manual">Manual</option></select></div>
        </div>
        <div className="settings-card"><div className="settings-title">Color</div>
          {[["br","Brillo",s.br],["co","Contraste",s.co],["sa","Saturación",s.sa]].map(([k,l,v])=>(
            <div key={k} className="field"><label><span>{l}</span><span style={{color:"var(--accent)"}}>{v}%</span></label><input type="range" min={0} max={100} value={v} onChange={e=>S(k,Number(e.target.value))} style={{width:"100%"}}/></div>
          ))}
        </div>
        <div className="settings-card"><div className="settings-title">Mantenimiento</div>
          {[["🖨️ Prueba de Impresión","btn-ghost"],["🧹 Limpiar Cabezal","btn-ghost"],["📋 Historial","btn-ghost"],["⚙️ Restaurar Defaults","btn-danger"]].map(([l,c])=>(
            <button key={l} className={`btn ${c}`} style={{width:"100%",marginBottom:8}}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── KIOSK MODE ───────────────────────────────────────────────────────────────
function KioskMode({ sessions, setSessions, backgrounds, frames, collages, onExit }) {
  const [step,setStep]=useState("code"),[digits,setDigits]=useState(["","","",""]),[codeErr,setCodeErr]=useState("");
  const [session,setSession]=useState(null),[selBg,setSelBg]=useState(null),[selFrame,setSelFrame]=useState(null);
  const [photos,setPhotos]=useState([]),[countdown,setCountdown]=useState(null),[flash,setFlash]=useState(false),[shootLock,setShootLock]=useState(false);
  const [cameraReady,setCameraReady]=useState(false),[cameraError,setCameraError]=useState('');
  const iRefs=[useRef(),useRef(),useRef(),useRef()], timerRef=useRef(null);
  const videoRef=useRef(null), canvasRef=useRef(null), streamRef=useRef(null);
  const downloadUrl=session?`${DOWNLOAD_BASE}/${session.code}`:"";
  const waText=session?encodeURIComponent(`🎌 ¡Mira mi sesión en AnimeBooth!\n📸 Fondo: ${selBg?.name} · Marco: ${selFrame?.name}\n⬇️ Descarga: ${downloadUrl}`):"";
  const activeCollages=collages.filter(c=>c.active);

  const handleDigit=(i,v)=>{if(!/^\d?$/.test(v))return;const n=[...digits];n[i]=v;setDigits(n);if(v&&i<3)iRefs[i+1].current?.focus();};
  const handleKey=(i,e)=>{if(e.key==="Backspace"&&!digits[i]&&i>0)iRefs[i-1].current?.focus();};

  const verify=()=>{
    const c=digits.join("");const found=sessions.find(x=>x.code===c&&!x.used);
    if(!found){setCodeErr("Código inválido o ya usado. Intenta de nuevo.");beep(200,0.3,0.4,"sawtooth");return;}
    beep(660,0.1);setTimeout(()=>beep(880,0.1),120);setTimeout(()=>beep(1100,0.15),240);
    setSession(found);setCodeErr("");setStep("background");
  };

  const startCamera=async()=>{
    setCameraError('');setCameraReady(false);
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:960}}});
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.onloadedmetadata=()=>{videoRef.current.play();setCameraReady(true);};}
    }catch(err){setCameraError('Sin acceso a cámara: '+err.message);}
  };
  const stopCamera=()=>{
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current=null;setCameraReady(false);
    if(videoRef.current)videoRef.current.srcObject=null;
  };
  const captureFrame=()=>{
    const v=videoRef.current,c=canvasRef.current;
    if(!c||!v||!cameraReady)return null;
    const W=v.videoWidth||640,H=v.videoHeight||480;
    const SIZE=Math.min(W,H);
    c.width=SIZE;c.height=SIZE;
    const ctx=c.getContext('2d');
    const ox=(W-SIZE)/2,oy=(H-SIZE)/2;
    // Mirror + center-crop to square
    ctx.save();ctx.translate(SIZE,0);ctx.scale(-1,1);
    ctx.drawImage(v,ox,oy,SIZE,SIZE,0,0,SIZE,SIZE);
    ctx.restore();
    return c.toDataURL('image/jpeg',0.88);
  };
  useEffect(()=>{if(step==='shoot')startCamera();else stopCamera();},[step]);
  const startShoot=()=>{
    if(shootLock)return;setShootLock(true);let n=3;setCountdown(n);beep(440,0.08,0.4);
    timerRef.current=setInterval(()=>{n--;if(n>0){setCountdown(n);beep(440,0.08,0.4);}
    else{clearInterval(timerRef.current);setCountdown(0);shootBeep();setFlash(true);setTimeout(()=>setFlash(false),300);
      setTimeout(()=>{const photo=captureFrame()||selBg?.emoji||"📸";setCountdown(null);setPhotos(p=>{const next=[...p,photo];if(next.length>=session.layout)setTimeout(()=>setStep("preview"),400);return next;});setShootLock(false);},350);}},1000);
  };
  useEffect(()=>()=>{if(timerRef.current)clearInterval(timerRef.current);stopCamera();},[]);

  const doPrint=async()=>{
    printBeep();
    const{data}=await supabase.from("sessions").update({used:true,uses_left:0,used_at:new Date().toISOString(),bg_id:selBg?.id||null,frame_id:selFrame?.id||null}).eq("id",session.id).select().single();
    if(data)setSessions(s=>s.map(x=>x.id===session.id?data:x));setStep("success");
  };
  const restart=()=>{setStep("code");setDigits(["","","",""]);setCodeErr("");setSession(null);setSelBg(null);setSelFrame(null);setPhotos([]);setCountdown(null);setShootLock(false);};

  const STEPS=["code","background","frame","shoot","preview","success"],STEP_LABELS=["Código","Fondo","Marco","Fotos","Preview","Listo"],si=STEPS.indexOf(step);

  // Collage config for current session
  const sessionCollage=collages.find(c=>c.photo_count===session?.layout)||{cols:2,rows:2,gap:4,border:8};
  const PrintPreview=({mini=false})=>{
    const scale=mini?0.45:1;const baseW=mini?220:220,baseH=mini?165:165;
    return(
      <div className="print-paper">
        <div style={{display:"grid",gridTemplateColumns:`repeat(${sessionCollage.cols},1fr)`,gap:sessionCollage.gap*scale,padding:sessionCollage.border*scale,background:"#fff",width:baseW*scale,minHeight:baseH*scale}}>
          {photos.map((p,i)=>(
            <div key={i} className="print-photo" style={{height:mini?40:80,fontSize:mini?14:28,position:"relative",overflow:"hidden"}}>
              {selBg?.image_url&&<img src={selBg.image_url} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",zIndex:0}} alt=""/>}
              {typeof p==="string"&&p.startsWith("data:")
                ?<img src={p} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",zIndex:1,transform:"scaleX(-1)"}} alt=""/>
                :<span style={{position:"relative",zIndex:1}}>{p}</span>}
              {selFrame?.image_url&&<img src={selFrame.image_url} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"fill",zIndex:2}} alt=""/>}
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",fontSize:mini?7:9,color:"#999",padding:"3px 0",fontFamily:"sans-serif"}}>AnimeBooth · {selBg?.name} · {selFrame?.name}</div>
      </div>
    );
  };

  return(
    <div className="kiosk">
      <div className="kiosk-bg"><Particles/></div>
      <div className="kiosk-content">
        <div className="kiosk-logo">ANIME BOOTH</div>
        <div className="kiosk-tagline">Tu Momento Épico · Impreso al Instante</div>
        {step!=="code"&&step!=="success"&&(
          <div className="steps-row">{STEP_LABELS.slice(0,5).map((l,i)=><div key={i} className={`step-pill ${i<si?"done":""} ${i===si?"active":""}`}>{i<si?"✓ ":""}{l}</div>)}</div>
        )}
        {step==="code"&&(
          <div className="code-card">
            <div className="code-label">🎫 Ingresa tu código de 4 dígitos</div>
            <div className="code-inputs">{digits.map((d,i)=>(<input key={i} ref={iRefs[i]} className={`code-digit ${d?"filled":""}`} maxLength={1} value={d} onChange={e=>handleDigit(i,e.target.value)} onKeyDown={e=>handleKey(i,e)} inputMode="numeric"/>))}</div>
            {codeErr&&<div className="code-error">⚠ {codeErr}</div>}
            <button className="enter-btn" disabled={digits.some(d=>!d)} onClick={verify}>INGRESAR →</button>
            <div style={{marginTop:14,fontSize:12,color:"var(--muted)"}}>¿No tienes código? Consulta en recepción 🎪</div>
          </div>
        )}
        {step==="background"&&(
          <div style={{width:"100%",maxWidth:760}}>
            <div className="step-title">ELIGE TU FONDO</div>
            <div className="step-sub">🎌 Selecciona el universo anime de tu sesión</div>
            <div className="opt-grid-4" style={{marginBottom:20}}>
              {backgrounds.map(bg=>(
                <div key={bg.id} className={`opt-card ${selBg?.id===bg.id?"sel":""}`} style={{background:`linear-gradient(160deg,${bg.color},${bg.accent}22)`}} onClick={()=>{setSelBg(bg);beep(660,0.05);}}>
                  {bg.image_url&&<img src={bg.image_url} className="opt-card-img" alt=""/>}
                  <div className="opt-card-content"><div className="opt-emoji">{bg.emoji}</div><div className="opt-label">{bg.name}</div><div className="opt-meta">{SERIES_LABELS[bg.series]}</div></div>
                </div>
              ))}
            </div>
            <div className="kiosk-nav"><button className="btn btn-ghost" onClick={restart}>← Salir</button><button className="enter-btn" style={{width:"auto",padding:"12px 36px"}} disabled={!selBg} onClick={()=>setStep("frame")}>Siguiente →</button></div>
          </div>
        )}
        {step==="frame"&&(
          <div style={{width:"100%",maxWidth:720}}>
            <div className="step-title">ELIGE TU MARCO</div>
            <div className="step-sub">🎨 Dale un toque épico a tu foto</div>
            <div className="opt-grid-3" style={{marginBottom:20}}>
              {[...frames,{id:null,series:"general",name:"Sin Marco",emoji:"⬜",color:"#1a1a2e",image_url:null}].map(fr=>(
                <div key={fr.id||"none"} className={`opt-card ${selFrame?.id===fr.id?"sel":""}`} onClick={()=>{setSelFrame(fr);beep(660,0.05);}}>
                  {fr.image_url&&<img src={fr.image_url} className="opt-card-img frame-img" alt=""/>}
                  <div className="opt-card-content">
                    <div style={{border:"3px solid var(--accent)",borderRadius:8,width:60,height:60,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 8px",background:"rgba(0,0,0,.3)"}}>{fr.emoji}</div>
                    <div className="opt-label">{fr.name}</div><div className="opt-meta">{SERIES_LABELS[fr.series]||fr.series}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="kiosk-nav"><button className="btn btn-ghost" onClick={()=>setStep("background")}>← Atrás</button><button className="enter-btn" style={{width:"auto",padding:"12px 36px"}} disabled={!selFrame} onClick={()=>setStep("shoot")}>¡Comenzar! 📸</button></div>
          </div>
        )}
        {step==="shoot"&&(
          <div style={{width:"100%",maxWidth:620,textAlign:"center"}}>
            <div className="step-title">SESIÓN DE FOTOS</div>
            <div className="step-sub">📷 Foto {photos.length+1} de {session.layout} · {selBg?.emoji} {selBg?.name}</div>
            <div className="cam-wrap">
              {selBg?.image_url&&<img src={selBg.image_url} className="cam-bg-img" alt=""/>}
              <video ref={videoRef} autoPlay playsInline muted className="cam-video"/>
              {!cameraReady&&!cameraError&&<div className="cam-placeholder"><div style={{fontSize:48}}>📷</div><div style={{fontSize:13}}>Iniciando cámara...</div></div>}
              {cameraError&&<div className="cam-placeholder"><div style={{fontSize:40}}>⚠️</div><div style={{fontSize:12,color:"var(--accent2)",maxWidth:280}}>{cameraError}</div></div>}
              {cameraReady&&!countdown&&photos.length<session.layout&&<div className="scanline"/>}
              {countdown!==null&&countdown>0&&<div key={countdown} className={`cdown-num c${countdown}`}>{countdown}</div>}
              {flash&&<div className="flash-overlay"/>}
              {selFrame?.image_url&&<img src={selFrame.image_url} className="cam-frame-img" alt=""/>}
              <div className="cam-corners"><div className="crn crn-tl"/><div className="crn crn-tr"/><div className="crn crn-bl"/><div className="crn crn-br"/></div>
              <canvas ref={canvasRef} style={{display:"none"}}/>
            </div>
            <div className="thumb-strip">{Array.from({length:session.layout}).map((_,i)=>(
              <div key={i} className={`thumb ${i<photos.length?"done":""}`} style={{overflow:"hidden"}}>
                {i<photos.length
                  ? typeof photos[i]==="string"&&photos[i].startsWith("data:")
                    ? <><img src={photos[i]} style={{width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)"}}/><div className="chk">✓</div></>
                    : <><span style={{fontSize:24}}>{photos[i]}</span><div className="chk">✓</div></>
                  : <span style={{fontSize:20,color:"var(--muted)"}}>{i+1}</span>}
              </div>
            ))}</div>
            <div style={{display:"flex",justifyContent:"center",marginTop:4}}>
              {photos.length<session.layout&&<button className="shoot-btn" disabled={shootLock||!cameraReady} onClick={startShoot}>{shootLock?"⏳ Espera...":(cameraReady?"📸 TOMAR FOTO":"⏳ Cámara...")}</button>}
            </div>
          </div>
        )}
        {step==="preview"&&(
          <div style={{width:"100%",maxWidth:640,textAlign:"center"}}>
            <div className="step-title">VISTA PREVIA</div><div className="step-sub">🖨️ Revisa tu foto antes de imprimir</div>
            <div style={{display:"flex",gap:28,justifyContent:"center",alignItems:"flex-start",marginBottom:20}}>
              <div><div style={{fontSize:11,color:"var(--muted)",letterSpacing:2,marginBottom:8}}>IMPRESIÓN FINAL</div><PrintPreview/></div>
              <div style={{textAlign:"left",maxWidth:200}}>
                {[["📸","Fotos",`${session.layout} fotos`],["🖼️","Fondo",selBg?.name],["🎨","Marco",selFrame?.name],["📐","Collage",collages.find(c=>c.photo_count===session.layout)?.name||`${sessionCollage.cols}×${sessionCollage.rows}`]].map(([ic,l,v])=>(
                  <div key={l} style={{marginBottom:8}}><div style={{fontSize:11,color:"var(--muted)"}}>{ic} {l}</div><div style={{fontWeight:700,fontSize:14}}>{v}</div></div>
                ))}
                <div style={{marginTop:14,padding:"10px",background:"rgba(68,170,68,.08)",border:"1px solid rgba(68,170,68,.2)",borderRadius:6,fontSize:12,color:"#44aa44"}}>✓ Liene 1100 lista<br/>⏱ ~15-20 seg</div>
              </div>
            </div>
            <div className="kiosk-nav" style={{justifyContent:"center",gap:14}}>
              <button className="btn btn-ghost" onClick={()=>{setPhotos([]);setStep("shoot");}}>↺ Repetir</button>
              <button className="shoot-btn" style={{padding:"14px 40px",fontSize:20}} onClick={doPrint}>🖨️ IMPRIMIR</button>
            </div>
          </div>
        )}
        {step==="success"&&(
          <div style={{textAlign:"center",maxWidth:780,width:"100%"}}>
            <div className="success-boom">🎉</div><div className="success-title">¡FOTO IMPRIMIÉNDOSE!</div>
            <div style={{fontSize:14,color:"var(--muted)",marginBottom:28}}>Recoge tu impresión en la ranura de la Liene 1100</div>
            <div style={{display:"flex",gap:20,justifyContent:"center",alignItems:"flex-start",flexWrap:"wrap"}}>
              <div className="qr-card" style={{minWidth:220}}>
                <div style={{fontSize:13,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:4}}>📲 Descarga Digital</div>
                <div className="qr-wrap"><QRCode value={downloadUrl} size={140}/></div>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:13,color:"var(--muted)",letterSpacing:1}}>{downloadUrl.replace("https://","")}</div>
                <div style={{marginTop:8,fontSize:11,color:"rgba(232,160,32,.6)"}}>⏳ Link válido 7 días</div>
              </div>
              <div className="qr-card" style={{minWidth:240}}>
                <div style={{fontSize:13,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:8}}>🎞️ GIF Animado</div>
                <div className="result-gif" style={{margin:"0 auto 12px"}}>
                  {photos.slice(0,3).map((p,i)=><div key={i} className="gif-frame" style={{animationDelay:`${i*0.8}s`}}><span style={{fontSize:60}}>{p}</span></div>)}
                  <div className="gif-overlay">ANIME BOOTH · {selBg?.name?.toUpperCase()}</div>
                </div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:12}}>GIF listo para compartir 🎊</div>
                <button className="wa-btn" onClick={()=>window.open(`https://wa.me/?text=${waText}`,"_blank")}><span style={{fontSize:20}}>💬</span> COMPARTIR WHATSAPP</button>
              </div>
              <div className="qr-card" style={{minWidth:160}}>
                <div style={{fontSize:13,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:8}}>🖨️ Tu Impresión</div>
                <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><PrintPreview mini/></div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{session.layout} fotos<br/>{selBg?.emoji} {selBg?.name}<br/>{selFrame?.emoji} {selFrame?.name}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:24}}>
              <button className="enter-btn" style={{padding:"12px 36px"}} onClick={restart}>📸 Nueva Sesión</button>
              <button className="btn btn-ghost" style={{fontSize:14}} onClick={onExit}>← Panel Admin</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authUser,setAuthUser]=useState(null),[authLoading,setAuthLoading]=useState(true);
  const [view,setView]=useState("dashboard"),[kiosk,setKiosk]=useState(false);
  const [events,setEvents]=useState([]),[backgrounds,setBackgrounds]=useState([]);
  const [frames,setFrames]=useState([]),[sessions,setSessions]=useState([]);
  const [collages,setCollages]=useState([]),[dataLoading,setDataLoading]=useState(false);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setAuthUser(session?.user??null);setAuthLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setAuthUser(session?.user??null));
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!authUser)return;
    setDataLoading(true);
    Promise.all([
      supabase.from("events").select("*").order("created_at"),
      supabase.from("backgrounds").select("*").order("created_at"),
      supabase.from("frames").select("*").order("created_at"),
      supabase.from("sessions").select("*").order("created_at",{ascending:false}),
      supabase.from("collages").select("*").order("created_at"),
    ]).then(([ev,bg,fr,se,co])=>{
      if(ev.data)setEvents(ev.data);if(bg.data)setBackgrounds(bg.data);
      if(fr.data)setFrames(fr.data);if(se.data)setSessions(se.data);
      if(co.data)setCollages(co.data);setDataLoading(false);
    });
  },[authUser]);

  const handleLogout=async()=>{
    await supabase.auth.signOut();
    setEvents([]);setBackgrounds([]);setFrames([]);setSessions([]);setCollages([]);setView("dashboard");
  };

  const NAV=[
    {id:"dashboard",icon:"⬛",label:"Dashboard"},
    {id:"stats",icon:"📊",label:"Estadísticas"},
    {id:"events",icon:"🎪",label:"Eventos"},
    {id:"codes",icon:"🎫",label:"Códigos"},
    {section:"Recursos"},
    {id:"backgrounds",icon:"🖼️",label:"Fondos"},
    {id:"frames",icon:"🎨",label:"Marcos"},
    {id:"collages",icon:"📐",label:"Collages"},
    {section:"Sistema"},
    {id:"printer",icon:"🖨️",label:"Impresora"},
  ];

  if(authLoading)return<><style>{css}</style><Loader/></>;
  if(!authUser)return<><style>{css}</style><Login onAuth={()=>supabase.auth.getSession().then(({data:{session}})=>setAuthUser(session?.user??null))}/></>;
  if(kiosk)return<><style>{css}</style><KioskMode sessions={sessions} setSessions={setSessions} backgrounds={backgrounds} frames={frames} collages={collages} onExit={()=>setKiosk(false)}/></>;

  return(
    <><style>{css}</style>
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-logo"><div className="logo-title">AnimeBooth</div><div className="logo-sub">Admin Panel</div></div>
        <div className="nav-section">
          {NAV.map((item,i)=>item.section?<div key={i} className="nav-label">{item.section}</div>
            :<div key={item.id} className={`nav-item ${view===item.id?"active":""}`} onClick={()=>setView(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</div>
          )}
        </div>
        <div className="sidebar-footer">
          <button className="kiosk-btn" onClick={()=>setKiosk(true)}>▶ MODO KIOSCO</button>
          <button className="logout-btn" onClick={handleLogout}>↩ Cerrar Sesión</button>
        </div>
      </div>
      <div className="main">
        {dataLoading?<Loader/>:<>
          {view==="dashboard"   &&<Dashboard events={events} sessions={sessions} backgrounds={backgrounds} frames={frames}/>}
          {view==="stats"       &&<Statistics sessions={sessions} events={events} backgrounds={backgrounds}/>}
          {view==="events"      &&<Events events={events} setEvents={setEvents}/>}
          {view==="codes"       &&<Codes sessions={sessions} setSessions={setSessions} events={events} collages={collages}/>}
          {view==="backgrounds" &&<Backgrounds backgrounds={backgrounds} setBackgrounds={setBackgrounds}/>}
          {view==="frames"      &&<Frames frames={frames} setFrames={setFrames}/>}
          {view==="collages"    &&<Collages collages={collages} setCollages={setCollages}/>}
          {view==="printer"     &&<PrinterSettings/>}
        </>}
      </div>
    </div></>
  );
}
