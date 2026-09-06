import fs from 'node:fs/promises';

const football = JSON.parse(await fs.readFile('data/football.json', 'utf8'));
const fantasy = JSON.parse(await fs.readFile('data/fantasy.json', 'utf8'));

const esc = (v = '') => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const fmt = v => v === null || v === undefined || v === ''
  ? '—'
  : Number.isFinite(Number(v))
    ? Number(v).toLocaleString('en-SG')
    : esc(v);

const signed = v => Number(v) > 0 ? `+${v}` : String(v ?? 0);

const standings = Array.isArray(football.standings) ? football.standings : [];
const arsenal = standings.find(t => String(t.team).toLowerCase() === 'arsenal') || {};
const next = (football.fixtures || [])[0] || {};
const isHome = String(next.home || '').includes('ARSENAL');
const opponent = isHome ? next.away : next.home;

const main = fantasy.main || { name: 'Main FPL', players: [] };
const d1 = fantasy.draft?.d1 || { name: 'Golden Eagles D1', players: [] };
const d2 = fantasy.draft?.d2 || { name: 'Golden Eagles D2', players: [] };
const c1 = fantasy.challenge?.c1 || { name: 'Golden Eagles C1', players: [] };

function badge(team) {
  return team.source === 'live'
    ? '<span class="badge live">LIVE DATA</span>'
    : '<span class="badge fallback">FALLBACK</span>';
}

function rankInfo(team) {
  if (team.overallRank != null) return { label: 'Overall rank', value: team.overallRank };
  if (team.leagueRank != null) return { label: 'League rank', value: team.leagueRank };
  return { label: 'Rank', value: team.rank };
}

function captainOf(team) {
  return (team.players || []).find(p => p.captain) || null;
}

function bestPlayer(team) {
  const players = Array.isArray(team.players) ? team.players : [];
  if (!players.length) return null;
  return [...players].sort((a, b) => Number(b.contribution ?? b.gwPoints ?? -1) - Number(a.contribution ?? a.gwPoints ?? -1))[0] || null;
}

function standingsGap(team) {
  const rows = Array.isArray(team.standings) ? team.standings : [];
  if (!rows.length) return null;
  const mine = rows.find(r => String(r.name || '').toLowerCase() === String(team.entryName || team.name || '').toLowerCase())
    || rows.find(r => Number(r.rank) === Number(team.leagueRank));
  if (!mine) return null;

  if (team.scoring === 'Head-to-Head' && mine.leaguePoints != null) {
    const leader = [...rows].sort((a, b) => Number(b.leaguePoints ?? -1) - Number(a.leaguePoints ?? -1))[0];
    if (!leader || leader.leaguePoints == null) return null;
    const gap = Number(leader.leaguePoints) - Number(mine.leaguePoints);
    return gap <= 0 ? 'Joint/top' : `${gap} H2H pt${gap === 1 ? '' : 's'} off top`;
  }

  const leader = [...rows].sort((a, b) => Number(b.points ?? -1) - Number(a.points ?? -1))[0];
  if (!leader || leader.points == null || mine.points == null) return null;
  const gap = Number(leader.points) - Number(mine.points);
  if (gap <= 0) {
    const second = [...rows].sort((a, b) => Number(b.points ?? -1) - Number(a.points ?? -1))[1];
    if (second?.points != null) return `${Number(mine.points) - Number(second.points)} pts clear`;
    return 'Top';
  }
  return `${gap} pts off top`;
}

function summaryCard(team, key) {
  const rank = rankInfo(team);
  const extraClass = team.source === 'live' ? '' : ' fallback-card';
  const captain = captainOf(team);
  const gap = standingsGap(team);
  let highlight = '';

  if (key === 'main' && captain) {
    const chip = team.activeChip === '3xc' ? 'Triple Captain' : team.activeChip;
    highlight = `<div class="team-highlight main-highlight"><span>${chip ? esc(chip) : 'Captain'}</span><b>${esc(captain.name)} · ${fmt(captain.contribution ?? captain.gwPoints)} pts</b></div>`;
  } else if ((key === 'd1' || key === 'd2') && gap) {
    highlight = `<div class="team-highlight"><span>League position</span><b>${esc(gap)}</b></div>`;
  }

  return `<button class="team-card${extraClass}" data-tab="${key}">
    <div class="team-card-top"><div><small>${esc(team.format || '')}${team.scoring ? ` • ${esc(team.scoring)}` : ''}</small><h3>${esc(team.name)}</h3></div>${badge(team)}</div>
    <div class="metrics"><div><b>${fmt(team.gameweekPoints)}</b><span>GW points</span></div><div><b>${fmt(team.totalPoints)}</b><span>Total</span></div><div><b>${fmt(rank.value)}</b><span>${rank.label}</span></div></div>
    ${highlight}
    <p>${esc(team.status || '')}</p>
  </button>`;
}

