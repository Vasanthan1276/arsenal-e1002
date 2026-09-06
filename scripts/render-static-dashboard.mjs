import fs from 'node:fs/promises';

const football = JSON.parse(await fs.readFile('data/football.json', 'utf8'));
const fantasy = JSON.parse(await fs.readFile('data/fantasy.json', 'utf8'));

const esc = (v = '') => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const score = (v) => (v === null || v === undefined ? '—' : String(v));
const signed = (v) => Number(v) > 0 ? `+${v}` : String(v ?? 0);

const standings = Array.isArray(football.standings) ? football.standings : [];
const arsenalIndex = standings.findIndex((t) => String(t.team).toLowerCase() === 'arsenal');
const arsenal = arsenalIndex >= 0 ? standings[arsenalIndex] : {};

const rows = [];
for (let i = 0; i < Math.min(8, standings.length); i += 1) rows.push(standings[i]);
if (arsenalIndex >= 8 && standings[arsenalIndex]) rows[7] = standings[arsenalIndex];

const fixtures = Array.isArray(football.fixtures) ? football.fixtures : [];
const next = fixtures[0] || {};
const isHome = String(next.home || '').toUpperCase().includes('ARSENAL');
const opponent = isHome ? next.away : next.home;
const results = Array.isArray(football.results) ? football.results : [];
const last = results[0];
const form = Array.isArray(football.form) ? football.form.slice(-5) : [];
const watch = Array.isArray(football.squadWatch) ? football.squadWatch.slice(0, 4) : [];

const formHtml = form.length
  ? form.map((x) => `<span class="form form-${esc(x)}">${esc(x)}</span>`).join('\n')
  : '<span class="muted">—</span>';

const upcomingHtml = fixtures.slice(1, 4).map((f) => {
  const home = String(f.home || '').toUpperCase().includes('ARSENAL');
  const opp = home ? f.away : f.home;
  return `
<div class="up-row">
  <div class="up-date">${esc(f.date)}</div>
  <div class="up-match">${home ? 'vs' : '@'} ${esc(opp)}</div>
  <div class="up-time">${esc(String(f.time || '').replace(' SGT', ''))}</div>
</div>`;
}).join('\n') || '<div class="muted">No upcoming fixtures</div>';

const watchHtml = watch.map((w) => {
  const type = String(w.type || '').toUpperCase();
  const cls = type === 'TRANSFER' ? 'transfer' : 'injury';
  return `
<div class="watch-row">
  <div class="watch-type ${cls}">${esc(type)}</div>
  <div class="watch-player">${esc(w.player)}</div>
  <div class="watch-status">${esc(w.status)}</div>
</div>`;
}).join('\n') || '<div class="muted">No squad alerts</div>';

const tableHtml = rows.map((t) => `
<div class="table-row ${String(t.team).toLowerCase() === 'arsenal' ? 'arsenal-row' : ''}">
  <div>${esc(t.pos)}</div>
  <div class="team">${esc(t.team)}</div>
  <div>${esc(t.played)}</div>
  <div>${esc(signed(t.gd))}</div>
  <div>${esc(t.pts)}</div>
</div>`).join('\n');

const fantasyTeams = [
  { label: 'MAIN FPL', data: fantasy.main },
  { label: 'GE D1', data: fantasy.draft?.d1 },
  { label: 'GE D2', data: fantasy.draft?.d2 },
  { label: 'GE C1', data: fantasy.challenge?.c1 },
];

const fantasyHtml = fantasyTeams.map(({ label, data }) => `
<div class="fantasy-card">
  <div class="fantasy-name">${esc(label)}</div>
  <div class="fantasy-points">${score(data?.gameweekPoints)}</div>
  <div class="fantasy-label">GW pts</div>
</div>`).join('\n');

const lastResult = last
  ? `${esc(last.home)} ${score(last.homeScore)}-${score(last.awayScore)} ${esc(last.away)}`
  : 'No result loaded';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Arsenal E1002 Hub</title>
