import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// — AUDIO ENGINE ————————————————————————————————————————————————————————————
const audioCtx = { current: null };
const getCtx = () => {
  if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx.current;
};
const beep = (freq = 520, dur = 0.12, vol = 0.35, type = "sine") => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
};
const shootBeep = () => {
  beep(880, 0.05, 0.4); setTimeout(() => beep(1100, 0.08, 0.3), 60); setTimeout(() => beep(1400, 0.12, 0.2), 140);
};
const printBeep = () => {
  [0,80,160].forEach(d => setTimeout(() => beep(660, 0.07, 0.25), d));
  setTimeout(() => beep(880, 0.2, 0.3), 300);
};

// — DATA ——————————————————————————————————————————————————————————————————
const initialEvents = [
  { id: 1, name: "AnimeExpo 2026", date: "2026-06-15", theme: "aot", active: true, codes: 120, used: 47 },
  { id: 2, name: "DragonCon 2026", date: "2026-08-22", theme: "dbz", active: false, codes: 80, used: 12 },
  { id: 3, name: "NarutoFest 2026", date: "2026-09-10", theme: "naruto", active: true, codes: 60, used: 8 },
];
const initialBackgrounds = [
  { id:1, series:"aot", name:"Walls of Paradis",   emoji:"🏰", color:"#1a0a00", accent:"#8b3a0f" },
  { id:2, series:"aot", name:"Survey Corps",        emoji:"⚔️", color:"#0f1a00", accent:"#4a7c0f" },
  { id:3, series:"aot", name:"Titan Forest",        emoji:"🌲", color:"#001a0a", accent:"#0f6b3a" },
  { id:4, series:"dbz", name:"Namek Planet",        emoji:"🌠", color:"#001020", accent:"#0066cc" },
  { id:5, series:"dbz", name:"Time Chamber",        emoji:"⚡", color:"#100008", accent:"#cc3399" },
  { id:6, series:"dbz", name:"Super Saiyan Aura",   emoji:"🔥", color:"#1a1500", accent:"#e6c200" },
  { id:7, series:"naruto", name:"Konoha Village",   emoji:"🍃", color:"#0a1000", accent:"#33aa44" },
  { id:8, series:"naruto", name:"Rasengan Storm",   emoji:"💨", color:"#000a1a", accent:"#4499ff" },
];
const initialFrames = [
  { id:1, series:"aot",     name:"Survey Corps",   emoji:"🦅", color:"#2d5a1b" },
  { id:2, series:"aot",     name:"Titan Roar",     emoji:"👹", color:"#3d1a00" },
  { id:3, series:"dbz",     name:"Dragon Balls",   emoji:"🟡", color:"#cc6600" },
  { id:4, series:"dbz",     name:"Kamehameha",     emoji:"💙", color:"#003366" },
  { id:5, series:"naruto",  name:"Leaf Village",   emoji:"🍀", color:"#1a3300" },
  { id:6, series:"general", name:"Sakura Petals",  emoji:"🌸", color:"#4a0020" },
];

const genHistory = () => {
  const names = ["Carlos P.","Ana M.","Luis R.","Sofía G.","Diego T.","Valentina M.","Andrés C.","Isabella F."];
  const bgs = initialBackgrounds; const frames = initialFrames;
  return Array.from({length:67}, (_,i) => ({
    id: i+10,
    code: String(1000 + Math.floor(Math.random()*8999)),
    eventId: [1,1,1,2,3][Math.floor(Math.random()*5)],
    layout: [1,2,4][Math.floor(Math.random()*3)],
    usesLeft: 0, used: true,
    customerName: names[Math.floor(Math.random()*names.length)],
    createdAt: "2026-05-21",
    usedAt: `2026-05-21T${String(Math.floor(10+Math.random()*10)).padStart(2,"0")}:${String(Math.floor(Math.random()*60)).padStart(2,"0")}:00`,
    bgId: bgs[Math.floor(Math.random()*bgs.length)].id,
    frameId: frames[Math.floor(Math.random()*frames.length)].id,
  }));
};
const initialCodes = [
  { id:1, code:"7842", eventId:1, layout:4, usesLeft:1, used:false, customerName:"Carlos P.", createdAt:"2026-05-20", usedAt:null, bgId:null, frameId:null },
  { id:2, code:"3391", eventId:1, layout:1, usesLeft:1, used:true,  customerName:"Ana M.",    createdAt:"2026-05-20", usedAt:"2026-05-20T14:30:00", bgId:2, frameId:1 },
  { id:3, code:"5567", eventId:1, layout:2, usesLeft:1, used:false, customerName:"Luis R.",   createdAt:"2026-05-21", usedAt:null, bgId:null, frameId:null },
  ...genHistory(),
];

const SERIES_LABELS = { aot:"Attack on Titan", dbz:"Dragon Ball Z", naruto:"Naruto", general:"General" };
const LAYOUTS = [
  { id:1, label:"1 Foto",   desc:"Impresión individual",  cols:1, rows:1 },
  { id:2, label:"2 Fotos",  desc:"Tira doble vertical",   cols:1, rows:2 },
  { id:4, label:"4 Fotos",  desc:"Collage 2×2",           cols:2, rows:2 },
];
const CHART_COLORS = ["#e8a020","#44aaff","#ff4444","#44cc88","#cc44ff"];
const genCode = () => String(Math.floor(1000 + Math.random()*9000));
const DOWNLOAD_BASE = "https://animebooth.app/download";

