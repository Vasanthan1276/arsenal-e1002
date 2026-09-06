import fs from 'node:fs/promises';

const football = JSON.parse(await fs.readFile('data/football.json', 'utf8'));

// SenseCraft-safe escaping: keep the generated HTML ASCII-only.
function esc(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/[^\x00-\x7F]/g, ch => `&#${ch.codePointAt(0)};`);
}

const signed = value => Number(value) > 0 ? `+${value}` : String(value ?? 0);
const fixtures = Array.isArray(football.fixtures) ? football.fixtures.slice(0, 4) : [];
const standings = Array.isArray(football.standings) ? football.standings : [];
const watch = Array.isArray(football.squadWatch) ? football.squadWatch.slice(0, 4) : [];

const fixtureHtml = fixtures.map(f => {
  const homeArsenal = String(f.home || '').toUpperCase() === 'ARSENAL';
  const awayArsenal = String(f.away || '').toUpperCase() === 'ARSENAL';
  const home = homeArsenal ? '<span class="arsenal">ARSENAL</span>' : esc(f.home);
  const away = awayArsenal ? '<span class="arsenal">ARSENAL</span>' : esc(f.away);
  return `
<div class="fixture">
  <div class="fixture-date">${esc(f.date)}</div>
  <div class="fixture-match">
    ${home}
    <br>
    ${away}
  </div>
  <div class="fixture-info">
    <div class="fixture-time">${esc(f.time)}</div>
  </div>
</div>`;
}).join('\n');

const watchHtml = watch.map(w => `
<div class="watch-item">
  <div class="watch-type">${esc(w.type)}</div>
  <div class="watch-player">${esc(w.player)}</div>
  <div class="watch-status">${esc(w.status)}</div>
</div>`).join('\n');

const tableHtml = standings.map(t => `
<div class="table-row ${String(t.team).toLowerCase() === 'arsenal' ? 'arsenal-row' : ''}">
  <div>${esc(t.pos)}</div>
  <div class="team">${esc(t.team)}</div>
  <div>${esc(t.played)}</div>
  <div>${esc(t.won)}</div>
  <div>${esc(t.draw)}</div>
  <div>${esc(t.lost)}</div>
  <div>${esc(t.gf)}</div>
  <div>${esc(t.ga)}</div>
  <div>${esc(signed(t.gd))}</div>
  <div>${esc(t.pts)}</div>
</div>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
>

<title>Arsenal Dashboard</title>

<style>

* {
  box-sizing: border-box;
}

html,
body {
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
  display: grid;
  grid-template-columns: 410px 390px;
  border: 2px solid #000000;
}

.left {
  height: 476px;
  display: grid;
  grid-template-rows: 40px 280px 156px;
  border-right: 2px solid #000000;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 9px;
  border-bottom: 2px solid #000000;
}

.title {
  font-size: 19px;
  font-weight: 900;
}

.updated {
  font-size: 9px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}

.fixtures {
  padding: 7px 8px 4px 8px;
  overflow: hidden;
}

.section-title {
  height: 27px;
  display: flex;
  align-items: flex-start;
  font-size: 14px;
  font-weight: 900;
  border-bottom: 2px solid #000000;
}

.fixture {
  height: 59px;
  display: grid;
  grid-template-columns: 61px 1fr 70px;
  align-items: center;
  border-bottom: 1px solid #777777;
}

.fixture:last-child {
  border-bottom: none;
}

.fixture-date {
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
}

.fixture-match {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.22;
}

.fixture-match .arsenal {
  font-weight: 900;
}

.fixture-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
}

.fixture-time {
  font-size: 10px;
  font-weight: 900;
  white-space: nowrap;
}

.squad {
  border-top: 2px solid #000000;
  padding: 6px 8px 4px 8px;
  overflow: hidden;
}

.squad-title {
  height: 27px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #777777;
}

.squad-title h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
}

.squad-subtitle {
  margin-top: 2px;
  font-size: 8px;
  font-weight: 700;
}

.watch-item {
  display: grid;
  grid-template-columns: 60px 125px 1fr;
  height: 30px;
  align-items: center;
  border-bottom: 1px solid #bbbbbb;
}

.watch-item:last-child {
  border-bottom: none;
}

.watch-type {
  font-size: 8px;
  font-weight: 900;
}

.watch-player {
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.watch-status {
  font-size: 10px;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-panel {
  height: 476px;
  padding: 7px 6px 5px 6px;
  overflow: hidden;
}

.table-heading {
  height: 29px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #000000;
}

.table-heading h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
}

.season {
  margin-top: 2px;
  font-size: 9px;
  font-weight: 800;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 20px 20px 20px 20px 24px 24px 26px 30px;
  align-items: center;
}

.table-header {
  height: 21px;
  font-size: 8px;
  font-weight: 900;
  border-bottom: 2px solid #000000;
}

.table-row {
  height: 20px;
  font-size: 9.5px;
  border-bottom: 1px solid #dddddd;
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
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-row.arsenal-row {
  font-weight: 900;
  border-top: 2px solid #000000;
  border-bottom: 2px solid #000000;
}

.table-row.arsenal-row .team {
  font-weight: 900;
}

</style>

</head>

<body>

<div class="page">

<section class="left">

<div class="header">
<div class="title">ARSENAL</div>
<div class="updated">Updated ${esc(football.updated || '')}</div>
</div>

<div class="fixtures">
<div class="section-title">NEXT 4 FIXTURES</div>
<div>
${fixtureHtml}
</div>
</div>

<div class="squad">
<div class="squad-title">
<h2>SQUAD WATCH</h2>
<span class="squad-subtitle">Injuries &amp; Transfers</span>
</div>
<div>
${watchHtml}
</div>
</div>

</section>

<section class="table-panel">

<div class="table-heading">
<h2>PREMIER LEAGUE</h2>
<div class="season">2026/27</div>
</div>

<div class="table-header">
<div>#</div>
<div class="team">TEAM</div>
<div>P</div>
<div>W</div>
<div>D</div>
<div>L</div>
<div>GF</div>
<div>GA</div>
<div>GD</div>
<div>PTS</div>
</div>

<div>
${tableHtml}
</div>

</section>

</div>

</body>
</html>`;

await fs.writeFile('index.html', html, 'utf8');
console.log('Generated SenseCraft-proven Arsenal E1002 dashboard: index.html');