function playerTable(team) {
  const players = Array.isArray(team.players) ? team.players : [];
  if (!players.length) return '<div class="notice">No player data available from the current source.</div>';
  const order = { GKP: 1, DEF: 2, MID: 3, FWD: 4 };
  const sorted = [...players].sort((a, b) =>
    (a.starter === false) - (b.starter === false) ||
    (order[a.position] || 9) - (order[b.position] || 9)
  );
  return `<div class="player-table"><div class="player-head"><span>Player</span><span>Pos</span><span>Club</span><span>GW</span><span>Pts</span></div>${sorted.map(p => {
    const role = p.captain ? '<em>C</em>' : p.viceCaptain ? '<em>VC</em>' : '';
    const bench = p.starter === false ? '<i>BENCH</i>' : '';
    return `<div class="player-row ${p.starter === false ? 'bench' : ''}"><span><b>${esc(p.name)}</b>${role}${bench}</span><span>${esc(p.position || '')}</span><span>${esc(p.club || '')}</span><span>${fmt(p.gwPoints)}</span><strong>${fmt(p.contribution ?? p.gwPoints)}</strong></div>`;
  }).join('')}</div>`;
}

function leagues(team) {
  const rows = Array.isArray(team.leagues) ? team.leagues : [];
  if (!rows.length) return '<div class="notice">No mini-league information is available from the current source.</div>';
  return `<div class="mini-table"><div class="mini-head"><span>League</span><span>Rank</span><span>Prev</span></div>${rows.map(l => `<div><span>${esc(l.name)}</span><b>${fmt(l.rank)}</b><span>${fmt(l.lastRank)}</span></div>`).join('')}</div>`;
}

function draftStandings(team) {
  const rows = Array.isArray(team.standings) ? team.standings : [];
  if (!rows.length) return '<div class="notice">No Draft standings are available from the current source.</div>';
  return `<div class="mini-table"><div class="mini-head"><span>Manager</span><span>Rank</span><span>${team.scoring === 'Head-to-Head' ? 'H2H' : 'Points'}</span></div>${rows.map(r => `<div class="${String(r.name || '').toLowerCase() === String(team.entryName || team.name || '').toLowerCase() ? 'mine' : ''}"><span>${esc(r.name)}</span><b>${fmt(r.rank)}</b><span>${fmt(team.scoring === 'Head-to-Head' ? r.leaguePoints : r.points)}</span></div>`).join('')}</div>`;
}

function detailExtras(team, key) {
  const captain = captainOf(team);
  const best = bestPlayer(team);
  const gap = standingsGap(team);
  const rows = [];

  if (key === 'main') {
    if (captain) rows.push(`<div><span>Captain</span><b>${esc(captain.name)}</b><small>${fmt(captain.contribution ?? captain.gwPoints)} pts contribution</small></div>`);
    if (team.activeChip) rows.push(`<div><span>Active chip</span><b>${esc(team.activeChip === '3xc' ? 'Triple Captain' : team.activeChip)}</b></div>`);
    if (team.value != null) rows.push(`<div><span>Team value</span><b>£${fmt(team.value)}m</b></div>`);
    if (team.bank != null) rows.push(`<div><span>Bank</span><b>£${fmt(team.bank)}m</b></div>`);
  } else {
    if (gap) rows.push(`<div><span>League gap</span><b>${esc(gap)}</b></div>`);
    if (best) rows.push(`<div><span>Best GW scorer</span><b>${esc(best.name)}</b><small>${fmt(best.contribution ?? best.gwPoints)} pts</small></div>`);
    if (team.leaguePoints != null) rows.push(`<div><span>League points</span><b>${fmt(team.leaguePoints)}</b></div>`);
  }

  return rows.length ? `<div class="extras">${rows.join('')}</div>` : '';
}