<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 800px;
  height: 480px;
  overflow: hidden;
  font-family: Arial, Helvetica, sans-serif;
  background: #ffffff;
  color: #000000;
}

.page {
  width: 800px;
  height: 480px;
  border: 2px solid #000000;
  display: grid;
  grid-template-columns: 470px 326px;
}

.left {
  height: 476px;
  border-right: 2px solid #000000;
  display: grid;
  grid-template-rows: 42px 122px 82px 118px 112px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  border-bottom: 2px solid #000000;
}

.header-title {
  font-size: 22px;
  font-weight: 900;
  color: #d90012;
}

.header-updated {
  font-size: 8px;
  font-weight: 700;
  text-align: right;
}

.hero {
  padding: 8px 10px;
  border-bottom: 2px solid #000000;
}

.eyebrow {
  font-size: 9px;
  font-weight: 900;
  color: #d90012;
  margin-bottom: 4px;
}

.hero-body {
  display: grid;
  grid-template-columns: 1fr 112px;
  height: 65px;
  align-items: center;
}

.hero-opponent small {
  display: block;
  font-size: 10px;
  font-weight: 800;
  margin-bottom: 3px;
}

.hero-opponent strong {
  display: block;
  font-size: 27px;
  line-height: 29px;
}

.kickoff {
  border: 2px solid #000000;
  text-align: center;
  padding: 7px 3px;
}

.kickoff-date {
  font-size: 17px;
  font-weight: 900;
}

.kickoff-time {
  font-size: 9px;
  font-weight: 900;
  margin-top: 3px;
}

.hero-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.form-line {
  font-size: 9px;
  font-weight: 900;
}

.form {
  display: inline-block;
  min-width: 18px;
  height: 18px;
  line-height: 16px;
  text-align: center;
  border: 1px solid #000000;
  margin-left: 3px;
  font-size: 9px;
}

