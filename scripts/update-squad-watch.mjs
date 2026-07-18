/**
 * Arsenal E1002 Automatic Squad Watch Updater
 *
 * AUTOMATICALLY UPDATES:
 *
 * 1. Arsenal injuries / availability concerns
 * 2. Arsenal transfer-watch news
 *
 * NO MANUAL EDITING REQUIRED.
 *
 * Injury source:
 * Fantasy Premier League bootstrap data
 *
 * Transfer source:
 * Google News RSS search
 *
 * Output:
 * data/football.json
 */


import {
  readFile,
  writeFile
} from 'node:fs/promises';


/* =========================================================
   CONFIGURATION
   ========================================================= */


const FOOTBALL_FILE =
  'data/football.json';


const FPL_API =
  'https://fantasy.premierleague.com/api/bootstrap-static/';


const TRANSFER_RSS_URL =

  'https://news.google.com/rss/search'
  +
  '?q=Arsenal+transfer+when:7d'
  +
  '&hl=en-GB'
  +
  '&gl=GB'
  +
  '&ceid=GB:en';


const MAX_SQUAD_ITEMS =
  4;


const MAX_INJURY_ITEMS =
  3;


/* =========================================================
   GENERIC FETCH
   ========================================================= */


async function fetchText(
  url
) {

  const response =
    await fetch(

      url,

      {

        headers: {

          'User-Agent':
            'Mozilla/5.0 Arsenal-E1002-Dashboard',

          'Accept':
            '*/*'

        }

      }

    );


  if (!response.ok) {

    throw new Error(

      `Request failed: ${response.status} ${url}`

    );

  }


  return response.text();

}


/* =========================================================
   READ JSON
   ========================================================= */


async function readJsonFile(
  filename
) {

  const raw =
    await readFile(

      filename,

      'utf8'

    );


  return JSON.parse(
    raw
  );

}


/* =========================================================
   FETCH FPL DATA
   ========================================================= */


async function fetchFplData() {

  console.log(

    'Fetching Arsenal player availability...'

  );


  const response =
    await fetch(

      FPL_API,

      {

        headers: {

          'User-Agent':
            'Mozilla/5.0 Arsenal-E1002-Dashboard',

          'Accept':
            'application/json'

        }

      }

    );


  if (!response.ok) {

    throw new Error(

      `FPL request failed: ${response.status}`

    );

  }


  return response.json();

}


/* =========================================================
   FIND ARSENAL TEAM ID
   ========================================================= */


function findArsenalTeamId(
  teams
) {

  const arsenal =
    teams.find(

      team =>

        team.name
          ?.toLowerCase()
        ===
        'arsenal'

        ||

        team.short_name
          ?.toUpperCase()
        ===
        'ARS'

    );


  if (!arsenal) {

    throw new Error(

      'Arsenal could not be found in FPL data.'

    );

  }


  return arsenal.id;

}


/* =========================================================
   PLAYER NAME
   ========================================================= */


function getPlayerName(
  player
) {

  const firstName =

    player.first_name
      ?.trim()
    ||
    '';


  const secondName =

    player.second_name
      ?.trim()
    ||
    '';


  const fullName =

    `${firstName} ${secondName}`
      .trim();


  return (

    fullName

    ||

    player.web_name

    ||

    'Unknown'

  );

}


/* =========================================================
   SHORTEN PLAYER NAME
   ========================================================= */


function shortenPlayerName(
  name
) {

  const cleanName =

    String(
      name
    )

      .replace(
        /\s+/g,
        ' '
      )

      .trim();


  if (
    cleanName.length
    <=
    19
  ) {

    return cleanName;

  }


  const parts =
    cleanName.split(' ');


  if (
    parts.length
    >
    1
  ) {

    return (

      parts[0][0]

      +

      '. '

      +

      parts[
        parts.length - 1
      ]

    );

  }


  return cleanName.slice(
    0,
    19
  );

}


/* =========================================================
   EXCLUDE NON-INJURY NEWS
   ========================================================= */