function detailPanel(team, key) {
  const rank = rankInfo(team);
  const challengeInfo = key === 'c1'
    ? `<div class="notice warning">C1 is currently a fallback squad because there is no verified stable public FPL Challenge API in this setup. It is deliberately shown separately from the live Main/Draft feeds.</div>`
    : '';
  return `<section class="tab-panel" id="tab-${key}">
    <div class="detail-title"><div><small>${esc(team.format || '')}${team.scoring ? ` • ${esc(team.scoring)}` : ''}</small><h2>${esc(team.name)}</h2></div>${badge(team)}</div>
    <div class="detail-metrics"><div><span>GW points</span><b>${fmt(team.gameweekPoints)}</b></div><div><span>Total points</span><b>${fmt(team.totalPoints)}</b></div><div><span>${rank.label}</span><b>${fmt(rank.value)}</b></div><div><span>Gameweek</span><b>${fmt(team.gameweek ?? fantasy.gameweek)}</b></div></div>
    ${detailExtras(team, key)}
    <div class="detail-grid"><div><h3>Players</h3>${playerTable(team)}</div><div><h3>${key === 'main' ? 'Leagues' : key === 'c1' ? 'Status' : 'League'}</h3>${key === 'main' ? leagues(team) : key === 'c1' ? challengeInfo : draftStandings(team)}</div></div>
  </section>`;
}

const watch = (football.squadWatch || []).map(w => `<div class="watch"><span class="watch-type ${String(w.type).toLowerCase()}">${esc(w.type)}</span><b>${esc(w.player)}</b><span>${esc(w.status)}</span></div>`).join('');
const fixtures = (football.fixtures || []).slice(0, 4).map(f => `<div class="fixture"><span>${esc(f.date)}</span><b>${esc(f.home)} <i>vs</i> ${esc(f.away)}</b><span>${esc(f.time)}</span></div>`).join('');
const table = standings.slice(0, 10).map(t => `<div class="pl-row ${String(t.team).toLowerCase() === 'arsenal' ? 'arsenal' : ''}"><span>${fmt(t.pos)}</span><b>${esc(t.team)}</b><span>${fmt(t.played)}</span><span>${signed(t.gd)}</span><strong>${fmt(t.pts)}</strong></div>`).join('');
const form = (football.form || []).map(x => `<span class="form ${x}">${esc(x)}</span>`).join('') || '<span>—</span>';

const mainCaptain = captainOf(main);
const mainBest = bestPlayer(main);
const d1Best = bestPlayer(d1);
const d2Best = bestPlayer(d2);
const d1Gap = standingsGap(d1);
const d2Gap = standingsGap(d2);
const mini = (main.leagues || [])[0];
const miniMovement = mini && mini.rank != null && mini.lastRank != null
  ? Number(mini.rank) < Number(mini.lastRank)
    ? `↑ ${Number(mini.lastRank) - Number(mini.rank)}`
    : Number(mini.rank) > Number(mini.lastRank)
      ? `↓ ${Number(mini.rank) - Number(mini.lastRank)}`
      : 'No change'
  : '—';
const chipLabel = main.activeChip === '3xc' ? 'Triple Captain' : (main.activeChip || 'No active chip');

const fantasySnapshot = `
<div class="snapshot-grid">
  <div class="snapshot-primary"><small>MAIN FPL</small><b>${fmt(main.overallRank)}</b><span>Overall rank</span></div>
  <div><small>MINI-LEAGUE</small><b>${mini ? `#${fmt(mini.rank)}` : '—'}</b><span>${mini ? `${esc(mini.name)} · ${esc(miniMovement)}` : 'No league data'}</span></div>
  <div><small>D1 DRAFT</small><b>#${fmt(d1.leagueRank)}</b><span>${esc(d1Gap || 'League position')}</span></div>
  <div><small>D2 DRAFT</small><b>#${fmt(d2.leagueRank)}</b><span>${esc(d2Gap || 'League position')}</span></div>
