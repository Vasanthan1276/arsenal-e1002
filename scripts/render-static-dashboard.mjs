import fs from 'node:fs/promises';

const football = JSON.parse(await fs.readFile('data/football.json','utf8'));
const fantasy = JSON.parse(await fs.readFile('data/fantasy.json','utf8'));
const esc = (v='') => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const signed = v => Number(v) > 0 ? `+${v}` : String(v ?? 0);
const score = v => v === null || v === undefined ? '—' : String(v);

const standings = Array.isArray(football.standings) ? football.standings : [];
const arsenalIndex = standings.findIndex(t => String(t.team).toLowerCase() === 'arsenal');
const arsenal = arsenalIndex >= 0 ? standings[arsenalIndex] : {};
const pickIndexes = new Set();
for (let i=0;i<Math.min(6,standings.length);i++) pickIndexes.add(i);
if (arsenalIndex >= 0) for (let i=Math.max(0,arsenalIndex-1); i<=Math.min(standings.length-1,arsenalIndex+1); i++) pickIndexes.add(i);
let tableRows = [...pickIndexes].sort((a,b)=>a-b).map(i=>standings[i]);
if (tableRows.length > 8) tableRows = tableRows.slice(0,8);

const fixtures = Array.isArray(football.fixtures) ? football.fixtures : [];
const next = fixtures[0] || {};
const isHome = String(next.home || '').includes('ARSENAL');
const opponent = isHome ? next.away : next.home;
const form = (football.form || []).slice(-5);
const results = Array.isArray(football.results) ? football.results : [];
const last = results[0];
const watch = Array.isArray(football.squadWatch) ? football.squadWatch.slice(0,4) : [];

const formHtml = form.length ? form.map(x => `<span class="form ${x}">${esc(x)}</span>`).join('') : '<span class="muted">—</span>';
const upcomingHtml = fixtures.slice(1,4).map(f => {
  const home = String(f.home || '').includes('ARSENAL');
  const opp = home ? f.away : f.home;
  return `<div class="up-row"><b>${esc(f.date)}</b><span>${home ? 'vs' : '@'} ${esc(opp)}</span><b>${esc((f.time || '').replace(' SGT',''))}</b></div>`;
}).join('') || '<div class="empty">No upcoming fixtures</div>';
const watchHtml = watch.map(w => `<div class="watch-row"><span class="tag ${String(w.type).toLowerCase()}">${esc(w.type)}</span><b>${esc(w.player)}</b><span>${esc(w.status)}</span></div>`).join('') || '<div class="empty">No squad alerts</div>';
const tableHtml = tableRows.map(t => `<div class="league-row ${String(t.team).toLowerCase()==='arsenal'?'arsenal-row':''}"><span>${esc(t.pos)}</span><b>${esc(t.team)}</b><span>${esc(t.played)}</span><span>${esc(signed(t.gd))}</span><strong>${esc(t.pts)}</strong></div>`).join('');

const fteams = [fantasy.main, fantasy.draft?.d1, fantasy.draft?.d2, fantasy.challenge?.c1].filter(Boolean);
const fstrip = fteams.map(t => `<div class="f-tile"><span>${esc(t.name.replace('Golden Eagles ','GE '))}</span><b>${score(t.gameweekPoints)}</b><small>GW pts</small></div>`).join('');

