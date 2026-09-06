import { readFile, writeFile, mkdir } from 'node:fs/promises';

const API_BASE = 'https://api.football-data.org/v4';
const COMPETITION = 'PL';
const ARSENAL_ID = 57;
const DATA_FILE = 'data/football.json';
const TIME_ZONE = 'Asia/Singapore';
const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

if (!API_TOKEN) {
  console.error('ERROR: FOOTBALL_DATA_TOKEN is not available.');
  process.exit(1);
}

async function apiRequest(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'X-Auth-Token': API_TOKEN }
  });
  if (!response.ok) {
    throw new Error(`Football API error ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function readExistingData() {
  try { return JSON.parse(await readFile(DATA_FILE, 'utf8')); }
  catch { return { squadWatch: [] }; }
}

function shortenTeamName(name = '') {
  const replacements = {
    'Arsenal FC':'Arsenal','Aston Villa FC':'Aston Villa','AFC Bournemouth':'Bournemouth',
    'Brentford FC':'Brentford','Brighton & Hove Albion FC':'Brighton','Chelsea FC':'Chelsea',
    'Coventry City FC':'Coventry','Crystal Palace FC':'Crystal Palace','Everton FC':'Everton',
    'Fulham FC':'Fulham','Hull City AFC':'Hull City','Ipswich Town FC':'Ipswich',
    'Leeds United FC':'Leeds','Liverpool FC':'Liverpool','Manchester City FC':'Man City',
    'Manchester United FC':'Man United','Newcastle United FC':'Newcastle',
    'Nottingham Forest FC':"Nott'm Forest",'Sunderland AFC':'Sunderland',
    'Tottenham Hotspur FC':'Tottenham','West Ham United FC':'West Ham',
    'Wolverhampton Wanderers FC':'Wolves'
  };
  return replacements[name] || name.replace(/\s+Football Club$/i,'').replace(/\s+AFC$/i,'').replace(/\s+FC$/i,'');
}

function formatParts(utcDate) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false
  }).formatToParts(new Date(utcDate));
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}

const MONTHS = {'01':'JAN','02':'FEB','03':'MAR','04':'APR','05':'MAY','06':'JUN','07':'JUL','08':'AUG','09':'SEP','10':'OCT','11':'NOV','12':'DEC'};
function formatFixtureDate(utcDate) { const p=formatParts(utcDate); return `${p.day} ${MONTHS[p.month]}`; }
function formatFixtureTime(utcDate) { const p=formatParts(utcDate); return `${p.hour}:${p.minute} SGT`; }
function getUpdatedTime() { const p=formatParts(new Date()); return `${p.day} ${MONTHS[p.month]} ${p.hour}:${p.minute} SGT`; }

async function getStandings() {
  const data = await apiRequest(`/competitions/${COMPETITION}/standings`);
  const table = data.standings?.find(s => s.type === 'TOTAL')?.table;
  if (!Array.isArray(table)) throw new Error('Premier League standings were not found.');
  const seasonNotStarted = table.every(row => Number(row.playedGames) === 0);
  return table.map(row => ({
    pos: seasonNotStarted ? '-' : row.position,
    team: shortenTeamName(row.team.name), played: row.playedGames ?? 0,
    won: row.won ?? 0, draw: row.draw ?? 0, lost: row.lost ?? 0,
    gf: row.goalsFor ?? 0, ga: row.goalsAgainst ?? 0,
    gd: row.goalDifference ?? 0, pts: row.points ?? 0
  }));
}

async function getFixtures() {
  const data = await apiRequest(`/teams/${ARSENAL_ID}/matches?status=SCHEDULED`);
  const matches = (data.matches || []).filter(m => m.competition?.code === COMPETITION)
    .sort((a,b) => new Date(a.utcDate)-new Date(b.utcDate)).slice(0,4);
  return matches.map(m => ({
    date: formatFixtureDate(m.utcDate),
    home: shortenTeamName(m.homeTeam.name).toUpperCase(),
    away: shortenTeamName(m.awayTeam.name).toUpperCase(),
    time: formatFixtureTime(m.utcDate), utcDate: m.utcDate
  }));
}

async function getRecentResults() {
  const data = await apiRequest(`/teams/${ARSENAL_ID}/matches?status=FINISHED`);
  const matches = (data.matches || []).filter(m => m.competition?.code === COMPETITION)
    .sort((a,b) => new Date(b.utcDate)-new Date(a.utcDate)).slice(0,5);
  return matches.map(m => {
    const home = shortenTeamName(m.homeTeam.name);
    const away = shortenTeamName(m.awayTeam.name);
    const hs = m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? 0;
    const as = m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? 0;
    const arsenalHome = home.toLowerCase() === 'arsenal';
    const arsenalGoals = arsenalHome ? hs : as;
    const oppGoals = arsenalHome ? as : hs;
    return {
      date: formatFixtureDate(m.utcDate), home: home.toUpperCase(), away: away.toUpperCase(),
      homeScore: hs, awayScore: as,
      outcome: arsenalGoals > oppGoals ? 'W' : arsenalGoals < oppGoals ? 'L' : 'D'
    };
  });
}

async function updateFootballData() {
  const existing = await readExistingData();
  const [standings, fixtures, results] = await Promise.all([getStandings(), getFixtures(), getRecentResults()]);
  const newData = {
    updated: getUpdatedTime(), fixtures, results, form: results.map(r => r.outcome).reverse(), standings,
    squadWatch: existing.squadWatch || []
  };
  await mkdir('data', { recursive:true });
  await writeFile(DATA_FILE, JSON.stringify(newData, null, 2) + '\n', 'utf8');
  console.log(`football.json updated: ${standings.length} teams, ${fixtures.length} fixtures, ${results.length} results.`);
}

updateFootballData().catch(error => { console.error('Football update failed:', error); process.exit(1); });