</div>
<div class="snapshot-insights">
  <div class="insight captain-insight"><small>CAPTAIN STRATEGY</small><div class="insight-main"><b>${mainCaptain ? esc(mainCaptain.name) : '—'}</b><strong>${mainCaptain ? `${fmt(mainCaptain.contribution ?? mainCaptain.gwPoints)} pts` : ''}</strong></div><span>${esc(chipLabel)}</span></div>
  <div><small>MAIN TEAM</small><div class="insight-main"><b>${main.value != null ? `£${fmt(main.value)}m` : '—'}</b><strong>${main.bank != null ? `£${fmt(main.bank)}m bank` : ''}</strong></div><span>Best GW: ${mainBest ? `${esc(mainBest.name)} · ${fmt(mainBest.contribution ?? mainBest.gwPoints)} pts` : '—'}</span></div>
  <div><small>D1 DRAFT</small><div class="insight-main"><b>${esc(d1Gap || '—')}</b><strong>${d1.leaguePoints != null ? `${fmt(d1.leaguePoints)} H2H pts` : ''}</strong></div><span>Best GW: ${d1Best ? `${esc(d1Best.name)} · ${fmt(d1Best.contribution ?? d1Best.gwPoints)} pts` : '—'}</span></div>
  <div><small>D2 DRAFT</small><div class="insight-main"><b>${esc(d2Gap || '—')}</b><strong>${d2.leagueRank != null ? `Rank #${fmt(d2.leagueRank)}` : ''}</strong></div><span>Best GW: ${d2Best ? `${esc(d2Best.name)} · ${fmt(d2Best.contribution ?? d2Best.gwPoints)} pts` : '—'}</span></div>