const NON_INJURY_PHRASES = [

  'has joined',

  'joined werder',

  'joined porto',

  'joined on loan',

  'joined permanently',

  'loan move',

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


/* =========================================================
   CHECK WHETHER FPL NEWS IS ACTUALLY AN AVAILABILITY ISSUE
   ========================================================= */


function isRealAvailabilityIssue(
  player
) {

  const news =

    String(
      player.news
      ||
      ''
    )
      .toLowerCase()
      .trim();


  /*
   * Exclude obvious transfer / loan / departure notes.
   */

  const nonInjuryNews =

    NON_INJURY_PHRASES.some(

      phrase =>

        news.includes(
          phrase
        )

    );


  if (nonInjuryNews) {

    return false;

  }


  /*
   * Suspended.
   */

  if (
    player.status
    ===
    's'
  ) {

    return true;

  }


  /*
   * Injured.
   */

  if (
    player.status
    ===
    'i'
  ) {

    return true;

  }


  /*
   * Doubtful.
   */

  if (
    player.status
    ===
    'd'
  ) {

    return true;

  }


  /*
   * Explicitly unavailable,
   * but exclude transfer/loan notes above.
   */

  if (
    player.status
    ===
    'u'
  ) {

    return true;

  }


  /*
   * Availability probability below 100%.
   */

  if (

    typeof player.chance_of_playing_next_round
    ===
    'number'

    &&

    player.chance_of_playing_next_round
    <
    100

  ) {

    return true;

  }


  return false;

}


/* =========================================================
   CLEAN INJURY STATUS
   ========================================================= */


function cleanInjuryStatus(
  player
) {

  const news =

    String(
      player.news
      ||
      ''
    )
      .trim();


  if (!news) {

    if (
      player.status
      ===
      'i'
    ) {

      return 'Injured';

    }


    if (
      player.status
      ===
      'd'
    ) {

      return 'Doubtful';

    }


    if (
      player.status
      ===
      's'
    ) {

      return 'Suspended';

    }


    if (
      player.status
      ===
      'u'
    ) {

      return 'Unavailable';

    }


    return 'Availability concern';

  }


  let clean =

    news

      .replace(

        /\s*-\s*Expected back.*$/i,

        ''

      )

      .replace(

        /\s*-\s*Unknown return date.*$/i,

        ''

      )

      .replace(

        /\s*-\s*\d+%\s+chance of playing.*$/i,

        ''

      )

      .replace(

        /\s+/g,

        ' '

      )

      .trim();


  clean = clean

    .replace(

      /knock injury/i,

      'Knock'

    )

    .replace(

      /hamstring injury/i,

      'Hamstring'

    )

    .replace(

      /knee injury/i,

      'Knee injury'

    )

    .replace(

      /back injury/i,

      'Back injury'

    )

    .replace(

      /ankle injury/i,

      'Ankle injury'

    )

    .replace(

      /groin injury/i,

      'Groin injury'

    )

    .replace(

      /calf injury/i,

      'Calf injury'

    )

    .replace(

      /foot injury/i,

      'Foot injury'

    )

    .replace(

      /muscle injury/i,

      'Muscle injury'

    );


  if (
    clean.length
    >
    24
  ) {

    clean =

      clean
        .slice(
          0,
          23
        )
        .trim()

      +

      '…';

  }


  return clean;

}


/* =========================================================
   AVAILABILITY PRIORITY
   ========================================================= */


function getInjuryPriority(
  player
) {

  const chance =
    player.chance_of_playing_next_round;


  if (
    player.status
    ===
    'i'

    ||

    chance
    ===
    0
  ) {

    return 1;

  }


  if (
    player.status
    ===
    's'
  ) {

    return 2;

  }


  if (
    player.status
    ===
    'u'
  ) {

    return 3;

  }


  if (
    player.status
    ===
    'd'

    ||

    (
      typeof chance
      ===
      'number'

      &&

      chance
      <
      100
    )
  ) {

    return 4;

  }


  return 99;

}


/* =========================================================
   BUILD ARSENAL INJURY LIST
   ========================================================= */


function buildInjuryList(
  fplData
) {

  const teams =
    fplData.teams
    ||
    [];


  const players =
    fplData.elements
    ||
    [];


  const arsenalId =
    findArsenalTeamId(
      teams
    );


  const injuries =

    players

      .filter(

        player =>

          player.team
          ===
          arsenalId

      )

      .filter(

        player =>

          isRealAvailabilityIssue(
            player
          )

      )

      .map(

        player => ({

          type:

            player.status
            ===
            's'
            ?
            'SUSPEND'
            :
            'INJURY',

          player:

            shortenPlayerName(

              getPlayerName(
                player
              )

            ),

          status:

            cleanInjuryStatus(
              player
            ),

          priority:

            getInjuryPriority(
              player
            ),

          chance:

            player.chance_of_playing_next_round
            ??
            100

        })

      );


  injuries.sort(

    (
      a,
      b
    ) => {


      if (
        a.priority
        !==
        b.priority
      ) {

        return (

          a.priority
          -
          b.priority

        );

      }


      return (

        a.chance
        -
        b.chance

      );

    }

  );


  return injuries;

}


/* =========================================================
   XML HELPERS
   ========================================================= */


function decodeXml(
  text
) {

  return String(
    text
  )

    .replace(
      /&amp;/g,
      '&'
    )

    .replace(
      /&quot;/g,
      '"'
    )

    .replace(
      /&#39;/g,
      "'"
    )

    .replace(
      /&apos;/g,
      "'"
    )

    .replace(
      /&lt;/g,
      '<'
    )

    .replace(
      /&gt;/g,
      '>'
    );

}


function stripHtml(
  text
) {

  return decodeXml(

    String(
      text
    )

      .replace(

        /<[^>]*>/g,

        ' '

      )

      .replace(

        /\s+/g,

        ' '

      )

      .trim()

  );

}


function extractXmlTag(
  xml,
  tag
) {

  const pattern =

    new RegExp(

      `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,

      'i'

    );


  const match =
    xml.match(
      pattern
    );


  return match
    ?
    stripHtml(
      match[1]
    )
    :
    '';

}


function parseRssItems(
  xml
) {

  const matches =

    xml.match(

      /<item>[\s\S]*?<\/item>/gi

    )

    ||

    [];


  return matches.map(

    item => ({

      title:

        extractXmlTag(
          item,
          'title'
        ),

      description:

        extractXmlTag(
          item,
          'description'
        ),

      pubDate:

        extractXmlTag(
          item,
          'pubDate'
        )

    })

  );

}


/* =========================================================
   TRANSFER FILTERING
   ========================================================= */


const TRANSFER_KEYWORDS = [

  'transfer',

  'sign',

  'signing',

  'signed',

  'bid',

  'offer',

  'target',

  'linked',

  'interest',

  'interested',

  'talks',

  'negotiations',

  'agreement',

  'agreed',

  'deal',

  'medical',

  'move',

  'approach'

];


const EXCLUDED_PHRASES = [

  'women',

  'arsenal women',

  'academy',

  'under-21',

  'under 21',

  'u21',

  'legend',

  'former arsenal',

  'ex-arsenal'

];


function isTransferStory(
  article
) {

  const text =

    (
      article.title

      +

      ' '

      +

      article.description
    )

      .toLowerCase();


  const excluded =

    EXCLUDED_PHRASES.some(

      phrase =>

        text.includes(
          phrase
        )

    );


  if (excluded) {

    return false;

  }


  if (
    !text.includes(
      'arsenal'
    )
  ) {

    return false;

  }


  return TRANSFER_KEYWORDS.some(

    keyword =>

      text.includes(
        keyword
      )

  );

}


/* =========================================================
   TRANSFER STATUS
   ========================================================= */


function determineTransferStatus(
  text
) {

  const lower =
    text.toLowerCase();


  if (
    lower.includes(
      'medical'
    )
  ) {

    return 'Medical reported';

  }


  if (
    lower.includes(
      'deal agreed'
    )

    ||

    lower.includes(
      'agreement reached'
    )

    ||

    lower.includes(
      'agreed deal'
    )
  ) {

    return 'Deal reportedly agreed';

  }


  if (
    lower.includes(
      'bid'
    )

    ||

    lower.includes(
      'offer'
    )
  ) {

    return 'Bid reported';

  }


  if (
    lower.includes(
      'talks'
    )

    ||

    lower.includes(
      'negotiations'
    )
  ) {

    return 'Talks reported';

  }


  if (
    lower.includes(
      'target'
    )
  ) {

    return 'Reported target';

  }


  if (
    lower.includes(
      'interest'
    )

    ||

    lower.includes(
      'interested'
    )
  ) {

    return 'Interest reported';

  }


  return 'Arsenal linked';

}


/* =========================================================
   CLEAN TITLE
   ========================================================= */


function cleanHeadline(
  title
) {

  return title

    .replace(

      /\s+-\s+[^-]+$/,

      ''

    )

    .replace(

      /\s+/g,

      ' '

    )

    .trim();

}


/* =========================================================
   VALIDATE POSSIBLE PLAYER NAME
   ========================================================= */


function isValidPlayerName(
  name
) {

  if (!name) {

    return false;

  }


  const clean =

    name
      .replace(
        /\s+/g,
        ' '
      )
      .trim();


  const lower =
    clean.toLowerCase();


  const blocked = [

    'arsenal',

    'transfer',

    'transfer update',

    'premier league',

    'newcastle',

    'chelsea',

    'manchester united',

    'manchester city',

    'liverpool',

    'tottenham',

    'real madrid',

    'barcelona'

  ];


  if (
    blocked.includes(
      lower
    )
  ) {

    return false;

  }


  const words =
    clean.split(' ');


  if (
    words.length
    <
    1

    ||

    words.length
    >
    4
  ) {

    return false;

  }


  if (
    clean.length
    <
    3

    ||

    clean.length
    >
    35
  ) {

    return false;

  }


  return true;

}


/* =========================================================
   EXTRACT PLAYER NAME FROM TRANSFER HEADLINE
   ========================================================= */


function extractTransferPlayer(
  title
) {

  const cleanTitle =
    cleanHeadline(
      title
    );


  const patterns = [

    /Arsenal[^:,-]*?\b(?:bid|offer)\b[^:,-]*?\bfor\s+([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,

    /Arsenal[^:,-]*?\b(?:linked with|linked to)\s+([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,

    /Arsenal[^:,-]*?\b(?:target|eye|want|chase|pursue)\s+([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,

    /Arsenal[^:,-]*?\b(?:talks with|talks for|negotiations with)\s+([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,

    /Arsenal[^:,-]*?\b(?:sign|signing|signed)\s+([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,

    /([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){1,3})\s+(?:to Arsenal|linked with Arsenal|linked to Arsenal)/i,

    /(?:bid|offer)\s+for\s+([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,

    /(?:linked with|linked to)\s+([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i

  ];


  for (
    const pattern
    of
    patterns
  ) {

    const match =
      cleanTitle.match(
        pattern
      );


    if (
      match
      &&
      isValidPlayerName(
        match[1]
      )
    ) {

      return shortenPlayerName(

        match[1]
          .trim()

      );

    }

  }


  return null;

}


/* =========================================================
   SCORE TRANSFER ARTICLE
   ========================================================= */


function scoreTransferArticle(
  article
) {

  const text =

    (
      article.title

      +

      ' '

      +

      article.description
    )

      .toLowerCase();


  let score =
    0;


  if (
    text.includes(
      'deal agreed'
    )
  ) {

    score += 10;

  }


  if (
    text.includes(
      'medical'
    )
  ) {

    score += 9;

  }


  if (
    text.includes(
      'bid'
    )
  ) {

    score += 7;

  }


  if (
    text.includes(
      'talks'
    )
  ) {

    score += 6;

  }


  if (
    text.includes(
      'offer'
    )
  ) {

    score += 6;

  }


  if (
    text.includes(
      'target'
    )
  ) {

    score += 4;

  }


  if (
    text.includes(
      'linked'
    )
  ) {

    score += 3;

  }


  const player =
    extractTransferPlayer(
      article.title
    );


  if (player) {

    score += 8;

  }


  const published =
    new Date(
      article.pubDate
    );


  if (
    !Number.isNaN(
      published.getTime()
    )
  ) {

    const ageHours =

      (
        Date.now()

        -

        published.getTime()
      )

      /

      3600000;


    if (
      ageHours
      <
      24
    ) {

      score += 5;

    }

    else if (
      ageHours
      <
      72
    ) {

      score += 3;

    }

    else if (
      ageHours
      <
      168
    ) {

      score += 1;

    }

  }


  return score;

}


/* =========================================================
   GET TRANSFER WATCH
   ========================================================= */


async function getTransferWatch() {

  console.log(

    'Fetching recent Arsenal transfer news...'

  );


  try {

    const xml =
      await fetchText(
        TRANSFER_RSS_URL
      );


    const articles =

      parseRssItems(
        xml
      )

        .filter(
          isTransferStory
        )

        .map(

          article => ({

            ...article,

            player:

              extractTransferPlayer(
                article.title
              ),

            score:

              scoreTransferArticle(
                article
              )

          })

        )

        .filter(

          article =>

            article.player

        )

        .sort(

          (
            a,
            b
          ) =>

            b.score
            -
            a.score

        );


    if (
      articles.length
      ===
      0
    ) {

      console.log(

        'No transfer story with a confidently extracted player name was found.'

      );


      return null;

    }


    const best =
      articles[0];


    const combinedText =

      best.title

      +

      ' '

      +

      best.description;


    return {

      type:
        'TRANSFER',

      player:
        best.player,

      status:

        determineTransferStatus(
          combinedText
        )

    };

  }

  catch (error) {

    console.warn(

      'Transfer news update failed.'

    );


    console.warn(

      error.message

    );


    return null;

  }

}


/* =========================================================
   BUILD FINAL SQUAD WATCH
   ========================================================= */


function buildSquadWatch(

  injuries,

  transfer

) {

  const items =
    [];


  items.push(

    ...injuries.slice(

      0,

      MAX_INJURY_ITEMS

    )

  );


  if (
    transfer

    &&

    items.length
    <
    MAX_SQUAD_ITEMS
  ) {

    items.push(
      transfer
    );

  }


  if (
    !transfer

    &&

    items.length
    <
    MAX_SQUAD_ITEMS
  ) {

    const remainingInjuries =

      injuries.slice(

        MAX_INJURY_ITEMS

      );


    const remainingSlots =

      MAX_SQUAD_ITEMS

      -

      items.length;


    items.push(

      ...remainingInjuries.slice(

        0,

        remainingSlots

      )

    );

  }


  return items.slice(

    0,

    MAX_SQUAD_ITEMS

  );

}


/* =========================================================
   MAIN
   ========================================================= */


async function updateSquadWatch() {

  console.log(

    'Starting automatic Squad Watch update...'

  );


  const footballData =

    await readJsonFile(

      FOOTBALL_FILE

    );


  const [

    fplData,

    transfer

  ] =

    await Promise.all([

      fetchFplData(),

      getTransferWatch()

    ]);


  const injuries =

    buildInjuryList(

      fplData

    );


  const squadWatch =

    buildSquadWatch(

      injuries,

      transfer

    );


  footballData.squadWatch =

    squadWatch.map(

      item => ({

        type:
          item.type,

        player:
          item.player,

        status:
          item.status

      })

    );


  await writeFile(

    FOOTBALL_FILE,

    JSON.stringify(

      footballData,

      null,

      2

    )

    +

    '\n',

    'utf8'

  );


  console.log(

    'Automatic Squad Watch updated successfully.'

  );


  console.log(

    `Valid Arsenal availability concerns: ${injuries.length}`

  );


  console.log(

    'Transfer item:',

    transfer
    ||
    'None'

  );


  console.log(

    'Displayed Squad Watch:',

    footballData.squadWatch

  );

}


/* =========================================================
   RUN
   ========================================================= */


updateSquadWatch()

  .catch(

    error => {

      console.error(

        'Squad Watch update failed:'

      );


      console.error(
        error
      );


      process.exit(1);

    }

  );
