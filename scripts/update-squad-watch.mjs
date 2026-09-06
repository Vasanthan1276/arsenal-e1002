import { readFile, writeFile } from 'node:fs/promises';

const FOOTBALL_FILE = 'data/football.json';
const FPL_API = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const TRANSFER_RSS_URL = 'https://news.google.com/rss/search?q=Arsenal+transfer+when:7d&hl=en-GB&gl=GB&ceid=GB:en';

const NON_AVAILABILITY_NEWS = [
  'has joined',
  'joined on loan',
  'joined permanently',
  'on loan',
  'loaned',
  'transferred',
  'transfer completed',
  'permanent transfer',
  'left the club',
  'leaves the club',
  'departed',
  'departure',
  'signed for',
  'signing for',
  'moved to',
  'move to',
  'season-long loan',
  'season long loan',
  'contract terminated',
  'released by the club'
];

async function getJson(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Arsenal-E1002-Dashboard',
      'Accept': 'application/json'
    }
  });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function getText(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Arsenal-E1002-Dashboard',
      'Accept': '*/*'
    }
  });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

function shortName(p) {
  const full =
    `${p.first_name || ''} ${p.second_name || ''}`.trim() ||
    p.web_name ||
    'Unknown';

  if (full.length <= 20) return full;
  const parts = full.split(' ');
  return `${parts[0]?.[0] || ''}. ${parts.at(-1)}`;
}

function isRealAvailabilityIssue(p) {
  const news = String(p.news || '').toLowerCase().trim();

  if (NON_AVAILABILITY_NEWS.some(phrase => news.includes(phrase))) {
    return false;
  }

  return (
    ['i', 'd', 's', 'u'].includes(p.status) ||
    (
      typeof p.chance_of_playing_next_round === 'number' &&
      p.chance_of_playing_next_round < 100
    )
  );
}

function injuryStatus(p) {
  let text = String(p.news || '')
    .replace(/\s*-\s*Expected back.*$/i, '')
    .replace(/\s*-\s*Unknown return date.*$/i, '')
    .replace(/\s*-\s*\d+%\s+chance of playing.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    text = ({
      i: 'Injured',
      d: 'Doubtful',
      s: 'Suspended',
      u: 'Unavailable'
    })[p.status] || 'Availability concern';
  }

  return text
    .replace(/knock injury/i, 'Knock')
    .replace(/hamstring injury/i, 'Hamstring')
    .replace(/knee injury/i, 'Knee injury')
    .replace(/back injury/i, 'Back injury')
    .replace(/ankle injury/i, 'Ankle injury')
    .replace(/groin injury/i, 'Groin injury')
    .replace(/calf injury/i, 'Calf injury')
    .replace(/foot injury/i, 'Foot injury')
    .replace(/muscle injury/i, 'Muscle injury')
    .slice(0, 28);
}

function injuryPriority(p) {
  const chance = p.chance_of_playing_next_round;
  if (p.status === 'i' || chance === 0) return 1;
  if (p.status === 's') return 2;
  if (p.status === 'u') return 3;
  if (p.status === 'd' || (typeof chance === 'number' && chance < 100)) return 4;
  return 99;
}

function buildInjuries(fpl) {
  const arsenal = (fpl.teams || []).find(
    t => t.name === 'Arsenal' || t.short_name === 'ARS'
  );
  if (!arsenal) return [];

  return (fpl.elements || [])
    .filter(p => p.team === arsenal.id)
    .filter(isRealAvailabilityIssue)
    .sort((a, b) => {
      const priorityDiff = injuryPriority(a) - injuryPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return (
        (a.chance_of_playing_next_round ?? 100) -
        (b.chance_of_playing_next_round ?? 100)
      );
    })
    .slice(0, 3)
    .map(p => ({
      type: p.status === 's' ? 'SUSPEND' : 'INJURY',
      player: shortName(p),
      status: injuryStatus(p)
    }));
}

function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rssItems(xml) {
  return [
    ...xml.matchAll(
      /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi
    )
  ].map(m => ({
    title: decode(m[1]),
    description: decode(m[2])
  }));
}

function validTransferName(name) {
  if (!name) return false;
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every(word => /^[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+$/.test(word));
}

function transferItem(xml) {
  const candidates = rssItems(xml).filter(a =>
    /arsenal/i.test(a.title) &&
    /(bid|offer|target|linked|talks|sign|deal|medical)/i.test(
      `${a.title} ${a.description}`
    ) &&
    !/women|academy|u21|former arsenal|ex-arsenal/i.test(a.title)
  );

  for (const article of candidates) {
    const text = article.title.replace(/\s+-\s+[^-]+$/, '');
    const patterns = [
      /(?:bid|offer)\s+(?:for\s+)?([A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+)/i,
      /(?:target(?:ing)?|linked (?:with|to)|sign(?:ing)?|talks (?:with|for))\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+)/i,
      /([A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+)\s+(?:to Arsenal|linked (?:with|to) Arsenal)/i
    ];

    let player = null;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1] && validTransferName(match[1])) {
        player = match[1];
        break;
      }
    }

    if (!player) continue;

    const lower = `${article.title} ${article.description}`.toLowerCase();
    const status = lower.includes('medical')
      ? 'Medical reported'
      : lower.includes('deal agreed') || lower.includes('agreement reached')
        ? 'Deal reportedly agreed'
        : lower.includes('bid') || lower.includes('offer')
          ? 'Bid reported'
          : lower.includes('talks') || lower.includes('negotiations')
            ? 'Talks reported'
            : lower.includes('target')
              ? 'Reported target'
              : 'Arsenal linked';

    return { type: 'TRANSFER', player, status };
  }

  return null;
}

async function main() {
  const football = JSON.parse(await readFile(FOOTBALL_FILE, 'utf8'));
  let injuries = [];
  let transfer = null;

  try {
    injuries = buildInjuries(await getJson(FPL_API));
  } catch (error) {
    console.warn('FPL squad watch unavailable:', error.message);
  }

  try {
    transfer = transferItem(await getText(TRANSFER_RSS_URL));
  } catch (error) {
    console.warn('Transfer RSS unavailable:', error.message);
  }

  const next = [...injuries];
  if (transfer && next.length < 4) next.push(transfer);

  if (next.length) {
    football.squadWatch = next.slice(0, 4);
  }

  await writeFile(
    FOOTBALL_FILE,
    JSON.stringify(football, null, 2) + '\n',
    'utf8'
  );

  console.log(`Squad Watch complete: ${football.squadWatch?.length || 0} items.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
