import { readFile, writeFile } from 'node:fs/promises';

const FOOTBALL_FILE = 'data/football.json';
const FPL_API = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const TRANSFER_RSS_URL = 'https://news.google.com/rss/search?q=Arsenal+transfer+when:7d&hl=en-GB&gl=GB&ceid=GB:en';

async function getJson(url) {
  const r = await fetch(url, { headers:{'User-Agent':'Arsenal-E1002-Dashboard','Accept':'application/json'} });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers:{'User-Agent':'Arsenal-E1002-Dashboard','Accept':'*/*'} });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}
function shortName(p) {
  const full = `${p.first_name || ''} ${p.second_name || ''}`.trim() || p.web_name || 'Unknown';
  return full.length <= 20 ? full : `${full.split(' ')[0][0]}. ${full.split(' ').at(-1)}`;
}
function injuryStatus(p) {
  const text = String(p.news || '').replace(/\s*-\s*Expected back.*$/i,'').replace(/\s*-\s*Unknown return date.*$/i,'').trim();
  return text || ({i:'Injured',d:'Doubtful',s:'Suspended',u:'Unavailable'}[p.status] || 'Availability concern');
}
function buildInjuries(fpl) {
  const arsenal = (fpl.teams || []).find(t => t.name === 'Arsenal' || t.short_name === 'ARS');
  if (!arsenal) return [];
  return (fpl.elements || []).filter(p => p.team === arsenal.id).filter(p =>
    ['i','d','s','u'].includes(p.status) || (typeof p.chance_of_playing_next_round === 'number' && p.chance_of_playing_next_round < 100)
  ).sort((a,b) => (a.chance_of_playing_next_round ?? 100) - (b.chance_of_playing_next_round ?? 100)).slice(0,3)
  .map(p => ({ type:p.status === 's' ? 'SUSPEND':'INJURY', player:shortName(p), status:injuryStatus(p).slice(0,28) }));
}
function decode(s='') { return s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }
function rssItems(xml) { return [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi)].map(m => ({title:decode(m[1]),description:decode(m[2])})); }
function transferItem(xml) {
  const article = rssItems(xml).find(a => /arsenal/i.test(a.title) && /(bid|offer|target|linked|talks|sign|deal|medical)/i.test(`${a.title} ${a.description}`) && !/women|academy|u21/i.test(a.title));
  if (!article) return null;
  const text = article.title.replace(/\s+-\s+[^-]+$/,'');
  const patterns = [/(?:for|target(?:ing)?|linked (?:with|to)|sign(?:ing)?|talks (?:with|for))\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+)/i,/([A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+)\s+(?:to Arsenal|linked (?:with|to) Arsenal)/i];
  let player = null; for (const p of patterns) { const m=text.match(p); if (m?.[1]) { player=m[1]; break; } }
  if (!player) return null;
  const lower = `${article.title} ${article.description}`.toLowerCase();
  const status = lower.includes('medical') ? 'Medical reported' : lower.includes('deal agreed') ? 'Deal reportedly agreed' : lower.includes('bid') || lower.includes('offer') ? 'Bid reported' : lower.includes('talks') ? 'Talks reported' : lower.includes('target') ? 'Reported target' : 'Arsenal linked';
  return { type:'TRANSFER', player, status };
}

async function main() {
  const football = JSON.parse(await readFile(FOOTBALL_FILE,'utf8'));
  let injuries = [], transfer = null;
  try { injuries = buildInjuries(await getJson(FPL_API)); } catch (e) { console.warn('FPL squad watch unavailable:', e.message); }
  try { transfer = transferItem(await getText(TRANSFER_RSS_URL)); } catch (e) { console.warn('Transfer RSS unavailable:', e.message); }
  const next = [...injuries]; if (transfer && next.length < 4) next.push(transfer);
  if (next.length) football.squadWatch = next.slice(0,4);
  await writeFile(FOOTBALL_FILE, JSON.stringify(football,null,2)+'\n','utf8');
  console.log('Squad Watch complete.');
}
main().catch(e => { console.error(e); process.exit(1); });