.form-W { background: #00a651; color: #ffffff; }
.form-D { background: #ffd400; color: #000000; }
.form-L { background: #d90012; color: #ffffff; }

.last-result {
  font-size: 8px;
  text-align: right;
}

.upcoming {
  padding: 5px 8px;
  border-bottom: 2px solid #000000;
}

.section-title {
  font-size: 11px;
  font-weight: 900;
  height: 17px;
}

.up-row {
  display: grid;
  grid-template-columns: 56px 1fr 44px;
  align-items: center;
  height: 19px;
  border-top: 1px solid #bbbbbb;
  font-size: 9px;
}

.up-date { font-weight: 900; }
.up-time { font-weight: 900; text-align: right; }

.squad {
  padding: 5px 8px;
  border-bottom: 2px solid #000000;
}

.watch-row {
  display: grid;
  grid-template-columns: 55px 125px 1fr;
  align-items: center;
  height: 22px;
  border-top: 1px solid #cccccc;
  font-size: 9px;
}

.watch-type {
  font-size: 7px;
  font-weight: 900;
  border: 1px solid #000000;
  width: 48px;
  text-align: center;
  padding: 2px 1px;
}

.watch-type.injury { background: #ffd400; }
.watch-type.transfer { background: #0067c5; color: #ffffff; }
.watch-player { font-weight: 900; }
.watch-status { text-align: right; }

.fantasy {
  padding: 5px 8px;
}

.fantasy-grid {
  display: grid;
  grid-template-columns: 108px 108px 108px 108px;
}

.fantasy-card {
  width: 102px;
  height: 64px;
  border: 1px solid #000000;
  margin-right: 6px;
  padding: 4px 5px;
  position: relative;
}

.fantasy-name {
  font-size: 8px;
  font-weight: 900;
}

.fantasy-points {
  font-size: 22px;
  font-weight: 900;
  color: #0067c5;
  text-align: right;
  margin-top: 3px;
}

.fantasy-label {
  font-size: 7px;
  position: absolute;
  left: 5px;
  bottom: 4px;
}

.right {
  height: 476px;
  padding: 8px 7px;
}

.table-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  height: 31px;
  border-bottom: 2px solid #000000;
}

.table-title strong {
  font-size: 17px;
}

.table-title span {
  font-size: 8px;
  font-weight: 900;
  margin-top: 4px;
}

.arsenal-summary {
  display: grid;
  grid-template-columns: 100px 100px 100px;
  height: 65px;
  padding-top: 6px;
}

.stat {
  width: 95px;
  height: 53px;
  border: 2px solid #000000;
  text-align: center;
  padding-top: 5px;
}

.stat strong {
  display: block;
  font-size: 20px;
  color: #d90012;
}

.stat span {
  display: block;
  font-size: 7px;
  font-weight: 900;
  margin-top: 3px;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 28px 1fr 30px 38px 38px;
  align-items: center;
}

.table-header {
  height: 24px;
  border-top: 2px solid #000000;
  border-bottom: 2px solid #000000;
  font-size: 7px;
  font-weight: 900;
}

.table-row {
  height: 36px;
  border-bottom: 1px solid #bbbbbb;
  font-size: 10px;
}

.table-header div,
.table-row div {
  text-align: center;
}

.table-header .team,
.table-row .team {
  text-align: left;
}

.table-row .team {
  font-weight: 700;
}

.table-row.arsenal-row {
  border: 2px solid #d90012;
  color: #d90012;
  font-weight: 900;
  height: 36px;
}

.muted {
  font-size: 9px;
  color: #777777;
}
</style>
</head>
<body>
<div class="page">

<section class="left">
  <div class="header">
    <div class="header-title">ARSENAL</div>
    <div class="header-updated">${esc(football.updated || '')}</div>
  </div>

  <div class="hero">
    <div class="eyebrow">NEXT MATCH - ${isHome ? 'HOME' : 'AWAY'}</div>
    <div class="hero-body">
      <div class="hero-opponent">
        <small>${isHome ? 'ARSENAL vs' : 'ARSENAL @'}</small>
        <strong>${esc(opponent || 'TBC')}</strong>
      </div>
      <div class="kickoff">
        <div class="kickoff-date">${esc(next.date || 'TBC')}</div>
        <div class="kickoff-time">${esc(next.time || 'TBC')}</div>
      </div>
    </div>
    <div class="hero-foot">
      <div class="form-line">FORM ${formHtml}</div>
      <div class="last-result"><b>LAST:</b> ${lastResult}</div>
    </div>
  </div>

  <div class="upcoming">
    <div class="section-title">UPCOMING</div>
    ${upcomingHtml}
  </div>

  <div class="squad">
    <div class="section-title">SQUAD WATCH</div>
    ${watchHtml}
  </div>

  <div class="fantasy">
    <div class="section-title">FANTASY HUB</div>
    <div class="fantasy-grid">
      ${fantasyHtml}
    </div>
  </div>
</section>

<section class="right">
  <div class="table-title">
    <strong>LEAGUE TABLE</strong>
    <span>ARSENAL FOCUS</span>
  </div>

  <div class="arsenal-summary">
    <div class="stat"><strong>${score(arsenal.pos)}</strong><span>POSITION</span></div>
    <div class="stat"><strong>${score(arsenal.pts)}</strong><span>POINTS</span></div>
    <div class="stat"><strong>${signed(arsenal.gd ?? 0)}</strong><span>GOAL DIFF</span></div>
  </div>

  <div class="table-header">
    <div>#</div>
    <div class="team">TEAM</div>
    <div>P</div>
    <div>GD</div>
    <div>PTS</div>
  </div>

  ${tableHtml}
</section>

</div>
</body>
</html>`;

await fs.writeFile('index.html', html, 'utf8');
console.log('Generated SenseCraft-safe E1002 dashboard: index.html');
