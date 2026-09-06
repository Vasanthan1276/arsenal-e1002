import { readFile, writeFile } from 'node:fs/promises';

const CONFIG_FILE = 'config/fantasy-config.json';
const DATA_FILE = 'data/fantasy.json';
const FPL = 'https://fantasy.premierleague.com/api';
const DRAFT = 'https://draft.premierleague.com/api';
const TZ = 'Asia/Singapore';

async function getJson(url) {
  const r = await fetch(url, { headers:{'User-Agent':'Arsenal-E1002-Fantasy-Hub','Accept':'application/json'} });
  if (!r.ok) throw new Error(`${r.status} ${url}: ${await r.text()}`);
  return r.json();
}
function nowSgt() {
  return new Intl.DateTimeFormat('en-SG',{timeZone:TZ,day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).toUpperCase() + ' SGT';
}
function currentGw(bootstrap) {
  const events = bootstrap.events || [];
  return events.find(e => e.is_current)?.id || [...events].reverse().find(e => e.finished)?.id || events.find(e => e.is_next)?.id || null;
}
function maps(bootstrap) {
  const teams = new Map((bootstrap.teams || []).map(t => [t.id, t.short_name || t.name]));
  const types = new Map((bootstrap.element_types || []).map(t => [t.id, t.singular_name_short || t.singular_name || '']));
  const players = new Map((bootstrap.elements || []).map(p => [p.id, {
    id:p.id, name:p.web_name || `${p.first_name || ''} ${p.second_name || ''}`.trim(),
    position:types.get(p.element_type) || '', club:teams.get(p.team) || '', totalPoints:p.total_points ?? null
  }]));
  return {teams,types,players};
}
function livePointsMap(live) {
  return new Map((live.elements || []).map(e => [e.id, e.stats?.total_points ?? e.total_points ?? 0]));
}
function normalizeLeague(l) {
  return { id:l.id, name:l.name, rank:l.entry_rank ?? l.rank ?? null, lastRank:l.entry_last_rank ?? null, type:l.league_type ?? '' };
}

async function updateMain(cfg, fallback, bootstrap, gw) {
  if (!cfg.entryId) return fallback;
  const entryId = Number(cfg.entryId);
  const [profile, history, picks, live] = await Promise.all([
    getJson(`${FPL}/entry/${entryId}/`),
    getJson(`${FPL}/entry/${entryId}/history/`),
    gw ? getJson(`${FPL}/entry/${entryId}/event/${gw}/picks/`) : Promise.resolve({picks:[],entry_history:{}}),
    gw ? getJson(`${FPL}/event/${gw}/live/`) : Promise.resolve({elements:[]})
  ]);
  const {players: playerMap} = maps(bootstrap);
  const pointMap = livePointsMap(live);
  const playerRows = (picks.picks || []).map(p => {
    const base = playerMap.get(p.element) || {name:`Player ${p.element}`,position:'',club:''};
    const raw = pointMap.get(p.element) ?? 0;
    return {
      ...base, gwPoints:raw, contribution:raw * (p.multiplier ?? 1), starter:(p.position ?? 99) <= 11,
      benchOrder:(p.position ?? 0) > 11 ? (p.position - 11) : null,
      captain:Boolean(p.is_captain), viceCaptain:Boolean(p.is_vice_captain), multiplier:p.multiplier ?? 1
    };
  });
  const selectedLeagueIds = new Set((cfg.leagueIds || []).map(Number));
  let leagues = (profile.leagues?.classic || []).map(normalizeLeague);
  if (selectedLeagueIds.size) leagues = leagues.filter(l => selectedLeagueIds.has(Number(l.id)));
  else leagues = leagues.filter(l => l.type !== 's').slice(0,6);
  const latestHist = [...(history.current || [])].reverse().find(h => h.event === gw) || [...(history.current || [])].at(-1) || {};
  return {
    key:'main', name:cfg.name || fallback.name || 'Main FPL', format:'Classic FPL', source:'live', status:'Live FPL API',
    entryId, gameweek:gw, gameweekPoints:picks.entry_history?.points ?? profile.summary_event_points ?? latestHist.points ?? null,
    totalPoints:profile.summary_overall_points ?? latestHist.total_points ?? null,
    overallRank:profile.summary_overall_rank ?? latestHist.overall_rank ?? null,
    bank:profile.last_deadline_bank != null ? profile.last_deadline_bank / 10 : null,
    value:profile.last_deadline_value != null ? profile.last_deadline_value / 10 : null,
    activeChip:picks.active_chip || null, players:playerRows, leagues
  };
}

function findDraftStanding(details, entryId) {
  return (details.standings || []).find(r => [r.league_entry,r.entry_id,r.entry,r.id].some(v => Number(v) === Number(entryId))) || null;
}
function findDraftEntry(details, entryId) {
  return (details.league_entries || []).find(r => Number(r.entry_id ?? r.id) === Number(entryId)) || null;
}
async function updateDraftTeam(cfg, fallback, draftBootstrap, draftLive, gw) {
  if (!cfg.leagueId || !cfg.entryId) return fallback;
  const leagueId = Number(cfg.leagueId), entryId = Number(cfg.entryId);
  const [details, eventData] = await Promise.all([
    getJson(`${DRAFT}/league/${leagueId}/details`),
    gw ? getJson(`${DRAFT}/entry/${entryId}/event/${gw}`) : Promise.resolve({picks:[]})
  ]);
  const {players: playerMap} = maps(draftBootstrap);
  const points = livePointsMap(draftLive);
  const picks = eventData.picks || eventData.elements || [];
  const playerRows = picks.map((p,i) => {
    const element = p.element ?? p.id ?? p.element_id;
    const base = playerMap.get(element) || {name:`Player ${element}`,position:'',club:''};
    const raw = points.get(element) ?? p.points ?? 0;
    return {...base,gwPoints:raw,contribution:raw,starter:(p.position ?? i+1) <= 11,benchOrder:(p.position ?? i+1) > 11 ? (p.position ?? i+1)-11 : null};
  });
  const row = findDraftStanding(details, entryId);
  const entry = findDraftEntry(details, entryId);
  const standings = (details.standings || []).slice(0,12).map(r => {
    const le = (details.league_entries || []).find(e => Number(e.id ?? e.entry_id) === Number(r.league_entry ?? r.entry_id ?? r.entry));
    return {
      rank:r.rank ?? r.position ?? null,
      name:le?.entry_name || le?.player_first_name || `Entry ${r.league_entry ?? r.entry_id ?? ''}`,
      points:r.total ?? r.points ?? r.points_for ?? null
    };
  });
  return {
    key:cfg.key, name:cfg.name, format:cfg.format || 'FPL Draft', scoring:cfg.scoring || '', source:'live', status:'Live Draft API',
    leagueId, entryId, gameweek:gw, entryName:entry?.entry_name || fallback.entryName || null,
    gameweekPoints:eventData.entry_history?.points ?? eventData.points ?? null,
    totalPoints:row?.total ?? row?.points_for ?? row?.points ?? null,
    leagueRank:row?.rank ?? row?.position ?? null,
    players:playerRows.length ? playerRows : fallback.players, standings
  };
}

async function updateChallenge(cfg, fallback) {
  if (!cfg?.sourceUrl) return fallback;
  const data = await getJson(cfg.sourceUrl);
  return {...fallback, ...data, key:cfg.key || 'c1', name:cfg.name || fallback.name, format:cfg.format || 'FPL Challenge', source:'live', status:'Configured Challenge JSON source'};
}

async function main() {
  const [cfg, existing] = await Promise.all([
    readFile(CONFIG_FILE,'utf8').then(JSON.parse), readFile(DATA_FILE,'utf8').then(JSON.parse)
  ]);
  const anyClassic = Boolean(cfg.main?.entryId);
  const anyDraft = (cfg.draft || []).some(d => d.leagueId && d.entryId);
  let gw = existing.gameweek || null;
  let classicBootstrap = null, draftBootstrap = null, draftLive = {elements:[]};

  if (anyClassic || anyDraft) {
    classicBootstrap = await getJson(`${FPL}/bootstrap-static/`);
    gw = currentGw(classicBootstrap);
  }
  if (anyDraft) {
    draftBootstrap = await getJson(`${DRAFT}/bootstrap-static`);
    draftLive = gw ? await getJson(`${DRAFT}/event/${gw}/live`) : {elements:[]};
  }

  const output = structuredClone(existing);
  output.gameweek = gw;
  if (anyClassic) output.main = await updateMain(cfg.main, existing.main, classicBootstrap, gw);

  for (const dcfg of (cfg.draft || [])) {
    const old = existing.draft?.[dcfg.key] || {key:dcfg.key,name:dcfg.name,players:[],standings:[]};
    output.draft ||= {};
    output.draft[dcfg.key] = (dcfg.leagueId && dcfg.entryId)
      ? await updateDraftTeam(dcfg, old, draftBootstrap, draftLive, gw)
      : old;
  }
  output.challenge ||= {};
  output.challenge[cfg.challenge?.key || 'c1'] = await updateChallenge(cfg.challenge, existing.challenge?.[cfg.challenge?.key || 'c1'] || {});
  if (anyClassic || anyDraft || cfg.challenge?.sourceUrl) output.updated = nowSgt();
  await writeFile(DATA_FILE, JSON.stringify(output,null,2)+'\n','utf8');
  console.log(`Fantasy update complete. GW=${gw ?? 'fallback'}; classic=${anyClassic}; draft=${anyDraft}.`);
}

main().catch(e => { console.error('Fantasy update failed:', e); process.exit(1); });