const lastResult = last ? `${esc(last.home)} ${score(last.homeScore)}–${score(last.awayScore)} ${esc(last.away)}` : 'No result loaded';

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=800,height=480,initial-scale=1"><title>Arsenal E1002 Hub</title><style>
*{box-sizing:border-box}html,body{margin:0;width:800px;height:480px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111}.page{width:800px;height:480px;display:grid;grid-template-rows:48px 388px 44px;border:2px solid #111}.top{background:#d90012;color:#fff;display:grid;grid-template-columns:1fr auto auto;align-items:center;padding:0 12px;border-bottom:2px solid #111}.brand{font-size:24px;font-weight:900;letter-spacing:.6px}.season{font-size:11px;font-weight:900;padding-right:15px}.updated{font-size:9px;font-weight:800}.content{display:grid;grid-template-columns:478px 318px}.left{border-right:2px solid #111;display:grid;grid-template-rows:166px 92px 130px}.hero{padding:8px 12px;border-bottom:2px solid #111}.eyebrow{font-size:10px;font-weight:900;letter-spacing:1px;color:#d90012}.hero-main{display:grid;grid-template-columns:1fr 122px;align-items:center;height:84px}.match{font-size:28px;font-weight:900;line-height:1.02}.match small{display:block;font-size:12px;margin-bottom:5px;color:#444}.kickoff{text-align:center;border:2px solid #111;padding:8px 4px}.kickoff b{display:block;font-size:18px}.kickoff span{font-size:10px;font-weight:900}.hero-foot{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}.form-wrap{font-size:10px;font-weight:900}.form{display:inline-flex;width:23px;height:23px;align-items:center;justify-content:center;margin-left:4px;border:2px solid #111;font-size:11px}.form.W{background:#00a651;color:#fff}.form.D{background:#ffd400}.form.L{background:#d90012;color:#fff}.last{font-size:9px;text-align:right}.section{padding:5px 10px;border-bottom:2px solid #111}.section-title{font-size:11px;font-weight:900;letter-spacing:.7px;margin-bottom:4px}.up-row{height:21px;display:grid;grid-template-columns:60px 1fr 48px;align-items:center;border-top:1px solid #bbb;font-size:10px}.up-row b:last-child{text-align:right}.squad{padding:5px 10px}.watch-row{height:24px;display:grid;grid-template-columns:58px 130px 1fr;align-items:center;border-top:1px solid #ccc;font-size:9.5px}.tag{font-size:7px;font-weight:900;border:1px solid #111;padding:2px 3px;width:max-content}.tag.injury,.tag.suspend{background:#ffd400}.tag.transfer{background:#0067c5;color:#fff}.right{padding:8px 8px 5px}.league-title{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid #111;padding-bottom:6px}.league-title b{font-size:18px}.league-title span{font-size:9px;font-weight:900}.ars-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:7px 0}.stat{border:2px solid #111;text-align:center;padding:4px}.stat b{display:block;font-size:20px;color:#d90012}.stat small{font-size:7px;font-weight:900}.league-head,.league-row{display:grid;grid-template-columns:28px 1fr 30px 36px 36px;align-items:center}.league-head{height:22px;font-size:7.5px;font-weight:900;border-top:2px solid #111;border-bottom:2px solid #111}.league-row{height:31px;font-size:10px;border-bottom:1px solid #bbb}.league-row span,.league-row strong{text-align:center}.league-row.arsenal-row{border:2px solid #d90012;color:#d90012;font-weight:900}.bottom{border-top:2px solid #111;display:grid;grid-template-columns:92px 1fr;align-items:center;padding:3px 8px}.bottom-title{font-size:10px;font-weight:900;color:#d90012}.fantasy-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.f-tile{height:34px;border:1.5px solid #111;display:grid;grid-template-columns:1fr 32px;grid-template-rows:17px 12px;align-items:center;padding:1px 5px}.f-tile span{font-size:8px;font-weight:900}.f-tile b{font-size:15px;text-align:right;color:#0067c5}.f-tile small{grid-column:1/-1;font-size:6.5px}.empty,.muted{color:#777;font-size:9px}</style></head><body><div class="page">
<div class="top"><div class="brand">ARSENAL</div><div class="season">PREMIER LEAGUE 2026/27</div><div class="updated">${esc(football.updated || '')}</div></div>
<div class="content"><div class="left">
<section class="hero"><div class="eyebrow">NEXT MATCH • ${isHome?'HOME':'AWAY'}</div><div class="hero-main"><div class="match"><small>${isHome?'ARSENAL vs':'ARSENAL @'}</small>${esc(opponent || 'TBC')}</div><div class="kickoff"><b>${esc(next.date || 'TBC')}</b><span>${esc(next.time || 'TBC')}</span></div></div><div class="hero-foot"><div class="form-wrap">FORM ${formHtml}</div><div class="last"><b>LAST:</b> ${lastResult}</div></div></section>
<section class="section"><div class="section-title">UPCOMING</div>${upcomingHtml}</section>
<section class="squad"><div class="section-title">SQUAD WATCH</div>${watchHtml}</section>
</div><aside class="right"><div class="league-title"><b>LEAGUE TABLE</b><span>ARSENAL FOCUS</span></div><div class="ars-summary"><div class="stat"><b>${score(arsenal.pos)}</b><small>POSITION</small></div><div class="stat"><b>${score(arsenal.pts)}</b><small>POINTS</small></div><div class="stat"><b>${signed(arsenal.gd ?? 0)}</b><small>GOAL DIFF</small></div></div><div class="league-head"><span>#</span><span>TEAM</span><span>P</span><span>GD</span><span>PTS</span></div>${tableHtml}</aside></div>
<div class="bottom"><div class="bottom-title">FANTASY HUB</div><div class="fantasy-strip">${fstrip}</div></div>
</div></body></html>`;
await fs.writeFile('index.html',html,'utf8');
console.log('Generated E1002 dashboard: index.html');
