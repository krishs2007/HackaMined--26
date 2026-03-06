import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:8000/api";

async function api(path, opts = {}, token = null) {
  const headers = { ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res  = await fetch(API + path, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* ─── STYLES ─────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  :root {
    --bg:     #FFFFFF; --bg1: #F7F7F7; --bg2: #EFEFEF; --bg3: #E5E5E5;
    --border: #E0E0E0; --b2: #C8C8C8;
    --text:   #111111; --t2: #444444; --t3: #888888; --t4: #BBBBBB;
    --red:    #CC2200; --green: #1A7A3A; --blue: #1A5FA0;
    --mono: 'JetBrains Mono', monospace;
    --sans: 'Inter', sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg1); color: var(--text); font-family: var(--sans); font-size: 13px; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: var(--border); }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .fade { animation: fadeUp 0.3s ease; }
  .spin { animation: spin 1s linear infinite; }

  /* ── App shell ── */
  .app { min-height: 100vh; background: var(--bg1); }

  /* ── Header ── */
  .hdr {
    background: var(--bg); border-bottom: 1px solid var(--border);
    height: 52px; padding: 0 28px;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 200;
  }
  .logo { font-family: var(--mono); font-size: 13px; font-weight: 600; letter-spacing: 0.04em; }
  .logo-sep { color: var(--t3); font-weight: 400; margin-left: 6px; }
  .hdr-right { display: flex; align-items: center; gap: 12px; }
  .pill {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 10px; border: 1px solid var(--border);
    font-family: var(--mono); font-size: 8px; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--t2); background: var(--bg1);
  }
  .pill.dark  { background: var(--text); color: var(--bg); border-color: var(--text); }
  .pill.ok    { border-color: var(--green); color: var(--green); }
  .pill.warn  { border-color: #BB6600; color: #BB6600; }
  .s-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
  .s-dot.pulse { animation: pulse 1.5s infinite; }
  .role-chip { font-family: var(--mono); font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--t3); padding: 3px 8px; border: 1px solid var(--border); }
  .avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--text); color: var(--bg); display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 9px; font-weight: 600; cursor: pointer; }
  .logout-btn { font-family: var(--mono); font-size: 8px; color: var(--t3); background: none; border: 1px solid var(--border); padding: 4px 10px; cursor: pointer; letter-spacing: 0.08em; text-transform: uppercase; }
  .logout-btn:hover { color: var(--red); border-color: var(--red); }

  /* ── Sidebar + Layout ── */
  .layout { display: flex; min-height: calc(100vh - 52px); }
  .sidebar { width: 52px; background: var(--bg); border-right: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; padding: 14px 0; gap: 2px; flex-shrink: 0; }
  .nav-i { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; font-size: 15px; color: var(--t3); transition: all 0.1s; }
  .nav-i.on { background: var(--bg2); color: var(--text); }
  .nav-i:hover { background: var(--bg1); }
  .nav-sep { width: 20px; height: 1px; background: var(--border); margin: 6px 0; }
  .content { flex: 1; padding: 24px 28px; background: var(--bg1); overflow-y: auto; }

  /* ── KPI strip ── */
  .kpi-row { display: grid; gap: 10px; margin-bottom: 18px; }
  .kpi { background: var(--bg); border: 1px solid var(--border); padding: 16px 18px; animation: fadeUp 0.4s ease both; }
  .kpi.dark { background: var(--text); }
  .kpi-n { font-family: var(--mono); font-size: 26px; font-weight: 700; color: var(--text); line-height: 1; margin-bottom: 4px; }
  .kpi.dark .kpi-n { color: var(--bg); }
  .kpi.dark .kpi-l { color: #aaa; }
  .kpi.dark .kpi-s { color: #888; }
  .kpi-n.r { color: var(--red); }
  .kpi-n.g { color: var(--green); }
  .kpi-l { font-family: var(--mono); font-size: 7px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--t3); }
  .kpi-s { font-size: 10px; color: var(--t3); margin-top: 3px; }

  /* ── Panels ── */
  .panel { background: var(--bg); border: 1px solid var(--border); padding: 18px 20px; }
  .ph { font-family: var(--mono); font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--t3); margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }

  /* ── Sub-tabs ── */
  .stabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 18px; }
  .stab { font-family: var(--mono); font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; padding: 10px 16px; color: var(--t3); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .stab.on { color: var(--text); border-bottom-color: var(--text); }
  .stab:hover { color: var(--t2); }

  /* ── Table ── */
  .tbl-wrap { border: 1px solid var(--border); overflow-x: auto; background: var(--bg); }
  .tbl { width: 100%; border-collapse: collapse; font-size: 11px; }
  .tbl th { font-family: var(--mono); font-size: 7px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--t3); padding: 8px 12px; text-align: left; font-weight: 500; border-bottom: 1px solid var(--border); background: var(--bg1); white-space: nowrap; }
  .tbl td { padding: 8px 12px; border-bottom: 1px solid var(--bg2); color: var(--t2); vertical-align: middle; }
  .tbl tr:hover td { background: var(--bg1); }
  .tbl tr.hi td { border-left: 2px solid var(--text); }
  .tbl tr.hi:first-child td { background: #FAFAFA; }
  .mn { font-family: var(--mono); font-size: 11px; }

  /* ── Badges ── */
  .badge { display: inline-block; padding: 2px 7px; font-family: var(--mono); font-size: 7px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .bc { background: var(--text); color: var(--bg); }
  .bl { border: 1px solid var(--b2); color: var(--t2); }
  .bclr { border: 1px solid var(--border); color: var(--t3); }
  .bok  { border: 1px solid var(--green); color: var(--green); }
  .berr { border: 1px solid var(--red); color: var(--red); }
  .bblu { border: 1px solid var(--blue); color: var(--blue); }

  /* ── Score bar ── */
  .sc { display: flex; align-items: center; gap: 8px; min-width: 100px; }
  .sc-n { font-family: var(--mono); font-size: 11px; font-weight: 600; min-width: 28px; color: var(--text); }
  .sc-n.lo { color: var(--t3); }
  .sc-b { flex: 1; height: 2px; background: var(--bg2); }
  .sc-f { height: 100%; background: var(--text); }
  .sc-f.lo { background: var(--border); }

  /* ── Buttons ── */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; cursor: pointer; font-family: var(--mono); font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; transition: all 0.1s; white-space: nowrap; }
  .btn-dark  { background: var(--text); color: var(--bg); }
  .btn-dark:hover:not(:disabled)  { background: #333; }
  .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--t2); }
  .btn-ghost:hover:not(:disabled) { border-color: var(--text); color: var(--text); }
  .btn-red   { background: transparent; border: 1px solid var(--red); color: var(--red); }
  .btn-red:hover:not(:disabled)   { background: rgba(204,34,0,0.06); }
  .btn-green { background: transparent; border: 1px solid var(--green); color: var(--green); }
  .btn-green:hover:not(:disabled) { background: rgba(26,122,58,0.06); }
  .btn-sm { padding: 5px 10px; font-size: 8px; }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── Inputs ── */
  .inp { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; font-family: var(--sans); font-size: 12px; outline: none; transition: border 0.15s; }
  .inp:focus { border-color: var(--text); }
  .inp::placeholder { color: var(--t4); }
  .inp-row { display: flex; gap: 8px; margin-bottom: 12px; }

  /* ── Donut ── */
  .donut-wrap { display: flex; align-items: center; gap: 20px; }
  .leg { display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .leg-r { display: flex; align-items: center; gap: 8px; }
  .leg-d { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .leg-l { font-size: 11px; color: var(--t2); flex: 1; }
  .leg-v { font-family: var(--mono); font-size: 11px; color: var(--text); }
  .leg-p { font-family: var(--mono); font-size: 9px; color: var(--t3); min-width: 36px; text-align: right; }

  /* ── HBar ── */
  .hb-list { display: flex; flex-direction: column; gap: 8px; }
  .hb-row { display: grid; grid-template-columns: 32px 1fr 28px; gap: 8px; align-items: center; }
  .hb-l { font-family: var(--mono); font-size: 9px; color: var(--t3); text-align: right; }
  .hb-t { height: 3px; background: var(--bg2); }
  .hb-f { height: 100%; background: var(--text); }
  .hb-c { font-family: var(--mono); font-size: 9px; color: var(--t3); }

  /* ── Feature bars ── */
  .fb { margin-bottom: 10px; }
  .fb-h { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .fb-n { font-family: var(--mono); font-size: 9px; color: var(--t2); }
  .fb-p { font-family: var(--mono); font-size: 9px; color: var(--t3); }
  .fb-bg { height: 2px; background: var(--bg2); }
  .fb-fl { height: 100%; background: var(--text); }

  /* ── Slider mock ── */
  .sld-row { margin-bottom: 16px; }
  .sld-hd { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .sld-l { font-family: var(--mono); font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--t3); }
  .sld-v { font-family: var(--mono); font-size: 8px; color: var(--text); font-weight: 600; }
  .cfg-slider { width: 100%; accent-color: var(--text); cursor: pointer; }

  /* ── Container detail ── */
  .det-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: var(--border); margin-bottom: 14px; }
  .dc { background: var(--bg); padding: 12px 14px; }
  .dc-k { font-family: var(--mono); font-size: 7px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--t3); margin-bottom: 4px; }
  .dc-v { font-family: var(--mono); font-size: 12px; color: var(--text); }
  .dc-v.warn { color: var(--red); }

  /* ── Explanation ── */
  .expl { background: var(--bg1); border-left: 3px solid var(--text); padding: 10px 14px; font-family: var(--mono); font-size: 10px; color: var(--t2); line-height: 1.7; margin-bottom: 14px; }

  /* ── AI panel ── */
  .ai-box { background: var(--bg1); border: 1px solid var(--border); padding: 14px; margin-top: 10px; }
  .ai-suggest { border-left: 2px solid var(--b2); padding: 8px 12px; font-family: var(--mono); font-size: 9px; color: var(--t2); line-height: 1.7; margin-bottom: 6px; background: var(--bg); }

  /* ── Workload bar ── */
  .wl-bar { height: 6px; background: var(--bg2); border: 1px solid var(--border); margin-bottom: 5px; }
  .wl-fill { height: 100%; background: var(--text); }

  /* ── Pagination ── */
  .pg { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; flex-wrap: wrap; gap: 8px; }
  .pg-info { font-family: var(--mono); font-size: 10px; color: var(--t3); }
  .pg-btns { display: flex; gap: 2px; }
  .pg-b { font-family: var(--mono); font-size: 9px; padding: 5px 10px; border: 1px solid var(--border); background: transparent; color: var(--t3); cursor: pointer; }
  .pg-b:hover:not(:disabled) { border-color: var(--text); color: var(--text); }
  .pg-b.on { background: var(--text); color: var(--bg); border-color: var(--text); }
  .pg-b:disabled { opacity: 0.2; cursor: not-allowed; }
  .pg-sz { display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 10px; color: var(--t3); }
  .pg-sz select { background: var(--bg); border: 1px solid var(--border); color: var(--t2); font-family: var(--mono); font-size: 9px; padding: 4px 8px; outline: none; }

  /* ── Filter row ── */
  .flt-row { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
  .flt-btn { font-family: var(--mono); font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; padding: 5px 12px; border: 1px solid var(--border); background: transparent; color: var(--t3); cursor: pointer; }
  .flt-btn:hover { border-color: var(--b2); color: var(--t2); }
  .flt-btn.on { border-color: var(--text); color: var(--text); background: var(--bg2); }
  .srch { flex: 1; min-width: 180px; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 7px 12px; font-family: var(--mono); font-size: 11px; outline: none; }
  .srch:focus { border-color: var(--text); }
  .srch::placeholder { color: var(--t4); }

  /* ── Train bar ── */
  .train-bar { background: var(--bg); border: 1px solid var(--border); border-left: 3px solid var(--text); padding: 12px 18px; margin-bottom: 18px; display: flex; align-items: center; gap: 14px; animation: fadeUp 0.3s ease; }
  .train-msg { font-family: var(--mono); font-size: 10px; color: var(--t2); margin-bottom: 6px; }
  .train-track { height: 2px; background: var(--bg2); flex: 1; }
  .train-fill { height: 100%; background: var(--text); transition: width 0.5s; }

  /* ── Error / empty ── */
  .err-bar { background: #FFF0EE; border: 1px solid #FFCCCC; border-left: 3px solid var(--red); padding: 10px 16px; font-family: var(--mono); font-size: 11px; color: var(--red); margin-bottom: 14px; animation: fadeUp 0.3s ease; }
  .empty { text-align: center; padding: 60px 20px; }
  .empty-hd { font-family: var(--mono); font-size: 12px; color: var(--t4); margin-bottom: 8px; letter-spacing: 0.1em; }
  .empty-bd { font-family: var(--mono); font-size: 10px; color: var(--t4); line-height: 2; }

  /* ── Upload ── */
  .dropzone { background: var(--bg); border: 1px dashed var(--b2); padding: 20px 24px; cursor: pointer; display: flex; align-items: center; gap: 16px; flex: 1; transition: all 0.2s; }
  .dropzone:hover, .dropzone.drag { border-color: var(--text); background: var(--bg1); }
  .drop-name { font-family: var(--mono); font-size: 12px; color: var(--text); }
  .drop-hint { font-family: var(--mono); font-size: 9px; color: var(--t3); margin-top: 3px; }

  /* ── Metrics grid ── */
  .met-grid { display: grid; gap: 1px; background: var(--border); margin-bottom: 14px; }
  .met-cell { background: var(--bg); padding: 16px 18px; text-align: center; }
  .met-cell.hi { background: var(--text); }
  .met-val { font-family: var(--mono); font-size: 22px; font-weight: 700; color: var(--text); line-height: 1; }
  .met-cell.hi .met-val { color: var(--bg); }
  .met-cell.hi .met-lbl { color: #aaa; }
  .met-lbl { font-family: var(--mono); font-size: 7px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--t3); margin-top: 5px; }

  /* ── Section label ── */
  .s-lbl { font-family: var(--mono); font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--t3); margin-bottom: 8px; }

  /* ── Login ── */
  .login-bg { min-height: 100vh; background: var(--bg1); display: flex; align-items: center; justify-content: center; }
  .login-card { background: var(--bg); border: 1px solid var(--border); padding: 36px 40px; width: 380px; box-shadow: 0 2px 16px rgba(0,0,0,0.06); animation: fadeUp 0.4s ease; }
  .login-logo { font-family: var(--mono); font-size: 18px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px; }
  .login-sub { font-family: var(--mono); font-size: 9px; color: var(--t3); letter-spacing: 0.1em; margin-bottom: 28px; }
  .login-lbl { font-family: var(--mono); font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--t3); margin-bottom: 6px; }
  .login-field { margin-bottom: 16px; }
  .role-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 22px; }
  .role-card { border: 1px solid var(--border); padding: 14px 8px; text-align: center; cursor: pointer; transition: all 0.15s; }
  .role-card:hover { border-color: var(--b2); }
  .role-card.sel { border: 2px solid var(--text); }
  .role-icon { font-size: 20px; margin-bottom: 6px; }
  .role-lbl { font-family: var(--mono); font-size: 8px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--t3); }
  .role-card.sel .role-lbl { color: var(--text); font-weight: 600; }
  .login-btn { width: 100%; background: var(--text); color: var(--bg); border: none; padding: 12px; font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: background 0.15s; }
  .login-btn:hover:not(:disabled) { background: #333; }
  .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .login-err { background: #FFF0EE; border: 1px solid #FFCCCC; padding: 8px 12px; font-family: var(--mono); font-size: 10px; color: var(--red); margin-bottom: 14px; }

  @media (max-width: 900px) {
    .g2, .g3 { grid-template-columns: 1fr; }
    .content { padding: 16px; }
  }
`;

/* ─── ICONS ─────────────────────────────────────────────────── */
const SpinIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>;
const UploadIcon= () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const DlIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

/* ─── HELPERS ────────────────────────────────────────────────── */
function RiskBadge({ level }) {
  const cls = level==="Critical"?"bc":level==="Low Risk"?"bl":"bclr";
  return <span className={`badge ${cls}`}>{level}</span>;
}
function ScoreBar({ score }) {
  const lo = score < 40;
  return (
    <div className="sc">
      <span className={`sc-n ${lo?"lo":""}`}>{score}</span>
      <div className="sc-b"><div className={`sc-f ${lo?"lo":""}`} style={{width:`${score}%`}}/></div>
    </div>
  );
}
function ActionStatus({ status }) {
  if (!status || status==="pending") return <span className="badge bl">Pending</span>;
  if (status==="inspected")  return <span className="badge bblu">Inspecting</span>;
  if (status==="cleared")    return <span className="badge bok">Cleared</span>;
  if (status==="detained")   return <span className="badge berr">Detained</span>;
  if (status==="seized")     return <span className="badge berr">Seized</span>;
  if (status==="claimed")    return <span className="badge bblu">Claimed</span>;
  return <span className="badge bl">{status}</span>;
}

/* ─── DONUT ─────────────────────────────────────────────────── */
function Donut({ data, total }) {
  const r=42, cx=52, cy=52, sw=9, circ=2*Math.PI*r;
  let off=0;
  const slices=data.map(s=>{const dash=total>0?(s.val/total)*circ:0;const arc={...s,dash,gap:circ-dash,offset:circ-off};off+=dash;return arc;});
  const pct=total>0?((data[0].val/total)*100).toFixed(1):"—";
  return (
    <div className="donut-wrap">
      <svg width={104} height={104} viewBox="0 0 104 104" style={{flexShrink:0}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg2)" strokeWidth={sw}/>
        {slices.map((s,i)=><circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={s.offset} style={{transform:"rotate(-90deg)",transformOrigin:"52px 52px"}}/>)}
        <text x={cx} y={cy-3} textAnchor="middle" fill="var(--text)" style={{fontFamily:"JetBrains Mono,monospace",fontSize:15,fontWeight:700}}>{pct}%</text>
        <text x={cx} y={cy+11} textAnchor="middle" fill="var(--t3)" style={{fontFamily:"JetBrains Mono,monospace",fontSize:6,letterSpacing:2}}>CRITICAL</text>
      </svg>
      <div className="leg">
        {slices.map((s,i)=><div className="leg-r" key={i}><div className="leg-d" style={{background:s.color}}/><span className="leg-l">{s.label}</span><span className="leg-v">{s.val.toLocaleString()}</span><span className="leg-p">{total>0?`${((s.val/total)*100).toFixed(1)}%`:"—"}</span></div>)}
      </div>
    </div>
  );
}

/* ─── PAGINATION ─────────────────────────────────────────────── */
function Pager({ total, page, size, onPage, onSize }) {
  if (!total) return null;
  const pages=Math.ceil(total/size), s=page*size+1, e=Math.min((page+1)*size,total);
  const nums=[];
  for(let i=0;i<pages;i++){if(i===0||i===pages-1||Math.abs(i-page)<=1)nums.push(i);else if(nums[nums.length-1]!=="…")nums.push("…");}
  return (
    <div className="pg">
      <span className="pg-info">{s.toLocaleString()}–{e.toLocaleString()} of {total.toLocaleString()}</span>
      <div className="pg-btns">
        <button className="pg-b" disabled={page===0} onClick={()=>onPage(0)}>«</button>
        <button className="pg-b" disabled={page===0} onClick={()=>onPage(page-1)}>‹</button>
        {nums.map((n,i)=>n==="…"?<span key={"d"+i} style={{padding:"5px 3px",color:"var(--t3)",fontSize:10}}>…</span>:<button key={n} className={`pg-b${n===page?" on":""}`} onClick={()=>onPage(n)}>{n+1}</button>)}
        <button className="pg-b" disabled={page>=pages-1} onClick={()=>onPage(page+1)}>›</button>
        <button className="pg-b" disabled={page>=pages-1} onClick={()=>onPage(pages-1)}>»</button>
      </div>
      <div className="pg-sz">
        Rows <select value={size} onChange={e=>{onSize(+e.target.value);onPage(0);}}>
          {[50,100,250,500].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LOGIN SCREEN
══════════════════════════════════════════════════════════════ */
const ROLES = [
  { id:"supervisor",     label:"Supervisor",      icon:"📊" },
  { id:"customs_officer",label:"Customs Officer", icon:"🔍" },
  { id:"risk_analyst",   label:"Risk Analyst",    icon:"🧠" },
];

function LoginScreen({ onLogin }) {
  const [officerId, setOfficerId] = useState("");
  const [password,  setPassword]  = useState("");
  const [role,      setRole]      = useState("customs_officer");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const submit = async () => {
    if (!officerId.trim() || !password.trim()) { setError("Enter Officer ID and password."); return; }
    setLoading(true); setError("");
    try {
      const res = await api("/auth/login", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ officer_id: officerId.trim().toUpperCase(), password, role }),
      });
      onLogin(res.user, res.token);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">SmartRisk</div>
        <div className="login-sub">Port Authority Container Intelligence</div>
        {error && <div className="login-err">⚠ {error}</div>}
        <div className="login-field">
          <div className="login-lbl">Officer ID</div>
          <input className="inp" style={{width:"100%"}} placeholder="e.g. OFF-001"
            value={officerId} onChange={e=>setOfficerId(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        <div className="login-field">
          <div className="login-lbl">Password</div>
          <input className="inp" style={{width:"100%"}} type="password" placeholder="••••••••"
            value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        <div className="login-lbl" style={{marginBottom:10}}>Select Role</div>
        <div className="role-grid">
          {ROLES.map(r=>(
            <div key={r.id} className={`role-card ${role===r.id?"sel":""}`} onClick={()=>setRole(r.id)}>
              <div className="role-icon">{r.icon}</div>
              <div className="role-lbl">{r.label}</div>
            </div>
          ))}
        </div>
        <button className="login-btn" disabled={loading} onClick={submit}>
          {loading ? "Signing In..." : "Sign In →"}
        </button>
        <div style={{marginTop:14,fontFamily:"var(--mono)",fontSize:8,color:"var(--t4)",textAlign:"center",letterSpacing:"0.08em"}}>
          Demo: OFF-001 / OFF-002 / OFF-003 / OFF-004 · password: pass123
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED HEADER
══════════════════════════════════════════════════════════════ */
function Header({ user, token, onLogout, statusPill }) {
  const initials = user.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const roleName = user.role.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
  return (
    <div className="hdr">
      <div className="logo">SmartRisk <span className="logo-sep">/ {roleName}</span></div>
      <div className="hdr-right">
        {statusPill}
        <div className="role-chip">{roleName}</div>
        <div className="avatar" title={user.name}>{initials}</div>
        <button className="logout-btn" onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUPERVISOR DASHBOARD
══════════════════════════════════════════════════════════════ */
function SupervisorDashboard({ token }) {
  const [tab,         setTab]         = useState("overview");
  const [status,      setStatus]      = useState(null);
  const [summary,     setSummary]     = useState(null);
  const [preds,       setPreds]       = useState([]);
  const [inspections, setInspections] = useState([]);
  const [file,        setFile]        = useState(null);
  const [dragging,    setDragging]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [filter,      setFilter]      = useState("all");
  const [search,      setSearch]      = useState("");
  const [pgPage,      setPgPage]      = useState(0);
  const [pgSize,      setPgSize]      = useState(100);
  const fileRef = useRef();

  useEffect(()=>{
    const poll = async () => {
      try { setStatus(await api("/status", {}, token)); } catch{}
    };
    poll(); const t=setInterval(poll,3000); return()=>clearInterval(t);
  },[token]);

  useEffect(()=>{
    if(tab==="overview"||tab==="queue"){
      api("/inspections",{},token).then(setInspections).catch(()=>{});
    }
  },[tab,token]);

  const trainSt   = status?.train_status;
  const isTraining= trainSt?.state==="training"||trainSt?.state==="retraining";
  const isReady   = status?.model_trained;

  const handleFile = f => { if(!f||!f.name.endsWith(".csv")){setError("CSV files only.");return;} setFile(f);setError(""); };
  const handleAnalyze = async () => {
    if(!file||!isReady) return;
    setLoading(true); setError("");
    try {
      const form=new FormData(); form.append("file",file);
      const res=await api("/predict",{method:"POST",body:form},token);
      setSummary(res.summary); setPreds(res.predictions); setTab("overview");
    } catch(e){setError(e.message);}
    setLoading(false);
  };

  const filteredPreds = preds.filter(p=>{
    const mf=filter==="all"||(filter==="critical"&&p.Risk_Level==="Critical")||(filter==="low"&&p.Risk_Level==="Low Risk")||(filter==="clear"&&p.Risk_Level==="Clear")||(filter==="anomaly"&&p.Anomaly_Flag);
    const ms=!search||String(p.Container_ID).includes(search)||(p.Origin_Country||"").toLowerCase().includes(search.toLowerCase());
    return mf&&ms;
  });

  // Merge inspection statuses into predictions
  const inspMap = {};
  inspections.forEach(i=>{ inspMap[String(i.container_id)]=i.action; });

  const criticals = preds.filter(p=>p.Risk_Level==="Critical").sort((a,b)=>b.Risk_Score-a.Risk_Score);
  const pending   = criticals.filter(p=>!inspMap[String(p.Container_ID)]||inspMap[String(p.Container_ID)]==="claimed");
  const actioned  = criticals.filter(p=>inspMap[String(p.Container_ID)]&&inspMap[String(p.Container_ID)]!=="claimed");

  const statusPill = isTraining
    ? <div className="pill warn"><div className="s-dot pulse"/>Training</div>
    : isReady ? <div className="pill dark"><div className="s-dot"/>Model Ready</div>
    : <div className="pill">Offline</div>;

  return (
    <div>
      {/* Sub-nav */}
      <div className="stabs">
        {[["overview","Overview"],["queue","Inspection Queue"],["results","All Containers"]].map(([id,lbl])=>(
          <div key={id} className={`stab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lbl}</div>
        ))}
      </div>

      {/* Training bar */}
      {isTraining && (
        <div className="train-bar">
          <SpinIcon/>
          <div style={{flex:1}}>
            <div className="train-msg">{trainSt.message}</div>
            <div className="train-track"><div className="train-fill" style={{width:`${trainSt.progress}%`}}/></div>
          </div>
        </div>
      )}

      {/* Upload row */}
      <div style={{display:"flex",gap:10,marginBottom:18}}>
        <div className={`dropzone ${dragging?"drag":""}`}
          onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
          onClick={()=>fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
          <UploadIcon/>
          {file ? <div><div className="drop-name">{file.name}</div><div className="drop-hint">{(file.size/1024).toFixed(1)} KB · click to change</div></div>
                : <div><div className="drop-name" style={{color:"var(--t3)"}}>Drop real-time CSV or click to browse</div></div>}
        </div>
        <button className="btn btn-dark" style={{minWidth:160}} disabled={!file||loading||!isReady} onClick={handleAnalyze}>
          {loading?<><SpinIcon/>Analyzing...</>:"Run Analysis"}
        </button>
        {summary && <a href={`http://localhost:8000/api/download`} style={{textDecoration:"none"}}><button className="btn btn-ghost"><DlIcon/>Export</button></a>}
      </div>

      {error && <div className="err-bar">⚠ {error}</div>}

      {/* ── OVERVIEW TAB ── */}
      {tab==="overview" && (
        summary ? (
          <>
            <div className="kpi-row" style={{gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr"}}>
              <div className="kpi dark">
                <div className="kpi-n" style={{color:"#fff",fontSize:32}}>{summary.total.toLocaleString()}</div>
                <div className="kpi-l">Total Containers</div>
                <div className="kpi-s">Current batch</div>
              </div>
              <div className="kpi"><div className="kpi-n r">{summary.critical_count}</div><div className="kpi-l">Critical</div><div className="kpi-s">{summary.critical_pct}%</div></div>
              <div className="kpi"><div className="kpi-n">{summary.anomaly_count}</div><div className="kpi-l">Anomalies</div><div className="kpi-s">{summary.anomaly_pct}%</div></div>
              <div className="kpi"><div className="kpi-n g">{actioned.length}</div><div className="kpi-l">Inspected</div><div className="kpi-s">{summary.critical_count>0?Math.round(actioned.length/summary.critical_count*100):0}%</div></div>
              <div className="kpi"><div className="kpi-n r">{pending.length}</div><div className="kpi-l">Pending</div><div className="kpi-s">Unactioned</div></div>
            </div>

            {summary.critical_count > 0 && (
              <div className="panel" style={{marginBottom:12}}>
                <div className="ph">Shift Workload</div>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:24,alignItems:"center"}}>
                  <div>
                    <div className="s-lbl" style={{marginBottom:6}}>Inspection Progress · {actioned.length} / {summary.critical_count}</div>
                    <div className="wl-bar"><div className="wl-fill" style={{width:`${summary.critical_count>0?Math.round(actioned.length/summary.critical_count*100):0}%`}}/></div>
                    <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)",marginTop:4}}>{summary.critical_count>0?Math.round(actioned.length/summary.critical_count*100):0}% complete</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontFamily:"var(--mono)",fontSize:28,fontWeight:700}}>{inspections.filter(i=>i.action!=="claimed").length}</div>
                    <div className="kpi-l">Actions Recorded</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontFamily:"var(--mono)",fontSize:28,fontWeight:700}}>{pending.length}</div>
                    <div className="kpi-l" style={{color:"var(--red)"}}>Still Pending</div>
                  </div>
                </div>
              </div>
            )}

            <div className="g2">
              <div className="panel">
                <div className="ph">Critical Queue — Top 10</div>
                <table className="tbl">
                  <thead><tr><th>#</th><th>Container ID</th><th>Score</th><th>Origin</th><th>Status</th></tr></thead>
                  <tbody>
                    {criticals.slice(0,10).map((p,i)=>(
                      <tr key={p.Container_ID} className={i<3?"hi":""}>
                        <td className="mn">{i+1}</td>
                        <td className="mn" style={{fontWeight:600}}>{p.Container_ID}</td>
                        <td><ScoreBar score={p.Risk_Score}/></td>
                        <td className="mn">{p.Origin_Country||"—"}</td>
                        <td><ActionStatus status={inspMap[String(p.Container_ID)]}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="panel">
                  <div className="ph">Risk Breakdown</div>
                  <Donut total={summary.total} data={[
                    {val:summary.critical_count, label:"Critical", color:"#111"},
                    {val:summary.low_risk_count,  label:"Low Risk", color:"#BDBDBD"},
                    {val:summary.clear_count,     label:"Clear",    color:"#EBEBEB"},
                  ]}/>
                </div>
                {summary.country_breakdown && (
                  <div className="panel">
                    <div className="ph">Critical by Origin</div>
                    <div className="hb-list">
                      {Object.entries(summary.country_breakdown).slice(0,6).map(([c,n])=>{
                        const mx=Math.max(...Object.values(summary.country_breakdown));
                        return <div className="hb-row" key={c}><span className="hb-l">{c}</span><div className="hb-t"><div className="hb-f" style={{width:`${(n/mx)*100}%`}}/></div><span className="hb-c">{n}</span></div>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="empty">
            <div className="empty-hd">No Data Loaded</div>
            <div className="empty-bd">Upload a real-time CSV above to begin analysis.</div>
          </div>
        )
      )}

      {/* ── QUEUE TAB ── */}
      {tab==="queue" && (
        summary ? (
          <>
            <div style={{marginBottom:12,fontFamily:"var(--mono)",fontSize:10,color:"var(--t3)"}}>
              {criticals.length} critical containers · {actioned.length} actioned · {pending.length} pending
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>#</th><th>Container ID</th><th>Score</th><th>Origin</th><th>Primary Flag</th><th>Officer</th><th>Status</th></tr></thead>
                <tbody>
                  {criticals.map((p,i)=>{
                    const insp = inspections.find(x=>String(x.container_id)===String(p.Container_ID));
                    return (
                      <tr key={p.Container_ID} className={i<3?"hi":""}>
                        <td className="mn">{i+1}</td>
                        <td className="mn" style={{fontWeight:600}}>{p.Container_ID}</td>
                        <td><ScoreBar score={p.Risk_Score}/></td>
                        <td className="mn">{p.Origin_Country||"—"}</td>
                        <td style={{fontSize:10,color:"var(--t2)",maxWidth:220}}>{(p.Explanation_Summary||"").split(".")[0]}</td>
                        <td className="mn" style={{color:"var(--t3)"}}>{insp?.officer_id||"—"}</td>
                        <td><ActionStatus status={insp?.action}/></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : <div className="empty"><div className="empty-hd">Run analysis first</div></div>
      )}

      {/* ── RESULTS TAB ── */}
      {tab==="results" && (
        preds.length > 0 ? (
          <>
            <div className="flt-row">
              {[["all","All"],["critical","Critical"],["low","Low Risk"],["clear","Clear"],["anomaly","Anomaly"]].map(([id,lbl])=>(
                <button key={id} className={`flt-btn ${filter===id?"on":""}`} onClick={()=>{setFilter(id);setPgPage(0);}}>{lbl}</button>
              ))}
              <input className="srch" placeholder="Search by ID, origin, HS code..." value={search} onChange={e=>{setSearch(e.target.value);setPgPage(0);}}/>
            </div>
            <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--t3)",marginBottom:10}}>{filteredPreds.length.toLocaleString()} containers</div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Container ID</th><th>Risk Score</th><th>Risk Level</th><th>Origin</th><th>Anomaly</th><th>Explanation</th></tr></thead>
                <tbody>
                  {filteredPreds.slice(pgPage*pgSize,(pgPage+1)*pgSize).map(p=>(
                    <tr key={p.Container_ID} className={p.Risk_Level==="Critical"?"hi":""}>
                      <td className="mn" style={{fontWeight:p.Risk_Level==="Critical"?600:400}}>{p.Container_ID}</td>
                      <td><ScoreBar score={p.Risk_Score}/></td>
                      <td><RiskBadge level={p.Risk_Level}/></td>
                      <td className="mn">{p.Origin_Country||"—"}</td>
                      <td>{p.Anomaly_Flag?<span className="badge bc">⚑</span>:<span style={{color:"var(--t4)"}}>—</span>}</td>
                      <td style={{fontSize:10,color:"var(--t2)",maxWidth:280}}>{(p.Explanation_Summary||"").slice(0,80)}{p.Explanation_Summary?.length>80?"…":""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager total={filteredPreds.length} page={pgPage} size={pgSize} onPage={setPgPage} onSize={setPgSize}/>
          </>
        ) : <div className="empty"><div className="empty-hd">Run analysis first</div></div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CUSTOMS OFFICER DASHBOARD
══════════════════════════════════════════════════════════════ */
function OfficerDashboard({ user, token }) {
  const [tab,      setTab]      = useState("queue");
  const [status,   setStatus]   = useState(null);
  const [preds,    setPreds]    = useState([]);
  const [myInsps,  setMyInsps]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [actionMsg,setActionMsg]= useState("");
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [search,   setSearch]   = useState("");
  const [allInsps, setAllInsps] = useState([]);
  const fileRef = useRef();

  useEffect(()=>{
    const poll=async()=>{try{setStatus(await api("/status",{},token));}catch{}};
    poll(); const t=setInterval(poll,3000); return()=>clearInterval(t);
  },[token]);

  const loadMyHistory = useCallback(async()=>{
    try { setMyInsps(await api("/inspections/mine",{},token)); } catch{}
  },[token]);

  const loadAllInsps = useCallback(async()=>{
    try { setAllInsps(await api("/inspections",{},token)); } catch{}
  },[token]);

  useEffect(()=>{ loadMyHistory(); loadAllInsps(); },[loadMyHistory,loadAllInsps]);

  const handleFile = f=>{ if(!f||!f.name.endsWith(".csv")){setError("CSV only.");return;} setFile(f);setError(""); };
  const handleAnalyze = async()=>{
    if(!file) return; setLoading(true); setError("");
    try {
      const form=new FormData(); form.append("file",file);
      const res=await api("/predict",{method:"POST",body:form},token);
      setPreds(res.predictions); setTab("queue");
    } catch(e){setError(e.message);}
    setLoading(false);
  };

  const doAction = async(containerId, action, finalStatus=null)=>{
    try {
      await api(`/container/${containerId}/action`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action, final_status:finalStatus}),
      }, token);
      setActionMsg(`✓ ${containerId} marked as ${action}`);
      loadMyHistory(); loadAllInsps();
      setTimeout(()=>setActionMsg(""),3000);
    } catch(e){ setError(e.message); }
  };

  const inspMap={};
  allInsps.forEach(i=>{inspMap[String(i.container_id)]=i;});
  const myInspMap={};
  myInsps.forEach(i=>{myInspMap[String(i.container_id)]=i;});

  const isTraining = status?.train_status?.state==="training"||status?.train_status?.state==="retraining";
  const isReady    = status?.model_trained;

  const criticals = preds.filter(p=>p.Risk_Level==="Critical").sort((a,b)=>b.Risk_Score-a.Risk_Score);
  const myQueue   = criticals.filter(p=>myInspMap[String(p.Container_ID)]);
  const available = criticals.filter(p=>!inspMap[String(p.Container_ID)]||inspMap[String(p.Container_ID)].action==="claimed");

  const filteredPreds = preds.filter(p=>{
    return !search||String(p.Container_ID).includes(search)||
      (p.Origin_Country||"").toLowerCase().includes(search.toLowerCase())||
      (p.HS_Code||"").includes(search)||
      (p.Importer_ID||"").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <div className="stabs">
        {[["queue","My Queue"],["lookup","Container Lookup"],["history","My History"]].map(([id,lbl])=>(
          <div key={id} className={`stab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lbl}</div>
        ))}
      </div>

      {isTraining && (
        <div className="train-bar">
          <SpinIcon/>
          <div style={{flex:1}}>
            <div className="train-msg">{status.train_status.message}</div>
            <div className="train-track"><div className="train-fill" style={{width:`${status.train_status.progress}%`}}/></div>
          </div>
        </div>
      )}

      {error   && <div className="err-bar">⚠ {error}</div>}
      {actionMsg && <div style={{background:"#F0FFF4",border:"1px solid #C6F6D5",borderLeft:"3px solid var(--green)",padding:"10px 16px",fontFamily:"var(--mono)",fontSize:11,color:"var(--green)",marginBottom:14}}>{actionMsg}</div>}

      {/* ── MY QUEUE ── */}
      {tab==="queue" && (
        <>
          {/* Upload */}
          <div style={{display:"flex",gap:10,marginBottom:18}}>
            <div className={`dropzone ${dragging?"drag":""}`}
              onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
              onClick={()=>fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
              <UploadIcon/>
              {file?<div><div className="drop-name">{file.name}</div></div>:<div className="drop-name" style={{color:"var(--t3)"}}>Upload real-time CSV to load containers</div>}
            </div>
            <button className="btn btn-dark" disabled={!file||loading||!isReady} onClick={handleAnalyze}>
              {loading?<><SpinIcon/>Loading...</>:"Load Batch"}
            </button>
          </div>

          {preds.length > 0 ? (
            <>
              {/* My assigned */}
              {myQueue.length > 0 && (
                <div className="panel" style={{marginBottom:12}}>
                  <div className="ph">My Assigned Containers ({myQueue.length})</div>
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead><tr><th>#</th><th>Container ID</th><th>Score</th><th>Origin</th><th>Primary Flag</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {myQueue.map((p,i)=>(
                          <tr key={p.Container_ID} className="hi" style={{cursor:"pointer"}} onClick={()=>setSelected(selected?.Container_ID===p.Container_ID?null:p)}>
                            <td className="mn">{i+1}</td>
                            <td className="mn" style={{fontWeight:600}}>{p.Container_ID}</td>
                            <td><ScoreBar score={p.Risk_Score}/></td>
                            <td className="mn">{p.Origin_Country||"—"}</td>
                            <td style={{fontSize:10,color:"var(--t2)"}}>{(p.Explanation_Summary||"").split(".")[0]}</td>
                            <td><ActionStatus status={myInspMap[String(p.Container_ID)]?.action}/></td>
                            <td onClick={e=>e.stopPropagation()}>
                              <div style={{display:"flex",gap:6}}>
                                <button className="btn btn-dark btn-sm" onClick={()=>doAction(p.Container_ID,"inspected","Critical")}>Inspect</button>
                                <button className="btn btn-green btn-sm" onClick={()=>doAction(p.Container_ID,"cleared","Clear")}>Clear</button>
                                <button className="btn btn-red btn-sm" onClick={()=>doAction(p.Container_ID,"detained","Critical")}>Detain</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Available to claim */}
              <div className="panel">
                <div className="ph">Available Critical Containers ({available.length})</div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead><tr><th>#</th><th>Container ID</th><th>Score</th><th>Origin</th><th>Primary Flag</th><th>Action</th></tr></thead>
                    <tbody>
                      {available.map((p,i)=>(
                        <tr key={p.Container_ID} style={{cursor:"pointer"}} onClick={()=>setSelected(selected?.Container_ID===p.Container_ID?null:p)}>
                          <td className="mn">{i+1}</td>
                          <td className="mn">{p.Container_ID}</td>
                          <td><ScoreBar score={p.Risk_Score}/></td>
                          <td className="mn">{p.Origin_Country||"—"}</td>
                          <td style={{fontSize:10,color:"var(--t2)"}}>{(p.Explanation_Summary||"").split(".")[0]}</td>
                          <td onClick={e=>e.stopPropagation()}>
                            <button className="btn btn-ghost btn-sm" onClick={()=>doAction(p.Container_ID,"claimed")}>Claim</button>
                          </td>
                        </tr>
                      ))}
                      {available.length===0 && <tr><td colSpan={6} style={{textAlign:"center",padding:"20px",color:"var(--t3)",fontFamily:"var(--mono)",fontSize:10}}>All critical containers have been assigned</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expanded detail */}
              {selected && (
                <div className="panel fade" style={{marginTop:12,border:"2px solid var(--text)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <div>
                      <div style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:700}}>{selected.Container_ID}</div>
                      <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)",marginTop:2}}>Container Detail View</div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <RiskBadge level={selected.Risk_Level}/>
                      <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t2)"}}>Score {selected.Risk_Score}</span>
                    </div>
                  </div>
                  <div className="det-grid">
                    <div className="dc"><div className="dc-k">Origin Country</div><div className="dc-v">{selected.Origin_Country||"—"}</div></div>
                    <div className="dc"><div className="dc-k">Importer ID</div><div className="dc-v">{selected.Importer_ID||"—"}</div></div>
                    <div className="dc"><div className="dc-k">HS Code</div><div className="dc-v">{selected.HS_Code||"—"}</div></div>
                    <div className="dc"><div className="dc-k">Weight Mismatch</div><div className={`dc-v ${(selected.Weight_Diff_Pct||0)>10?"warn":""}`}>{selected.Weight_Diff_Pct!=null?`${selected.Weight_Diff_Pct.toFixed(1)}%`:"—"}</div></div>
                    <div className="dc"><div className="dc-k">Dwell Time</div><div className="dc-v">{selected.Dwell_Time_Hours!=null?`${selected.Dwell_Time_Hours}h`:"—"}</div></div>
                    <div className="dc"><div className="dc-k">Declared Value</div><div className="dc-v">{selected.Declared_Value!=null?`$${Number(selected.Declared_Value).toLocaleString()}`:"—"}</div></div>
                  </div>
                  {selected.Explanation_Summary && <div className="expl">{selected.Explanation_Summary}</div>}
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <button className="btn btn-dark" onClick={()=>doAction(selected.Container_ID,"inspected","Critical")}>✓ Mark Inspected</button>
                    <button className="btn btn-green" onClick={()=>doAction(selected.Container_ID,"cleared","Clear")}>✓ Clear & Release</button>
                    <button className="btn btn-red" onClick={()=>doAction(selected.Container_ID,"detained","Critical")}>⚠ Detain</button>
                    <button className="btn btn-ghost" onClick={()=>doAction(selected.Container_ID,"seized","Critical")}>🔒 Seize</button>
                    <button className="btn btn-ghost" style={{marginLeft:"auto"}} onClick={()=>setSelected(null)}>Close</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty"><div className="empty-hd">No containers loaded</div><div className="empty-bd">Upload real-time CSV above to view your inspection queue.</div></div>
          )}
        </>
      )}

      {/* ── LOOKUP ── */}
      {tab==="lookup" && (
        <>
          <div style={{marginBottom:16}}>
            <div className="s-lbl">Search containers by ID, origin, importer, or HS code</div>
            <div className="inp-row">
              <input className="inp" style={{flex:1}} placeholder="Container ID, origin country, importer, HS code..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          </div>
          {preds.length > 0 ? (
            <>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--t3)",marginBottom:10}}>{filteredPreds.length.toLocaleString()} results</div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Container ID</th><th>Score</th><th>Risk Level</th><th>Origin</th><th>HS Code</th><th>Importer</th><th>Anomaly</th><th>My Status</th></tr></thead>
                  <tbody>
                    {filteredPreds.slice(0,200).map(p=>(
                      <tr key={p.Container_ID} style={{cursor:"pointer"}} onClick={()=>{setSelected(p);setTab("queue");}}>
                        <td className="mn">{p.Container_ID}</td>
                        <td><ScoreBar score={p.Risk_Score}/></td>
                        <td><RiskBadge level={p.Risk_Level}/></td>
                        <td className="mn">{p.Origin_Country||"—"}</td>
                        <td className="mn">{p.HS_Code||"—"}</td>
                        <td className="mn" style={{fontSize:10}}>{p.Importer_ID||"—"}</td>
                        <td>{p.Anomaly_Flag?<span className="badge bc">⚑</span>:"—"}</td>
                        <td><ActionStatus status={myInspMap[String(p.Container_ID)]?.action}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="empty"><div className="empty-hd">Load a batch first</div><div className="empty-bd">Go to My Queue tab and upload a CSV.</div></div>}
        </>
      )}

      {/* ── HISTORY ── */}
      {tab==="history" && (
        myInsps.length > 0 ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Container ID</th><th>Action</th><th>Final Status</th><th>Notes</th><th>Time</th></tr></thead>
              <tbody>
                {myInsps.map((i,idx)=>(
                  <tr key={idx}>
                    <td className="mn" style={{fontWeight:600}}>{i.container_id}</td>
                    <td><ActionStatus status={i.action}/></td>
                    <td className="mn" style={{fontSize:10}}>{i.final_status||"—"}</td>
                    <td style={{fontSize:10,color:"var(--t2)"}}>{i.notes||"—"}</td>
                    <td className="mn" style={{fontSize:9,color:"var(--t3)"}}>{i.timestamp?new Date(i.timestamp).toLocaleString():"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty"><div className="empty-hd">No actions recorded yet</div><div className="empty-bd">Your inspection decisions will appear here.</div></div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   RISK ANALYST DASHBOARD
══════════════════════════════════════════════════════════════ */
function AnalystDashboard({ token }) {
  const [tab,      setTab]      = useState("metrics");
  const [status,   setStatus]   = useState(null);
  const [metrics,  setMetrics]  = useState(null);
  const [feats,    setFeats]    = useState([]);
  const [config,   setConfig]   = useState(null);
  const [dirty,    setDirty]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [aiInput,  setAiInput]  = useState("");
  const [aiResp,   setAiResp]   = useState("");
  const [aiLoad,   setAiLoad]   = useState(false);
  const [error,    setError]    = useState("");

  useEffect(()=>{
    const poll=async()=>{
      try {
        const s=await api("/status",{},token); setStatus(s);
        if(s.model_trained){
          if(!metrics){const m=await api("/metrics",{},token);setMetrics(m);const fi=await api("/feature-importance",{},token);setFeats(fi);}
          if(!config){const c=await api("/model-config",{},token);setConfig(c);}
        }
      } catch{}
    };
    poll(); const t=setInterval(poll,3000); return()=>clearInterval(t);
  },[token,metrics,config]);

  const trainSt   = status?.train_status;
  const isTraining= trainSt?.state==="training"||trainSt?.state==="retraining";
  const isReady   = status?.model_trained;
  const maxFeat   = feats[0]?.importance||1;

  const saveConfig = async()=>{
    if(!config) return; setSaving(true);
    try {
      const res=await api("/model-config",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(config)},token);
      setDirty(false);
      if(res.retraining){setMetrics(null);setFeats([]);}
    } catch(e){setError(e.message);}
    setSaving(false);
  };

  const retrain = async()=>{
    try { await api("/retrain",{method:"POST"},token); setMetrics(null);setFeats([]); } catch(e){setError(e.message);}
  };

  const askAI = async()=>{
    if(!aiInput.trim()) return;
    setAiLoad(true); setAiResp("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:600,
          messages:[{role:"user",content:`You are a customs risk ML analyst assistant for SmartRisk, an XGBoost-based container inspection system. Current model metrics: Critical Recall ${metrics?.critical_recall?`${(metrics.critical_recall*100).toFixed(1)}%`:"unknown"}, Precision ${metrics?.critical_precision?`${(metrics.critical_precision*100).toFixed(1)}%`:"unknown"}, Macro F1 ${metrics?.macro_f1?`${(metrics.macro_f1*100).toFixed(1)}%`:"unknown"}. Top features: ${feats.slice(0,5).map(f=>`${f.feature} (${(f.importance*100).toFixed(1)}%)`).join(", ")}. The analyst asks: ${aiInput}. Give 3 concise, actionable suggestions. Format each as a short bullet starting with →`}],
        }),
      });
      const d=await res.json();
      setAiResp(d.content?.[0]?.text||"No response.");
    } catch(e){setAiResp("AI unavailable: "+e.message);}
    setAiLoad(false);
  };

  return (
    <div>
      <div className="stabs">
        {[["metrics","Model Metrics"],["training","Training Controls"],["ai","AI Recommendations"]].map(([id,lbl])=>(
          <div key={id} className={`stab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lbl}</div>
        ))}
      </div>

      {isTraining && (
        <div className="train-bar"><SpinIcon/>
          <div style={{flex:1}}>
            <div className="train-msg">{trainSt.message}</div>
            <div className="train-track"><div className="train-fill" style={{width:`${trainSt.progress}%`}}/></div>
          </div>
        </div>
      )}
      {error && <div className="err-bar">⚠ {error}</div>}

      {/* ── METRICS ── */}
      {tab==="metrics" && (
        metrics ? (
          <div className="g2">
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="panel">
                <div className="ph">Validation Metrics · Leakage-free 20% holdout</div>
                <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 10px",border:"1px solid var(--green)",fontFamily:"var(--mono)",fontSize:8,color:"var(--green)",marginBottom:14}}>✓ Leakage-free · encoding maps from train fold only</div>
                <div className="met-grid" style={{gridTemplateColumns:"1fr 1fr 1fr"}}>
                  <div className="met-cell hi"><div className="met-val">{(metrics.critical_recall*100).toFixed(1)}%</div><div className="met-lbl">Critical Recall</div></div>
                  <div className="met-cell"><div className="met-val">{(metrics.critical_precision*100).toFixed(1)}%</div><div className="met-lbl">Critical Precision</div></div>
                  <div className="met-cell"><div className="met-val">{(metrics.macro_f1*100).toFixed(1)}%</div><div className="met-lbl">Macro F1</div></div>
                </div>
                <div className="met-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
                  <div className="met-cell"><div className="met-val">{(metrics.auc*100).toFixed(1)}%</div><div className="met-lbl">AUC (Macro OvR)</div></div>
                  <div className="met-cell"><div className="met-val">{metrics.val_size?.toLocaleString()}</div><div className="met-lbl">Validation Rows</div></div>
                </div>
              </div>
              <div className="panel">
                <div className="ph">Per-Class Performance</div>
                {["Critical","Low Risk","Clear"].map(cls=>{
                  const c=metrics.per_class?.[cls]; if(!c) return null;
                  return (
                    <div key={cls} style={{marginBottom:18}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><RiskBadge level={cls}/><span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)"}}>n={c.support?.toLocaleString()}</span></div>
                      {[["Precision",c.precision],["Recall",c.recall],["F1",c["f1-score"]]].map(([k,v])=>(
                        <div key={k} className="fb"><div className="fb-h"><span className="fb-n">{k}</span><span className="fb-p">{(v*100).toFixed(1)}%</span></div><div className="fb-bg"><div className="fb-fl" style={{width:`${v*100}%`}}/></div></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="panel">
              <div className="ph">Feature Importance</div>
              {feats.map(f=>(
                <div key={f.feature} className="fb">
                  <div className="fb-h"><span className="fb-n">{f.feature}</span><span className="fb-p">{(f.importance*100).toFixed(1)}%</span></div>
                  <div className="fb-bg"><div className="fb-fl" style={{width:`${(f.importance/maxFeat)*100}%`}}/></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty">
            <div className="empty-hd">{isTraining?"Training in progress...":"Model not trained"}</div>
            <div className="empty-bd">Metrics will appear here after training completes.</div>
          </div>
        )
      )}

      {/* ── TRAINING ── */}
      {tab==="training" && (
        config ? (
          <div className="g2">
            <div className="panel">
              <div className="ph">Model Hyperparameters</div>
              <div style={{fontSize:10,color:"var(--t3)",marginBottom:18,lineHeight:1.7}}>Changing these values will trigger automatic retraining on save.</div>
              {[
                ["Estimators (Trees)","n_estimators",100,1000,50],
                ["Max Depth","max_depth",3,10,1],
                ["Learning Rate","learning_rate",0.01,0.3,0.01],
                ["Validation Split","val_split",0.1,0.4,0.05],
              ].map(([lbl,key,mn,mx,st])=>(
                <div key={key} className="sld-row">
                  <div className="sld-hd"><span className="sld-l">{lbl}</span><span className="sld-v">{key==="learning_rate"?config[key].toFixed(2):key==="val_split"?`${(config[key]*100).toFixed(0)}%`:config[key]}</span></div>
                  <input type="range" className="cfg-slider" min={mn} max={mx} step={st} value={config[key]}
                    onChange={e=>{setConfig({...config,[key]:+parseFloat(e.target.value).toFixed(4)});setDirty(true);}}/>
                </div>
              ))}
            </div>
            <div className="panel">
              <div className="ph">Risk Thresholds</div>
              <div style={{fontSize:10,color:"var(--t3)",marginBottom:18,lineHeight:1.7}}>Adjust sensitivity without retraining. Lower thresholds flag more containers.</div>
              {[
                ["Critical Threshold — P(Critical)","risk_threshold_critical",0.1,0.9,0.05],
                ["Low Risk Threshold — P(not-clear)","risk_threshold_low",0.05,0.5,0.05],
              ].map(([lbl,key,mn,mx,st])=>(
                <div key={key} className="sld-row">
                  <div className="sld-hd"><span className="sld-l">{lbl}</span><span className="sld-v">{(config[key]*100).toFixed(0)}%</span></div>
                  <input type="range" className="cfg-slider" min={mn} max={mx} step={st} value={config[key]}
                    onChange={e=>{setConfig({...config,[key]:+parseFloat(e.target.value).toFixed(2)});setDirty(true);}}/>
                </div>
              ))}
              <div style={{marginTop:24,display:"flex",gap:10}}>
                <button className="btn btn-dark" style={{flex:1}} disabled={!dirty||saving} onClick={saveConfig}>{saving?<><SpinIcon/>Saving...</>:"Save Config"}</button>
                <button className="btn btn-ghost" onClick={retrain}>↻ Retrain Now</button>
                <button className="btn btn-ghost" onClick={async()=>{const c=await api("/model-config",{},token);setConfig(c);setDirty(false);}}>Reset</button>
              </div>
            </div>
          </div>
        ) : <div className="empty"><div className="empty-hd">{isTraining?"Training...":"Loading config"}</div></div>
      )}

      {/* ── AI RECOMMENDATIONS ── */}
      {tab==="ai" && (
        <div className="g2">
          <div className="panel">
            <div className="ph">Ask AI for Model Recommendations</div>
            <div style={{fontSize:11,color:"var(--t2)",marginBottom:14,lineHeight:1.7}}>
              Describe a problem you're seeing — false positives, missed detections, threshold uncertainty — and get actionable suggestions based on current model metrics.
            </div>
            <div className="inp-row" style={{marginBottom:14}}>
              <textarea className="inp" style={{flex:1,minHeight:80,resize:"vertical",fontFamily:"var(--sans)"}}
                placeholder="e.g. We're getting too many false positives from Chinese importers. How should we adjust?"
                value={aiInput} onChange={e=>setAiInput(e.target.value)}/>
            </div>
            <button className="btn btn-dark" disabled={aiLoad||!aiInput.trim()} onClick={askAI}>
              {aiLoad?<><SpinIcon/>Thinking...</>:"Get Recommendations"}
            </button>
            {aiResp && (
              <div className="ai-box fade">
                {aiResp.split("\n").filter(Boolean).map((line,i)=>(
                  <div key={i} className="ai-suggest">{line}</div>
                ))}
              </div>
            )}
          </div>
          <div className="panel">
            <div className="ph">Current Model Context</div>
            {metrics ? (
              <>
                <div className="stat-row"><span className="stat-l">Critical Recall</span><span className="stat-v">{(metrics.critical_recall*100).toFixed(1)}%</span></div>
                <div className="stat-row"><span className="stat-l">Critical Precision</span><span className="stat-v">{(metrics.critical_precision*100).toFixed(1)}%</span></div>
                <div className="stat-row"><span className="stat-l">Macro F1</span><span className="stat-v">{(metrics.macro_f1*100).toFixed(1)}%</span></div>
                <div className="stat-row"><span className="stat-l">AUC</span><span className="stat-v">{(metrics.auc*100).toFixed(1)}%</span></div>
                <div className="stat-row"><span className="stat-l">Validation Rows</span><span className="stat-v">{metrics.val_size?.toLocaleString()}</span></div>
                <div className="stat-row"><span className="stat-l">Training Rows</span><span className="stat-v">{metrics.train_size?.toLocaleString()}</span></div>
                <div style={{marginTop:16}}><div className="ph">Top Features</div>
                  {feats.slice(0,6).map(f=>(
                    <div key={f.feature} className="fb"><div className="fb-h"><span className="fb-n">{f.feature}</span><span className="fb-p">{(f.importance*100).toFixed(1)}%</span></div><div className="fb-bg"><div className="fb-fl" style={{width:`${(f.importance/maxFeat)*100}%`}}/></div></div>
                  ))}
                </div>
              </>
            ) : <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--t3)",padding:"20px 0"}}>Train model to see metrics here.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════════════════════ */
export default function App() {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);
  const [status,setStatus]= useState(null);

  // Poll model status for header pill
  useEffect(()=>{
    if(!token) return;
    const poll=async()=>{try{setStatus(await api("/status",{},token));}catch{}};
    poll(); const t=setInterval(poll,4000); return()=>clearInterval(t);
  },[token]);

  const handleLogin = (u, t) => { setUser(u); setToken(t); };
  const handleLogout= () => {
    if(token) api("/auth/logout",{method:"POST"},token).catch(()=>{});
    setUser(null); setToken(null); setStatus(null);
  };

  const trainSt   = status?.train_status;
  const isTraining= trainSt?.state==="training"||trainSt?.state==="retraining";
  const isReady   = status?.model_trained;

  const statusPill = isTraining
    ? <div className="pill warn"><div className="s-dot pulse"/>Training</div>
    : isReady ? <div className="pill dark"><div className="s-dot"/>Model Ready</div>
    : token ? <div className="pill"><div className="s-dot"/>Connecting...</div>
    : null;

  return (
    <div className="app">
      <style>{css}</style>
      {!user ? (
        <LoginScreen onLogin={handleLogin}/>
      ) : (
        <>
          <Header user={user} token={token} onLogout={handleLogout} statusPill={statusPill}/>
          <div className="layout">
            <div className="sidebar">
              {user.role==="supervisor" && <><div className="nav-i on">📊</div><div className="nav-i">📋</div><div className="nav-i">🗺️</div><div className="nav-sep"/><div className="nav-i">⬇️</div></>}
              {user.role==="customs_officer" && <><div className="nav-i on">📋</div><div className="nav-i">🔎</div><div className="nav-i">📦</div><div className="nav-sep"/><div className="nav-i">✅</div></>}
              {user.role==="risk_analyst" && <><div className="nav-i on">📈</div><div className="nav-i">⚙️</div><div className="nav-i">🤖</div><div className="nav-sep"/><div className="nav-i">📊</div></>}
            </div>
            <div className="content">
              {user.role==="supervisor"      && <SupervisorDashboard token={token}/>}
              {user.role==="customs_officer" && <OfficerDashboard user={user} token={token}/>}
              {user.role==="risk_analyst"    && <AnalystDashboard token={token}/>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}