</div>
<div class="freshness-strip"><span>DATA FRESHNESS</span><b>Football ${esc(football.updated || '—')}</b><strong>Fantasy ${esc(fantasy.updated || '—')}</strong></div>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#d90012"><title>Arsenal + Fantasy Hub</title><style>
:root{--red:#d90012;--red2:#92000c;--navy:#111827;--blue:#0067c5;--green:#00843d;--yellow:#ffd400;--amber:#b45309;--amberbg:#fff7ed;--bg:#f3f4f6;--card:#fff;--line:#d1d5db;--text:#111827;--muted:#6b7280}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,Arial,Helvetica,sans-serif}.shell{max-width:1500px;margin:auto;padding:18px}.hero{background:linear-gradient(135deg,var(--red),var(--red2));color:white;border-radius:18px;padding:18px 22px;display:flex;justify-content:space-between;gap:20px;align-items:center;box-shadow:0 8px 24px #0002}.hero h1{margin:0;font-size:30px}.hero p{margin:4px 0 0;opacity:.9}.hero .next{text-align:right}.hero .next b{display:block;font-size:22px}.tabs{position:sticky;top:0;z-index:5;display:flex;gap:8px;overflow:auto;padding:12px 0;background:var(--bg)}.tab-btn{border:0;border-radius:999px;padding:9px 14px;font-weight:800;background:#fff;cursor:pointer;white-space:nowrap}.tab-btn.active{background:var(--navy);color:#fff}.overview-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:14px}.card{background:var(--card);border-radius:16px;padding:16px;box-shadow:0 4px 16px #0001}.arsenal-card{grid-column:span 3}.fixtures-card{grid-column:span 5}.watch-card{grid-column:span 4}.fantasy-grid{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.table-card{grid-column:span 5}.snapshot-card{grid-column:span 7}.card h2,.card h3{margin:0 0 12px}.section-sub{color:var(--muted);font-size:11px;margin:-6px 0 12px}.arsenal-big{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}.arsenal-big div,.metrics div,.detail-metrics div{border:1px solid var(--line);border-radius:12px;padding:10px}.arsenal-big b{font-size:28px;color:var(--red);display:block}.arsenal-big span,.metrics span,.detail-metrics span{font-size:11px;color:var(--muted);font-weight:700}.form{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:8px;margin-right:5px;font-weight:900}.form.W{background:var(--green);color:#fff}.form.D{background:var(--yellow)}.form.L{background:var(--red);color:#fff}.fixture,.watch,.pl-row,.player-row,.player-head,.mini-table>div{display:grid;align-items:center;border-top:1px solid var(--line);min-height:36px;gap:8px}.fixture{grid-template-columns:72px 1fr 90px}.fixture span:last-child{text-align:right}.fixture i{font-style:normal;color:var(--muted);font-weight:500}.watch{grid-template-columns:72px minmax(88px,.85fr) minmax(115px,1.35fr);gap:7px}.watch b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.watch>span:last-child{font-size:11px;line-height:1.15}.watch-type{font-size:9px;font-weight:900;padding:4px 6px;border-radius:6px;width:max-content;background:var(--yellow)}.watch-type.transfer{background:var(--blue);color:#fff}.team-card{border:0;text-align:left;background:#fff;border-radius:16px;padding:16px;box-shadow:0 4px 16px #0001;cursor:pointer;color:inherit}.team-card:hover{outline:2px solid var(--red)}.team-card.fallback-card{border:2px solid #f59e0b;background:linear-gradient(180deg,#fff,#fffaf0)}.team-card-top{display:flex;justify-content:space-between;gap:10px}.team-card h3{margin:2px 0 12px;font-size:18px}.team-card small,.detail-title small{color:var(--muted);font-weight:800}.badge{font-size:9px;font-weight:900;padding:5px 7px;border-radius:999px;height:max-content}.badge.live{background:#dcfce7;color:#166534}.badge.fallback{background:#fef3c7;color:#92400e}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.metrics b{display:block;font-size:22px}.team-highlight{margin-top:9px;padding:7px 9px;border-radius:9px;background:#f9fafb;border:1px solid var(--line);display:flex;justify-content:space-between;gap:8px;align-items:center}.team-highlight span{font-size:9px;color:var(--muted);font-weight:900;text-transform:uppercase}.team-highlight b{font-size:11px;text-align:right}.team-highlight.main-highlight{background:#fff0f1;border-color:#fecdd3;color:var(--red)}.team-card p{font-size:10px;color:var(--muted);margin:8px 0 0}.pl-head,.pl-row{grid-template-columns:35px 1fr 40px 50px 50px}.pl-head{display:grid;font-size:10px;font-weight:900;padding:7px 0;border-bottom:2px solid var(--navy)}.pl-row{padding:0 4px}.pl-row span:not(:nth-child(2)),.pl-row strong{text-align:center}.pl-row.arsenal{background:#fff0f1;color:var(--red);border:2px solid var(--red);border-radius:8px}.snapshot-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.snapshot-grid>div{border:1px solid var(--line);border-radius:12px;padding:11px;background:#fafafa}.snapshot-grid .snapshot-primary{background:#fff0f1;border-color:#fecdd3}.snapshot-grid small,.snapshot-insights small{display:block;color:var(--muted);font-size:9px;font-weight:900}.snapshot-grid b{display:block;font-size:23px;margin:3px 0}.snapshot-grid span{font-size:10px;color:var(--muted)}.snapshot-insights{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:10px}.snapshot-insights>div{border:1px solid var(--line);border-radius:12px;padding:11px;background:#fafafa;min-height:88px}.snapshot-insights .captain-insight{background:#fff0f1;border-color:#fecdd3}.insight-main{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin:5px 0 7px}.insight-main b{font-size:17px}.insight-main strong{font-size:11px;text-align:right}.snapshot-insights span{display:block;font-size:10px;color:var(--muted);line-height:1.25}.freshness-strip{margin-top:10px;border-top:1px solid var(--line);padding-top:9px;display:grid;grid-template-columns:105px 1fr 1fr;gap:10px;align-items:center;font-size:10px}.freshness-strip span{color:var(--muted);font-weight:900}.freshness-strip strong{text-align:right}.notice{background:#f9fafb;border:1px dashed var(--line);padding:12px;border-radius:10px;color:var(--muted);font-size:12px}.notice.warning{background:var(--amberbg);border-color:#fdba74;color:#9a3412}.tab-panel{display:none;background:#fff;border-radius:18px;padding:18px;box-shadow:0 4px 16px #0001}.tab-panel.active{display:block}.detail-title{display:flex;justify-content:space-between;align-items:start}.detail-title h2{margin:2px 0 14px}.detail-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}.detail-metrics b{display:block;font-size:26px}.extras{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:16px}.extras>div{background:#f9fafb;border:1px solid var(--line);border-radius:10px;padding:10px}.extras span{display:block;color:var(--muted);font-size:9px;font-weight:900}.extras b{display:block;margin-top:3px}.extras small{font-size:9px;color:var(--muted)}.detail-grid{display:grid;grid-template-columns:2fr 1fr;gap:18px}.player-head,.player-row{grid-template-columns:1fr 55px 60px 50px 50px;padding:0 7px}.player-head{font-size:10px;font-weight:900;border-bottom:2px solid var(--navy)}.player-row{font-size:12px}.player-row strong,.player-row>span:nth-last-child(-n+3){text-align:center}.player-row.bench{opacity:.58}.player-row em,.player-row i{font-size:9px;font-style:normal;font-weight:900;padding:2px 4px;border-radius:4px;margin-left:5px}.player-row em{background:var(--red);color:#fff}.player-row i{background:#e5e7eb}.mini-table>div{grid-template-columns:1fr 70px 70px;padding:0 7px;font-size:12px}.mini-table>div.mine{background:#fff0f1;color:var(--red);border-radius:7px}.mini-head{font-size:10px!important;font-weight:900;border-bottom:2px solid var(--navy)!important}.mini-table b,.mini-table span:nth-last-child(-n+2){text-align:center}@media(max-width:1050px){.arsenal-card,.fixtures-card,.watch-card,.table-card,.snapshot-card{grid-column:1/-1}.fantasy-grid{grid-template-columns:repeat(2,1fr)}.detail-grid{grid-template-columns:1fr}.snapshot-grid,.snapshot-insights{grid-template-columns:repeat(2,1fr)}}@media(max-width:650px){.shell{padding:10px}.hero{border-radius:12px;align-items:flex-start}.hero h1{font-size:23px}.hero .next b{font-size:16px}.fantasy-grid{grid-template-columns:1fr}.detail-metrics,.extras,.snapshot-grid,.snapshot-insights{grid-template-columns:repeat(2,1fr)}.player-head,.player-row{grid-template-columns:1fr 42px 45px 42px}.player-head span:nth-child(3),.player-row span:nth-child(3){display:none}.watch{grid-template-columns:70px 1fr}.watch>span:last-child{grid-column:2}.watch b{white-space:normal}.fixture{grid-template-columns:62px 1fr}.fixture span:last-child{grid-column:2;text-align:left}.freshness-strip{grid-template-columns:1fr}.freshness-strip strong{text-align:left}}
</style></head><body><div class="shell">
<header class="hero"><div><h1>ARSENAL + FANTASY HUB</h1><p>Premier League • FPL • Draft • Challenge</p></div><div class="next"><small>NEXT MATCH</small><b>Arsenal ${isHome ? 'vs' : '@'} ${esc(opponent || 'TBC')}</b><span>${esc(next.date || '')} • ${esc(next.time || '')}</span></div></header>
<nav class="tabs"><button class="tab-btn active" data-tab="overview">Overview</button><button class="tab-btn" data-tab="main">Main FPL</button><button class="tab-btn" data-tab="d1">D1 Draft</button><button class="tab-btn" data-tab="d2">D2 Draft</button><button class="tab-btn" data-tab="c1">C1 Challenge</button></nav>
<section class="tab-panel active" id="tab-overview"><div class="overview-grid">
<div class="card arsenal-card"><h2>Arsenal</h2><div>Form: ${form}</div><div class="arsenal-big"><div><b>${fmt(arsenal.pos)}</b><span>Position</span></div><div><b>${fmt(arsenal.pts)}</b><span>Points</span></div><div><b>${signed(arsenal.gd)}</b><span>Goal diff</span></div></div></div>
<div class="card fixtures-card"><h2>Fixtures</h2>${fixtures}</div>
<div class="card watch-card"><h2>Squad Watch</h2>${watch || '<div class="notice">No current alerts</div>'}</div>
<div class="fantasy-grid">${summaryCard(main, 'main')}${summaryCard(d1, 'd1')}${summaryCard(d2, 'd2')}${summaryCard(c1, 'c1')}</div>
<div class="card table-card"><h2>Premier League</h2><div class="pl-head"><span>#</span><span>Team</span><span>P</span><span>GD</span><span>Pts</span></div>${table}</div>
<div class="card snapshot-card"><h2>Fantasy Snapshot</h2><p class="section-sub">Ranks, captain and league position at a glance</p>${fantasySnapshot}</div>
</div></section>
${detailPanel(main, 'main')}${detailPanel(d1, 'd1')}${detailPanel(d2, 'd2')}${detailPanel(c1, 'c1')}
</div><script>const buttons=[...document.querySelectorAll('[data-tab]')];function show(tab){document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+tab));document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));window.scrollTo({top:0,behavior:'smooth'});}buttons.forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));</script></body></html>`;

await fs.writeFile('ha.html', html, 'utf8');
console.log('Generated improved Home Assistant dashboard: ha.html');