// — STYLES ——————————————————————————————————————————————————————————————————
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#07080f;--surface:#0e1020;--surface2:#161830;--border:#252850;
    --accent:#e8a020;--accent2:#ff4444;--accent3:#44aaff;
    --text:#e8e8f0;--muted:#6b6d90;
    --aot:#c4512a;--dbz:#e8c020;--naruto:#e87820;
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
  .sidebar-footer{padding:16px;border-top:1px solid var(--border)}
  .kiosk-btn{width:100%;padding:10px;background:linear-gradient(135deg,var(--accent),#c47010);border:none;border-radius:6px;color:#000;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;cursor:pointer;transition:all .2s}
  .kiosk-btn:hover{opacity:.85;transform:translateY(-1px)}

  .main{flex:1;overflow-y:auto;padding:28px 32px;background:var(--bg)}
  .page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
  .page-title{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:3px;color:var(--text)}
  .page-subtitle{font-size:13px;color:var(--muted);margin-top:2px}
  .btn{padding:9px 18px;border:none;border-radius:5px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;letter-spacing:.5px;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
  .btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#f0b030}
  .btn-danger{background:var(--accent2);color:#fff}.btn-danger:hover{background:#ff2222}
  .btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
  .btn-green{background:#22aa44;color:#fff}.btn-green:hover{background:#1a8836}
  .btn-sm{padding:5px 12px;font-size:12px}

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
  .media-preview{height:110px;display:flex;align-items:center;justify-content:center;font-size:50px;position:relative}
  .media-info{padding:10px 12px;border-top:1px solid var(--border)}
  .media-name{font-weight:700;font-size:13px}
  .media-meta{font-size:11px;color:var(--muted);margin-top:2px}
  .media-actions{display:flex;gap:6px;margin-top:8px}

  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
  .modal{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;width:460px;max-width:92vw;max-height:90vh;overflow-y:auto}
  .modal-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:20px;color:var(--accent)}
  .field{margin-bottom:14px}
  .field label{display:flex;justify-content:space-between;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:5px;font-weight:600}
  .field input,.field select,.field textarea{width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:500;outline:none;transition:border .15s}
  .field input:focus,.field select:focus{border-color:var(--accent)}
  .modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
  select option{background:#0e1020}

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

  .kiosk{position:fixed;inset:0;background:#000;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Rajdhani',sans-serif;overflow:hidden}
  .kiosk-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 20% 50%,#0d1535 0%,#07080f 60%)}
  .k-particles{position:absolute;inset:0;pointer-events:none;overflow:hidden}
  .k-particle{position:absolute;border-radius:50%;animation:rise linear infinite}
  @keyframes rise{0%{transform:translateY(110vh);opacity:0}10%{opacity:.8}90%{opacity:.8}100%{transform:translateY(-10vh);opacity:0}}
  .kiosk-content{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;width:100%;max-width:860px;padding:24px}
  .kiosk-logo{font-family:'Bebas Neue',sans-serif;font-size:50px;letter-spacing:8px;background:linear-gradient(135deg,#e8a020,#f0d060);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:none;line-height:1}
  .kiosk-tagline{font-size:13px;letter-spacing:5px;color:var(--muted);text-transform:uppercase;margin-bottom:36px}

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

  .steps-row{display:flex;gap:0;margin-bottom:28px;background:rgba(14,16,32,.8);border:1px solid var(--border);border-radius:50px;padding:4px;overflow:hidden}
  .step-pill{padding:6px 16px;border-radius:50px;font-size:12px;letter-spacing:1px;color:var(--muted);transition:all .2s;white-space:nowrap}
  .step-pill.done{color:rgba(232,160,32,.6)}
  .step-pill.active{background:var(--accent);color:#000;font-weight:700}

  .step-title{font-family:'Bebas Neue',sans-serif;font-size:34px;letter-spacing:4px;color:var(--text);text-align:center;margin-bottom:4px}
  .step-sub{font-size:13px;color:var(--muted);letter-spacing:1px;text-align:center;margin-bottom:22px}
  .opt-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:100%}
  .opt-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%}
  .opt-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;width:100%}
  .opt-card{background:rgba(14,16,32,.9);border:2px solid var(--border);border-radius:12px;padding:14px;cursor:pointer;transition:all .2s;text-align:center;backdrop-filter:blur(8px)}
  .opt-card:hover{border-color:rgba(232,160,32,.5)}
  .opt-card.sel{border-color:var(--accent);background:rgba(232,160,32,.08);box-shadow:0 0 18px rgba(232,160,32,.15)}
  .opt-emoji{font-size:38px;margin-bottom:6px}
  .opt-label{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px}
  .opt-meta{font-size:11px;color:var(--muted);margin-top:2px}

  .lp-wrap{display:flex;justify-content:center;margin-bottom:8px}
  .lp-grid{display:grid;gap:3px}
  .lp-cell{background:var(--accent);border-radius:2px;opacity:.7}

  .cam-wrap{width:100%;max-width:560px;aspect-ratio:4/3;background:var(--surface2);border:2px solid var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;margin:0 auto 16px}
  .cam-placeholder{display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--muted);text-align:center}
  .cam-corners{position:absolute;inset:0;pointer-events:none}
  .crn{position:absolute;width:22px;height:22px;border-color:var(--accent);border-style:solid;opacity:.8}
  .crn-tl{top:10px;left:10px;border-width:3px 0 0 3px}
  .crn-tr{top:10px;right:10px;border-width:3px 3px 0 0}
  .crn-bl{bottom:10px;left:10px;border-width:0 0 3px 3px}
  .crn-br{bottom:10px;right:10px;border-width:0 3px 3px 0}
  .scanline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);animation:scan 2.5s ease-in-out infinite}
  @keyframes scan{0%{top:10%;opacity:0}10%{opacity:.6}90%{opacity:.6}100%{top:90%;opacity:0}}

  .cdown-num{font-family:'Bebas Neue',sans-serif;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:140px;animation:cdpop .85s cubic-bezier(.3,1.8,.5,1) forwards}
  .cdown-num.c3{color:#ff4444;text-shadow:0 0 40px #ff4444}
  .cdown-num.c2{color:#e8a020;text-shadow:0 0 40px #e8a020}
  .cdown-num.c1{color:#44ff88;text-shadow:0 0 40px #44ff88}
  @keyframes cdpop{0%{transform:scale(2.5);opacity:0}20%{transform:scale(1);opacity:1}80%{transform:scale(1);opacity:1}100%{transform:scale(.4);opacity:0}}

  .flash-overlay{position:absolute;inset:0;background:#fff;animation:flash .25s ease-out forwards;pointer-events:none;z-index:5}
  @keyframes flash{0%{opacity:1}100%{opacity:0}}

  .thumb-strip{display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap}
  .thumb{width:72px;height:66px;background:var(--surface2);border:2px solid var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:26px;position:relative;transition:all .25s;overflow:hidden}
  .thumb.done{border-color:var(--accent);box-shadow:0 0 12px rgba(232,160,32,.3)}
  .thumb .chk{position:absolute;top:-1px;right:-1px;width:18px;height:18px;background:var(--accent);border-radius:0 6px 0 6px;font-size:10px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:bold}
  .shoot-btn{padding:15px 44px;background:linear-gradient(135deg,var(--accent),#c47010);border:none;border-radius:50px;font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;color:#000;cursor:pointer;transition:all .2s;box-shadow:0 4px 20px rgba(232,160,32,.25)}
  .shoot-btn:hover{transform:scale(1.04);box-shadow:0 8px 32px rgba(232,160,32,.45)}
  .shoot-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}

  .print-preview-wrap{display:inline-flex;flex-direction:column;align-items:center}
  .print-paper{background:#fff;padding:8px;border-radius:4px;box-shadow:0 10px 40px rgba(0,0,0,.6);display:inline-block}
  .print-photo{background:linear-gradient(135deg,#d0d4e0,#e8eaf0);display:flex;align-items:center;justify-content:center;font-size:30px}

  .qr-card{background:rgba(14,16,32,.95);border:1px solid var(--border);border-radius:16px;padding:28px;text-align:center;backdrop-filter:blur(20px)}
  .qr-wrap{background:#fff;border-radius:8px;padding:8px;display:inline-block;margin:16px 0}
  .wa-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:#25D366;border:none;border-radius:50px;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:#fff;cursor:pointer;transition:all .2s;box-shadow:0 4px 16px rgba(37,211,102,.3)}
  .wa-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,211,102,.5)}

  .result-gif{width:240px;height:180px;background:linear-gradient(135deg,var(--bg),var(--surface2));border-radius:8px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:60px}
  .gif-frame{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:60px;animation:gifSlide 2.4s ease-in-out infinite}
  .gif-frame:nth-child(2){animation-delay:.8s}
  .gif-frame:nth-child(3){animation-delay:1.6s}
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
  .empty-icon{font-size:48px;margin-bottom:10px;opacity:.25}
  .flex{display:flex}.gap-2{gap:8px}.gap-3{gap:12px}.items-center{align-items:center}.mt-2{margin-top:8px}.mt-3{margin-top:12px}.mt-4{margin-top:16px}.text-muted{color:var(--muted)}.text-sm{font-size:12px}
  .tip-box{padding:12px 16px;background:rgba(232,160,32,.06);border:1px solid rgba(232,160,32,.2);border-radius:8px;font-size:13px;color:rgba(232,160,32,.9)}
`;

// — QR SVG —————————————————————————————————————————————————————————————————
function QRCode({ value = "https://animebooth.app", size = 130 }) {
  const N = 21, cs = size / N;
  const s = value.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffffff, 0);
  const bit = (r, c) => {
    if (r < 7 && c < 7) { const i = Math.max(r, c), j = Math.min(Math.abs(r-3), Math.abs(c-3)); return (i===0||i===6||i===2)&&!(j===1); }
    if (r < 7 && c > N-8) { const cc = c-(N-7); return (cc===0||cc===6||r===0||r===6||(r>=2&&r<=4&&cc>=2&&cc<=4)); }
    if (r > N-8 && c < 7) { const rr = r-(N-7); return (rr===0||rr===6||c===0||c===6||(rr>=2&&rr<=4&&c>=2&&c<=4)); }
    if (r===6 && c>7 && c<N-8) return c%2===0;
    if (c===6 && r>7 && r<N-8) return r%2===0;
    const h = ((s ^ (r*N+c)*2654435761) >>> 0) % 7;
    return h < 3;
  };
  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (bit(r, c))
    cells.push(<rect key={`${r}-${c}`} x={c*cs} y={r*cs} width={cs} height={cs} fill="#000"/>);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="white"/>
      {cells}
    </svg>
  );
}

// — LAYOUT PREVIEW —————————————————————————————————————————————————————————
function LayoutPreview({ n, size = 48 }) {
  const g = n === 4 ? { cols:2, rows:2, w:21, h:21 } : n === 2 ? { cols:1, rows:2, w:44, h:20 } : { cols:1, rows:1, w:44, h:44 };
  const cells = Array.from({ length: n });
  return (
    <div className="lp-wrap">
      <div className="lp-grid" style={{ gridTemplateColumns: `repeat(${g.cols},1fr)`, gap: 3 }}>
        {cells.map((_, i) => <div key={i} className="lp-cell" style={{ width: g.w, height: g.h }} />)}
      </div>
    </div>
  );
}

// — SERIES BADGE ——————————————————————————————————————————————————————————
function SBadge({ s }) {
  const m = { aot:"badge-aot", dbz:"badge-dbz", naruto:"badge-naruto", general:"badge-inactive" };
  return <span className={`badge ${m[s]||"badge-inactive"}`}>{SERIES_LABELS[s]||s}</span>;
}

// — PARTICLES —————————————————————————————————————————————————————————————
function Particles() {
  const pts = useRef(Array.from({length:25},()=>({
    l: Math.random()*100, dur: 6+Math.random()*12, del: Math.random()*12,
    s: 1.5+Math.random()*3, c: Math.random()<.6?"#e8a020":Math.random()<.5?"#44aaff":"#ff4488",
  }))).current;
  return (
    <div className="k-particles">
      {pts.map((p,i) => (
        <div key={i} className="k-particle" style={{
          left:`${p.l}%`, width:p.s, height:p.s, background:p.c,
          animationDuration:`${p.dur}s`, animationDelay:`${p.del}s`
        }}/>
      ))}
    </div>
  );
}

// — STATISTICS ————————————————————————————————————————————————————————————
function Statistics({ codes, events }) {
  const [selEvent, setSelEvent] = useState("all");
  const filtered = selEvent === "all" ? codes.filter(c => c.used) : codes.filter(c => c.used && c.eventId === Number(selEvent));

  const hourly = Array.from({length:14}, (_,i) => {
    const h = 9 + i;
    const label = `${h}:00`;
    const count = filtered.filter(c => c.usedAt && parseInt(c.usedAt.split("T")[1]) === h).length;
    const demo = [3,5,8,12,15,9,7,14,18,11,6,4,2,1][i] || 0;
    return { hora: label, sesiones: count || demo };
  });

  const layoutData = LAYOUTS.map(l => ({
    name: l.label, value: filtered.filter(c => c.layout === l.id).length || Math.floor(Math.random()*30+5),
  }));

  const byEvent = events.map(e => ({
    name: e.name.split(" ")[0], sesiones: filtered.filter(c => c.eventId === e.id).length || e.used,
  }));

  const bgCounts = {};
  filtered.forEach(c => { if (c.bgId) bgCounts[c.bgId] = (bgCounts[c.bgId]||0)+1; });
  const topBgs = initialBackgrounds.map(b => ({ name: b.name.split(" ").slice(0,2).join(" "), emoji: b.emoji, count: bgCounts[b.id] || Math.floor(Math.random()*20+2) }))
    .sort((a,b)=>b.count-a.count).slice(0,5);

  const total = filtered.length;
  const peak = Math.max(...hourly.map(h=>h.sesiones));
  const topLayout = layoutData.sort((a,b)=>b.value-a.value)[0];

  const CT = { fill:"var(--text)", fontSize:11 };

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
        {[
          { val:total, label:"Sesiones Totales", icon:"📸", c1:"#e8a020", c2:"#c47010" },
          { val:peak,  label:"Pico por Hora",    icon:"⚡", c1:"#ff4444", c2:"#cc2222" },
          { val:topLayout?.name||"—", label:"Collage Favorito", icon:"🖼", c1:"#44aaff", c2:"#2266cc" },
          { val:topBgs[0]?.emoji||"🎭", label:`Fondo #1: ${topBgs[0]?.name||""}`, icon:"🖼️", c1:"#44cc88", c2:"#228844" },
        ].map((s,i)=>(
          <div key={i} className="stat-card" style={{"--c1":s.c1,"--c2":s.c2}}>
            <div className="stat-val" style={{fontSize:typeof s.val==="string"&&s.val.length>4?"24px":undefined}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-icon">{s.icon}</div>
          </div>
        ))}
      </div>
      <div className="chart-card">
        <div className="chart-title">Sesiones por Hora del Día</div>
        <div className="chart-sub">Distribución temporal de uso de la fotocabina</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={hourly} margin={{top:4,right:16,bottom:0,left:-16}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252850"/>
            <XAxis dataKey="hora" tick={CT} stroke="#252850"/>
            <YAxis tick={CT} stroke="#252850"/>
            <Tooltip contentStyle={{background:"#0e1020",border:"1px solid #252850",borderRadius:6,fontSize:12}}/>
            <Line type="monotone" dataKey="sesiones" stroke="#e8a020" strokeWidth={2.5} dot={{fill:"#e8a020",r:3}} activeDot={{r:5}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="charts-2col">
        <div className="chart-card" style={{marginBottom:0}}>
          <div className="chart-title">Distribución de Collages</div>
          <div className="chart-sub">Tipo de foto más comprado</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={layoutData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {layoutData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i]}/>)}
              </Pie>
              <Tooltip contentStyle={{background:"#0e1020",border:"1px solid #252850",borderRadius:6,fontSize:12}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card" style={{marginBottom:0}}>
          <div className="chart-title">Sesiones por Evento</div>
          <div className="chart-sub">Comparativa entre eventos activos</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byEvent} margin={{top:4,right:8,bottom:0,left:-20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252850"/>
              <XAxis dataKey="name" tick={CT} stroke="#252850"/>
              <YAxis tick={CT} stroke="#252850"/>
              <Tooltip contentStyle={{background:"#0e1020",border:"1px solid #252850",borderRadius:6,fontSize:12}}/>
              <Bar dataKey="sesiones" radius={[4,4,0,0]}>
                {byEvent.map((_,i)=><Cell key={i} fill={CHART_COLORS[i]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="table-card">
        <div className="table-head"><span className="table-title">🏆 Fondos Más Populares</span></div>
        <table>
          <thead><tr><th>#</th><th>Fondo</th><th>Serie</th><th>Veces Usado</th><th>%</th></tr></thead>
          <tbody>
            {topBgs.map((b,i)=>{
              const bg = initialBackgrounds.find(x=>x.name.startsWith(b.name.split(" ")[0]));
              const pct = total > 0 ? Math.round(b.count/total*100) : 0;
              return (
                <tr key={i}>
                  <td style={{color:"var(--accent)",fontFamily:"'Bebas Neue'",fontSize:20}}>{i+1}</td>
                  <td>{b.emoji} {b.name}</td>
                  <td>{bg && <SBadge s={bg.series}/>}</td>
                  <td style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--accent)"}}>{b.count}</td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,height:4,background:"var(--surface2)",borderRadius:2}}>
                        <div style={{width:`${Math.min(pct,100)}%`,height:"100%",background:"var(--accent)",borderRadius:2}}/>
                      </div>
                      <span style={{fontSize:12,color:"var(--muted)",width:32}}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// — DASHBOARD ————————————————————————————————————————————————————————————
function Dashboard({ events, codes, backgrounds, frames }) {
  const used = codes.filter(c=>c.used).length;
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Dashboard</div><div className="page-subtitle">Bienvenido a AnimeBooth · Panel de control</div></div>
        <span className="badge badge-active">✓ Liene 1100 Conectada</span>
      </div>
      <div className="stats-grid">
        {[
          { v:events.filter(e=>e.active).length, l:"Eventos Activos",    i:"🎪", c1:"#e8a020",c2:"#c47010" },
          { v:codes.length,                       l:"Códigos Totales",    i:"🎫", c1:"#44aaff",c2:"#2266cc" },
          { v:codes.filter(c=>!c.used).length,    l:"Sesiones Pendientes",i:"⏳", c1:"#44aa44",c2:"#22aa44" },
          { v:used,                               l:"Sesiones Impresas",  i:"✅", c1:"#aa44ff",c2:"#7722cc" },
        ].map((s,i)=>(
          <div key={i} className="stat-card" style={{"--c1":s.c1,"--c2":s.c2}}>
            <div className="stat-val">{s.v}</div><div className="stat-label">{s.l}</div><div className="stat-icon">{s.i}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:20}}>
        <div style={{flex:1}}>
          <div className="table-card">
            <div className="table-head"><span className="table-title">Últimas Sesiones</span></div>
            <table>
              <thead><tr><th>Código</th><th>Cliente</th><th>Layout</th><th>Estado</th></tr></thead>
              <tbody>
                {codes.filter(c=>c.used).slice(-5).reverse().map(c=>(
                  <tr key={c.id}>
                    <td><span style={{fontFamily:"'Bebas Neue'",fontSize:20,letterSpacing:2,color:"var(--accent)"}}>{c.code}</span></td>
                    <td>{c.customerName}</td>
                    <td><LayoutPreview n={c.layout}/></td>
                    <td><span className="badge badge-used">Usado</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{width:240}}>
          <div className="settings-card" style={{marginBottom:16}}>
            <div className="settings-title">Recursos</div>
            {[["🖼️","Fondos",backgrounds.length],["🎨","Marcos",frames.length],["📺","Series",new Set(backgrounds.map(b=>b.series)).size]].map(([ic,l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span>{ic} {l}</span><span style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--accent)"}}>{v}</span>
              </div>
            ))}
          </div>
          <div className="settings-card">
            <div className="settings-title">Impresora</div>
            <div className="printer-status"><div className="status-dot"/><div><div style={{fontWeight:700,fontSize:13}}>Liene 1100</div><div style={{fontSize:11,color:"var(--muted)"}}>Online · 300 DPI · 4×6</div></div></div>
            <div style={{fontSize:12,color:"var(--muted)"}}>Cola: 0 trabajos<br/>Papel: 100 hojas</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// — EVENTS ——————————————————————————————————————————————————————————————
function Events({ events, setEvents }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name:"", date:"", theme:"aot" });
  const save = () => { setEvents(ev=>[...ev,{id:Date.now(),...form,active:true,codes:0,used:0}]); setModal(false); setForm({name:"",date:"",theme:"aot"}); };
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Eventos</div><div className="page-subtitle">Gestiona eventos de la fotocabina</div></div><button className="btn btn-primary" onClick={()=>setModal(true)}>+ Nuevo Evento</button></div>
      <div className="table-card"><table>
        <thead><tr><th>Nombre</th><th>Fecha</th><th>Tema</th><th>Códigos</th><th>Usados</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>{events.map(e=>(
          <tr key={e.id}>
            <td style={{fontWeight:700}}>{e.name}</td><td>{e.date}</td><td><SBadge s={e.theme}/></td>
            <td>{e.codes}</td><td>{e.used}</td>
            <td><span className={`badge ${e.active?"badge-active":"badge-inactive"}`}>{e.active?"Activo":"Inactivo"}</span></td>
            <td><div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={()=>setEvents(ev=>ev.map(x=>x.id===e.id?{...x,active:!x.active}:x))}>{e.active?"Pausar":"Activar"}</button>
              <button className="btn btn-danger btn-sm" onClick={()=>setEvents(ev=>ev.filter(x=>x.id!==e.id))}>✕</button>
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>
      {modal&&<div className="modal-overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Nuevo Evento</div>
        <div className="field"><label>Nombre</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="AnimeExpo 2026"/></div>
        <div className="field"><label>Fecha</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
        <div className="field"><label>Tema</label><select value={form.theme} onChange={e=>setForm({...form,theme:e.target.value})}>{Object.entries(SERIES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={!form.name}>Crear</button></div>
      </div></div>}
    </div>
  );
}

// — BACKGROUNDS ————————————————————————————————————————————————————————
function Backgrounds({ backgrounds, setBackgrounds }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name:"", series:"aot", emoji:"🎭" });
  const save = () => { setBackgrounds(b=>[...b,{id:Date.now(),...form,color:"#0a0a0f",accent:"#e8a020"}]); setModal(false); setForm({name:"",series:"aot",emoji:"🎭"}); };
  const [filter, setFilter] = useState("all");
  const list = filter==="all"?backgrounds:backgrounds.filter(b=>b.series===filter);
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Fondos</div><div className="page-subtitle">Fondos temáticos de anime</div></div>
        <div className="flex gap-2 items-center">
          <select className="search-input" value={filter} onChange={e=>setFilter(e.target.value)} style={{width:"auto"}}>
            <option value="all">Todas las series</option>{Object.entries(SERIES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn btn-primary" onClick={()=>setModal(true)}>+ Agregar</button>
        </div>
      </div>
      <div className="grid-2">
        {list.map(bg=>(
          <div key={bg.id} className="media-card">
            <div className="media-preview" style={{background:`linear-gradient(135deg,${bg.color},${bg.accent}33)`}}><span>{bg.emoji}</span><div style={{position:"absolute",top:8,right:8}}><SBadge s={bg.series}/></div></div>
            <div className="media-info"><div className="media-name">{bg.name}</div><div className="media-meta">{SERIES_LABELS[bg.series]}</div>
              <div className="media-actions"><button className="btn btn-ghost btn-sm" style={{flex:1}}>✏️ Editar</button><button className="btn btn-danger btn-sm" onClick={()=>setBackgrounds(b=>b.filter(x=>x.id!==bg.id))}>✕</button></div>
            </div>
          </div>
        ))}
        <div className="media-card" style={{border:"2px dashed var(--border)",cursor:"pointer",minHeight:160,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setModal(true)}>
          <div style={{textAlign:"center",color:"var(--muted)"}}><div style={{fontSize:32,marginBottom:6}}>+</div><div style={{fontSize:12}}>Subir Fondo</div></div>
        </div>
      </div>
      {modal&&<div className="modal-overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Agregar Fondo</div>
        <div className="field"><label>Nombre</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Titan Forest Night"/></div>
        <div className="field"><label>Serie</label><select value={form.series} onChange={e=>setForm({...form,series:e.target.value})}>{Object.entries(SERIES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label>Emoji</label><input value={form.emoji} onChange={e=>setForm({...form,emoji:e.target.value})}/></div>
        <div className="field"><label>Imagen</label><div style={{padding:18,background:"var(--bg)",border:"2px dashed var(--border)",borderRadius:6,textAlign:"center",color:"var(--muted)",fontSize:13,cursor:"pointer"}}>📁 Arrastra o click para subir PNG/JPG</div></div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={!form.name}>Guardar</button></div>
      </div></div>}
    </div>
  );
}

// — FRAMES ——————————————————————————————————————————————————————————————
function Frames({ frames, setFrames }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name:"", series:"aot", emoji:"🖼️" });
  const save = () => { setFrames(f=>[...f,{id:Date.now(),...form,color:"#1a1a2e"}]); setModal(false); setForm({name:"",series:"aot",emoji:"🖼️"}); };
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Marcos</div><div className="page-subtitle">Marcos PNG con transparencia para impresión</div></div><button className="btn btn-primary" onClick={()=>setModal(true)}>+ Agregar</button></div>
      <div className="grid-2">
        {frames.map(fr=>(
          <div key={fr.id} className="media-card">
            <div className="media-preview" style={{background:fr.color}}><div style={{border:"4px solid var(--accent)",width:88,height:88,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>{fr.emoji}</div></div>
            <div className="media-info"><div className="media-name">{fr.name}</div><div className="media-meta"><SBadge s={fr.series}/></div>
              <div className="media-actions"><button className="btn btn-ghost btn-sm" style={{flex:1}}>✏️ Editar</button><button className="btn btn-danger btn-sm" onClick={()=>setFrames(f=>f.filter(x=>x.id!==fr.id))}>✕</button></div>
            </div>
          </div>
        ))}
        <div className="media-card" style={{border:"2px dashed var(--border)",cursor:"pointer",minHeight:160,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setModal(true)}>
          <div style={{textAlign:"center",color:"var(--muted)"}}><div style={{fontSize:32,marginBottom:6}}>+</div><div style={{fontSize:12}}>Subir Marco</div></div>
        </div>
      </div>
      {modal&&<div className="modal-overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Agregar Marco</div>
        <div className="field"><label>Nombre</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div className="field"><label>Serie</label><select value={form.series} onChange={e=>setForm({...form,series:e.target.value})}>{Object.entries(SERIES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label>Emoji</label><input value={form.emoji} onChange={e=>setForm({...form,emoji:e.target.value})}/></div>
        <div className="field"><label>Imagen PNG (con transparencia)</label><div style={{padding:18,background:"var(--bg)",border:"2px dashed var(--border)",borderRadius:6,textAlign:"center",color:"var(--muted)",fontSize:13,cursor:"pointer"}}>📁 Arrastra o click para subir</div></div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={!form.name}>Guardar</button></div>
      </div></div>}
    </div>
  );
}

// — CODES ———————————————————————————————————————————————————————————————
function Codes({ codes, setCodes, events }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customerName:"", eventId:events[0]?.id||1, layout:4, qty:1 });
  const [search, setSearch] = useState("");
  const save = () => {
    const nc = Array.from({length:form.qty},(_,i)=>({
      id:Date.now()+i, code:genCode(), eventId:Number(form.eventId), layout:Number(form.layout),
      usesLeft:1, used:false, customerName:form.customerName, createdAt:new Date().toISOString().split("T")[0], usedAt:null, bgId:null, frameId:null
    }));
    setCodes(c=>[...c,...nc]); setModal(false);
  };
  const filtered = codes.filter(c=>c.code.includes(search)||c.customerName?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Códigos & Sesiones</div><div className="page-subtitle">Genera y gestiona los códigos de acceso de 4 dígitos</div></div>
        <div className="flex gap-2"><input className="search-input" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/><button className="btn btn-primary" onClick={()=>setModal(true)}>+ Generar Código</button></div>
      </div>
      <div className="table-card"><table>
        <thead><tr><th>Código</th><th>Cliente</th><th>Evento</th><th>Layout</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
        <tbody>{filtered.slice(0,30).map(c=>{
          const ev=events.find(e=>e.id===c.eventId);
          return (<tr key={c.id}>
            <td><span style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:3,color:"var(--accent)"}}>{c.code}</span></td>
            <td>{c.customerName||"—"}</td><td style={{fontSize:12}}>{ev?.name||"—"}</td>
            <td><LayoutPreview n={c.layout}/></td>
            <td style={{color:"var(--muted)",fontSize:12}}>{c.createdAt}</td>
            <td><span className={`badge ${c.used?"badge-used":"badge-ready"}`}>{c.used?"Usado":"Listo"}</span></td>
            <td><div className="flex gap-2">
              {c.used&&<button className="btn btn-ghost btn-sm" onClick={()=>setCodes(x=>x.map(y=>y.id===c.id?{...y,used:false,usesLeft:1,usedAt:null}:y))}>↺</button>}
              <button className="btn btn-danger btn-sm" onClick={()=>setCodes(x=>x.filter(y=>y.id!==c.id))}>✕</button>
            </div></td>
          </tr>);
        })}</tbody>
      </table></div>
      {modal&&<div className="modal-overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Generar Código</div>
        <div className="field"><label>Cliente</label><input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})} placeholder="Nombre del cliente"/></div>
        <div className="field"><label>Evento</label><select value={form.eventId} onChange={e=>setForm({...form,eventId:e.target.value})}>{events.map(ev=><option key={ev.id} value={ev.id}>{ev.name}</option>)}</select></div>
        <div className="field"><label>Tipo de Collage</label>
          <select value={form.layout} onChange={e=>setForm({...form,layout:Number(e.target.value)})}>
            {LAYOUTS.map(l=><option key={l.id} value={l.id}>{l.label} — {l.desc}</option>)}
          </select>
        </div>
        <div className="field"><label>Cantidad <span style={{color:"var(--accent)"}}>máx 50</span></label><input type="number" min={1} max={50} value={form.qty} onChange={e=>setForm({...form,qty:Number(e.target.value)})}/></div>
        <div className="tip-box">💡 {form.qty} código(s) · {LAYOUTS.find(l=>l.id===form.layout)?.label} · Se generan aleatoriamente</div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Generar</button></div>
      </div></div>}
    </div>
  );
}

// — PRINTER SETTINGS ————————————————————————————————————————————————————
function PrinterSettings() {
  const [s, setS] = useState({dpi:"300",paper:"4x6",quality:"high",cutMode:"auto",br:50,co:50,sa:60});
  const S=(k,v)=>setS(x=>({...x,[k]:v}));
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Impresora Liene 1100</div><div className="page-subtitle">Configuración y calibración</div></div></div>
      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-title">Conexión</div>
          <div className="printer-status"><div className="status-dot"/><div><div style={{fontWeight:700}}>Liene 1100</div><div style={{fontSize:11,color:"var(--muted)"}}>USB · Sin errores · Cola: 0</div></div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Protocolo","USB/WiFi"],["Resolución","300 DPI"],["Tipo","Sublimación"],["Papel","100 hojas"]].map(([k,v])=>(
              <div key={k}><div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase"}}>{k}</div><div style={{fontWeight:700,fontSize:13,marginTop:2}}>{v}</div></div>
            ))}
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-title">Configuración</div>
          <div className="field"><label>Papel</label><select value={s.paper} onChange={e=>S("paper",e.target.value)}><option value="4x6">4×6 in (10×15 cm)</option><option value="5x7">5×7 in (13×18 cm)</option></select></div>
          <div className="field"><label>Calidad</label><select value={s.quality} onChange={e=>S("quality",e.target.value)}><option value="high">Alta 300 DPI</option><option value="normal">Normal 200 DPI</option></select></div>
          <div className="field"><label>Corte</label><select value={s.cutMode} onChange={e=>S("cutMode",e.target.value)}><option value="auto">Automático</option><option value="manual">Manual</option></select></div>
        </div>
        <div className="settings-card">
          <div className="settings-title">Color</div>
          {[["br","Brillo",s.br],["co","Contraste",s.co],["sa","Saturación",s.sa]].map(([k,l,v])=>(
            <div key={k} className="field"><label><span>{l}</span><span style={{color:"var(--accent)"}}>{v}%</span></label><input type="range" min={0} max={100} value={v} onChange={e=>S(k,Number(e.target.value))} style={{width:"100%",accentColor:"var(--accent)"}}/></div>
          ))}
        </div>
        <div className="settings-card">
          <div className="settings-title">Mantenimiento</div>
          {[["🖨️ Prueba de Impresión","btn-ghost"],["🧹 Limpiar Cabezal","btn-ghost"],["📋 Historial","btn-ghost"],["⚙️ Restaurar Defaults","btn-danger"]].map(([l,c])=>(
            <button key={l} className={`btn ${c}`} style={{width:"100%",marginBottom:8}}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// — KIOSK MODE ——————————————————————————————————————————————————————————
function KioskMode({ codes, setCodes, backgrounds, frames, onExit }) {
  const [step, setStep] = useState("code");
  const [digits, setDigits] = useState(["","","",""]);
  const [codeErr, setCodeErr] = useState("");
  const [session, setSession] = useState(null);
  const [selBg, setSelBg] = useState(null);
  const [selFrame, setSelFrame] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [flash, setFlash] = useState(false);
  const [shootLock, setShootLock] = useState(false);
  const iRefs = [useRef(),useRef(),useRef(),useRef()];
  const timerRef = useRef(null);

  const downloadUrl = session ? `${DOWNLOAD_BASE}/${session.code}` : "";
  const waText = session ? encodeURIComponent(`🎌 ¡Mira mi sesión en AnimeBooth!\n📸 Fondo: ${selBg?.name} · Marco: ${selFrame?.name}\n⬇️ Descarga tu foto: ${downloadUrl}`) : "";

  const handleDigit = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const n=[...digits]; n[i]=v; setDigits(n);
    if (v && i<3) iRefs[i+1].current?.focus();
  };
  const handleKey = (i, e) => { if (e.key==="Backspace"&&!digits[i]&&i>0) iRefs[i-1].current?.focus(); };

  const verify = () => {
    const c = digits.join("");
    const found = codes.find(x=>x.code===c&&!x.used);
    if (!found) { setCodeErr("Código inválido o ya usado. Intenta de nuevo."); beep(200,0.3,0.4,"sawtooth"); return; }
    beep(660,0.1); setTimeout(()=>beep(880,0.1),120); setTimeout(()=>beep(1100,0.15),240);
    setSession(found); setCodeErr(""); setStep("background");
  };

  const startShoot = () => {
    if (shootLock) return;
    setShootLock(true);
    let n = 3;
    setCountdown(n);
    beep(440, 0.08, 0.4);
    timerRef.current = setInterval(() => {
      n--;
      if (n > 0) { setCountdown(n); beep(440, 0.08, 0.4); }
      else {
        clearInterval(timerRef.current);
        setCountdown(0);
        shootBeep();
        setFlash(true);
        setTimeout(()=>setFlash(false), 300);
        setTimeout(()=>{
          setCountdown(null);
          setPhotos(p=>{
            const next = [...p, selBg?.emoji||"📸"];
            if (next.length >= session.layout) { setTimeout(()=>setStep("preview"),400); }
            return next;
          });
          setShootLock(false);
        }, 350);
      }
    }, 1000);
  };

  useEffect(()=>()=>{ if(timerRef.current) clearInterval(timerRef.current); },[]);

  const doPrint = () => {
    printBeep();
    setCodes(c=>c.map(x=>x.id===session.id?{...x,used:true,usesLeft:0,usedAt:new Date().toISOString(),bgId:selBg?.id,frameId:selFrame?.id}:x));
    setStep("success");
  };

  const restart = () => { setStep("code"); setDigits(["","","",""]); setCodeErr(""); setSession(null); setSelBg(null); setSelFrame(null); setPhotos([]); setCountdown(null); setShootLock(false); };

  const STEPS = ["code","background","frame","shoot","preview","success"];
  const STEP_LABELS = ["Código","Fondo","Marco","Fotos","Preview","Listo"];
  const si = STEPS.indexOf(step);

  const PrintPreview = ({ mini=false }) => {
    const dim = mini
      ? { 1:{w:100,h:80}, 2:{w:60,h:52}, 4:{w:54,h:42} }
      : { 1:{w:220,h:165}, 2:{w:120,h:100}, 4:{w:106,h:80} };
    const d = dim[session?.layout]||dim[4];
    const grid = session?.layout===4 ? "repeat(2,1fr)" : "1fr";
    return (
      <div className="print-paper">
        <div style={{display:"grid",gridTemplateColumns:grid,gap:4}}>
          {photos.map((p,i)=><div key={i} className="print-photo" style={{width:d.w,height:d.h,fontSize:mini?20:32}}>{p}</div>)}
        </div>
        <div style={{textAlign:"center",fontSize:mini?7:9,color:"#999",padding:"3px 0",fontFamily:"sans-serif"}}>
          AnimeBooth · {selBg?.name} · {selFrame?.name}
        </div>
      </div>
    );
  };

  return (
    <div className="kiosk">
      <div className="kiosk-bg"><Particles/></div>
      <div className="kiosk-content">
        <div className="kiosk-logo">ANIME BOOTH</div>
        <div className="kiosk-tagline">Tu Momento Épico · Impreso al Instante</div>

        {step!=="code"&&step!=="success"&&(
          <div className="steps-row">
            {STEP_LABELS.slice(0,5).map((l,i)=>(
              <div key={i} className={`step-pill ${i<si?"done":""} ${i===si?"active":""}`}>
                {i<si?"✓ ":""}{l}
              </div>
            ))}
          </div>
        )}

        {step==="code"&&(
          <div className="code-card">
            <div className="code-label">🎫 Ingresa tu código de 4 dígitos</div>
            <div className="code-inputs">
              {digits.map((d,i)=>(
                <input key={i} ref={iRefs[i]} className={`code-digit ${d?"filled":""}`} maxLength={1} value={d}
                  onChange={e=>handleDigit(i,e.target.value)} onKeyDown={e=>handleKey(i,e)} inputMode="numeric"/>
              ))}
            </div>
            {codeErr&&<div className="code-error">⚠ {codeErr}</div>}
            <button className="enter-btn" disabled={digits.some(d=>!d)} onClick={verify}>INGRESAR →</button>
            <div style={{marginTop:14,fontSize:12,color:"var(--muted)"}}>¿No tienes código? Consulta en recepción 🎪</div>
          </div>
        )}

        {step==="background"&&(
          <div style={{width:"100%",maxWidth:700}}>
            <div className="step-title">ELIGE TU FONDO</div>
            <div className="step-sub">🎌 Selecciona el universo anime de tu sesión</div>
            <div className="opt-grid-4" style={{marginBottom:20}}>
              {backgrounds.map(bg=>(
                <div key={bg.id} className={`opt-card ${selBg?.id===bg.id?"sel":""}`} style={{background:`linear-gradient(160deg,${bg.color},${bg.accent}22)`}} onClick={()=>{setSelBg(bg);beep(660,0.05);}}>
                  <div className="opt-emoji">{bg.emoji}</div>
                  <div className="opt-label">{bg.name}</div>
                  <div className="opt-meta">{SERIES_LABELS[bg.series]}</div>
                </div>
              ))}
            </div>
            <div className="kiosk-nav"><button className="btn btn-ghost" onClick={restart}>← Salir</button><button className="enter-btn" style={{width:"auto",padding:"12px 36px"}} disabled={!selBg} onClick={()=>setStep("frame")}>Siguiente →</button></div>
          </div>
        )}

        {step==="frame"&&(
          <div style={{width:"100%",maxWidth:680}}>
            <div className="step-title">ELIGE TU MARCO</div>
            <div className="step-sub">🎨 Dale un toque épico a tu foto</div>
            <div className="opt-grid-3" style={{marginBottom:20}}>
              {[...frames,{id:0,series:"general",name:"Sin Marco",emoji:"⬜",color:"#1a1a2e"}].map(fr=>(
                <div key={fr.id} className={`opt-card ${selFrame?.id===fr.id?"sel":""}`} onClick={()=>{setSelFrame(fr);beep(660,0.05);}}>
                  <div style={{border:"3px solid var(--accent)",borderRadius:8,width:60,height:60,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 8px"}}>{fr.emoji}</div>
                  <div className="opt-label">{fr.name}</div>
                  <div className="opt-meta">{SERIES_LABELS[fr.series]||fr.series}</div>
                </div>
              ))}
            </div>
            <div className="kiosk-nav"><button className="btn btn-ghost" onClick={()=>setStep("background")}>← Atrás</button><button className="enter-btn" style={{width:"auto",padding:"12px 36px"}} disabled={!selFrame} onClick={()=>setStep("shoot")}>¡Comenzar! 📸</button></div>
          </div>
        )}

        {step==="shoot"&&(
          <div style={{width:"100%",maxWidth:600,textAlign:"center"}}>
            <div className="step-title">SESIÓN DE FOTOS</div>
            <div className="step-sub">📷 Foto {photos.length+1} de {session.layout} · {selBg?.emoji} {selBg?.name}</div>
            <div className="cam-wrap">
              {!countdown && photos.length < session.layout && <div className="scanline"/>}
              {countdown !== null && countdown > 0 && (
                <div key={countdown} className={`cdown-num c${countdown}`}>{countdown}</div>
              )}
              {flash && <div className="flash-overlay"/>}
              {countdown === null && (
                <div className="cam-placeholder">
                  <div style={{fontSize:60}}>📷</div>
                  <div style={{fontSize:14}}>Cámara lista · Posiciónate frente al lente</div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>Fondo: {selBg?.emoji} {selBg?.name} · Marco: {selFrame?.emoji} {selFrame?.name}</div>
                </div>
              )}
              <div className="cam-corners">
                <div className="crn crn-tl"/><div className="crn crn-tr"/>
                <div className="crn crn-bl"/><div className="crn crn-br"/>
              </div>
            </div>
            <div className="thumb-strip">
              {Array.from({length:session.layout}).map((_,i)=>(
                <div key={i} className={`thumb ${i<photos.length?"done":""}`}>
                  {i<photos.length?<><span style={{fontSize:28}}>{photos[i]}</span><div className="chk">✓</div></>:<span style={{fontSize:20,color:"var(--muted)"}}>{i+1}</span>}
                </div>
              ))}
            </div>
            {photos.length < session.layout && (
              <button className="shoot-btn" disabled={shootLock} onClick={startShoot}>
                {shootLock ? "⏳ Espera..." : "📸 TOMAR FOTO"}
              </button>
            )}
          </div>
        )}

        {step==="preview"&&(
          <div style={{width:"100%",maxWidth:640,textAlign:"center"}}>
            <div className="step-title">VISTA PREVIA</div>
            <div className="step-sub">🖨️ Revisa tu foto antes de imprimir</div>
            <div style={{display:"flex",gap:28,justifyContent:"center",alignItems:"flex-start",marginBottom:20}}>
              <div className="print-preview-wrap">
                <div style={{fontSize:11,color:"var(--muted)",letterSpacing:2,marginBottom:8}}>IMPRESIÓN FINAL</div>
                <PrintPreview/>
              </div>
              <div style={{textAlign:"left",maxWidth:200}}>
                <div style={{fontSize:11,color:"var(--muted)",letterSpacing:2,marginBottom:10}}>DETALLES</div>
                {[["📸","Fotos",`${session.layout} foto${session.layout>1?"s":""}`],["🖼️","Fondo",selBg?.name],["🎨","Marco",selFrame?.name],["📐","Layout",LAYOUTS.find(l=>l.id===session.layout)?.desc]].map(([ic,l,v])=>(
                  <div key={l} style={{marginBottom:8}}>
                    <div style={{fontSize:11,color:"var(--muted)"}}>{ic} {l}</div>
                    <div style={{fontWeight:700,fontSize:14}}>{v}</div>
                  </div>
                ))}
                <div style={{marginTop:14,padding:"10px",background:"rgba(68,170,68,.08)",border:"1px solid rgba(68,170,68,.2)",borderRadius:6,fontSize:12,color:"#44aa44"}}>
                  ✓ Liene 1100 lista<br/>⏱ ~15-20 segundos
                </div>
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
            <div className="success-boom">🎉</div>
            <div className="success-title">¡FOTO IMPRIMIÉNDOSE!</div>
            <div style={{fontSize:14,color:"var(--muted)",marginBottom:28}}>Recoge tu impresión en la ranura de la Liene 1100</div>
            <div style={{display:"flex",gap:20,justifyContent:"center",alignItems:"flex-start",flexWrap:"wrap"}}>
              <div className="qr-card" style={{minWidth:220}}>
                <div style={{fontSize:13,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:4}}>📲 Descarga Digital</div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:2}}>Escanea para obtener tu foto en alta resolución</div>
                <div className="qr-wrap"><QRCode value={downloadUrl} size={140}/></div>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:13,color:"var(--muted)",letterSpacing:1}}>{downloadUrl.replace("https://","")}</div>
                <div style={{marginTop:8,fontSize:11,color:"rgba(232,160,32,.6)"}}>⏳ Link válido por 7 días</div>
              </div>
              <div className="qr-card" style={{minWidth:240}}>
                <div style={{fontSize:13,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:8}}>🎞️ GIF Animado</div>
                <div className="result-gif" style={{margin:"0 auto 12px"}}>
                  {photos.slice(0,3).map((p,i)=>(
                    <div key={i} className="gif-frame" style={{animationDelay:`${i*0.8}s`}}>
                      <span style={{fontSize:60}}>{p}</span>
                    </div>
                  ))}
                  <div className="gif-overlay">ANIME BOOTH · {selBg?.name?.toUpperCase()}</div>
                </div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:12}}>GIF listo para compartir 🎊</div>
                <button className="wa-btn" onClick={()=>window.open(`https://wa.me/?text=${waText}`,"_blank")}>
                  <span style={{fontSize:20}}>💬</span> COMPARTIR EN WHATSAPP
                </button>
              </div>
              <div className="qr-card" style={{minWidth:160}}>
                <div style={{fontSize:13,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:8}}>🖨️ Tu Impresión</div>
                <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
                  <PrintPreview mini/>
                </div>
                <div style={{fontSize:11,color:"var(--muted)"}}>
                  {session.layout} foto{session.layout>1?"s":""}<br/>
                  {selBg?.emoji} {selBg?.name}<br/>
                  {selFrame?.emoji} {selFrame?.name}
                </div>
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

// — ROOT APP ————————————————————————————————————————————————————————————
export default function App() {
  const [view, setView] = useState("dashboard");
  const [kiosk, setKiosk] = useState(false);
  const [events, setEvents] = useState(initialEvents);
  const [backgrounds, setBackgrounds] = useState(initialBackgrounds);
  const [frames, setFrames] = useState(initialFrames);
  const [codes, setCodes] = useState(initialCodes);

  const NAV = [
    { id:"dashboard",   icon:"⬛", label:"Dashboard" },
    { id:"stats",       icon:"📊", label:"Estadísticas" },
    { id:"events",      icon:"🎪", label:"Eventos" },
    { id:"codes",       icon:"🎫", label:"Códigos" },
    { section:"Recursos" },
    { id:"backgrounds", icon:"🖼️", label:"Fondos" },
    { id:"frames",      icon:"🎨", label:"Marcos" },
    { section:"Sistema" },
    { id:"printer",     icon:"🖨️", label:"Impresora" },
  ];

  if (kiosk) return (
    <><style>{css}</style>
    <KioskMode codes={codes} setCodes={setCodes} backgrounds={backgrounds} frames={frames} onExit={()=>setKiosk(false)}/></>
  );

  return (
    <><style>{css}</style>
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-logo"><div className="logo-title">AnimeBooth</div><div className="logo-sub">Admin Panel</div></div>
        <div className="nav-section">
          {NAV.map((item,i)=>item.section
            ? <div key={i} className="nav-label">{item.section}</div>
            : <div key={item.id} className={`nav-item ${view===item.id?"active":""}`} onClick={()=>setView(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</div>
          )}
        </div>
        <div className="sidebar-footer"><button className="kiosk-btn" onClick={()=>setKiosk(true)}>▶ MODO KIOSCO</button></div>
      </div>
      <div className="main">
        {view==="dashboard"   && <Dashboard events={events} codes={codes} backgrounds={backgrounds} frames={frames}/>}
        {view==="stats"       && <Statistics codes={codes} events={events}/>}
        {view==="events"      && <Events events={events} setEvents={setEvents}/>}
        {view==="codes"       && <Codes codes={codes} setCodes={setCodes} events={events}/>}
        {view==="backgrounds" && <Backgrounds backgrounds={backgrounds} setBackgrounds={setBackgrounds}/>}
        {view==="frames"      && <Frames frames={frames} setFrames={setFrames}/>}
        {view==="printer"     && <PrinterSettings/>}
      </div>
    </div></>
  );
}
