/**
 * Arsenal E1002 Automatic Squad Watch Updater
 *
 * AUTOMATICALLY UPDATES:
 *
 * 1. Arsenal player injuries / availability
 * 2. Arsenal transfer-watch news
 *
 * NO MANUAL TRANSFER FILE IS REQUIRED.
 *
 * Injury source:
 * Fantasy Premier League bootstrap data
 *
 * Transfer source:
 * Google News RSS search for recent Arsenal transfer news
 *
 * Output:
 * data/football.json
 *
 * Maximum Squad Watch rows:
 * 4
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


/*
 * Maximum injury rows.
 *
 * This ensures that at least one transfer story can appear
 * when there is a credible recent transfer story.
 */

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
   READ JSON FILE
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
   FIND ARSENAL TEAM
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

      'Arsenal could not be found in player data.'

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
   SHORTEN PLAYER NAMES
   ========================================================= */


function shortenPlayerName(
  name
) {


  /*
   * Remove excessive spaces.
   */

  const cleanName =

    String(
      name
    )

      .replace(
        /\s+/g,
        ' '
      )

      .trim();


  /*
   * Keep reasonably short names unchanged.
   */

  if (
    cleanName.length
    <=
    19
  ) {


    return cleanName;

  }


  /*
   * For long names use:
   *
   * First initial + surname
   */

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


  /*
   * Remove expected-return wording to keep
   * the E1002 display compact.
   */


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


  /*
   * Simplify common phrases.
   */


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

    );


  /*
   * Maximum display length.
   */


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
   INJURY PRIORITY
   ========================================================= */


function getInjuryPriority(
  player
) {


  const chance =
    player.chance_of_playing_next_round;


  /*
   * Definitely unavailable.
   */


  if (
    player.status
    ===
    'u'

    ||

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


  /*
   * Suspended.
   */


  if (
    player.status
    ===
    's'
  ) {


    return 2;

  }


  /*
   * Doubtful.
   */


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


    return 3;

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

          getInjuryPriority(
            player
          )
          <
          99

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
   XML ENTITY CLEANUP
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


/* =========================================================
   STRIP HTML
   ========================================================= */


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


/* =========================================================
   EXTRACT XML TAG
   ========================================================= */


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


/* =========================================================
   READ RSS ITEMS
   ========================================================= */


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
   TRANSFER KEYWORDS
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

  'agreement',

  'agreed',

  'deal',

  'medical',

  'move',

  'approach'

];


/* =========================================================
   EXCLUDED NEWS
   ========================================================= */


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


/* =========================================================
   CHECK TRANSFER STORY
   ========================================================= */


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


  /*
   * Article must mention Arsenal.
   */


  if (
    !text.includes(
      'arsenal'
    )
  ) {


    return false;

  }


  /*
   * Must contain at least one
   * transfer-related phrase.
   */


  return TRANSFER_KEYWORDS.some(

    keyword =>

      text.includes(
        keyword
      )

  );

}


/* =========================================================
   DETERMINE TRANSFER STATUS
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
   EXTRACT POSSIBLE PLAYER NAME

   Transfer headlines normally follow patterns such as:

   Arsenal linked with Player Name
   Arsenal target Player Name
   Arsenal make bid for Player Name

   This is heuristic rather than guaranteed.
   ========================================================= */


function extractTransferPlayer(
  title
) {


  /*
   * Remove publisher suffix from Google News titles.
   *
   * Example:
   *
   * Arsenal linked with Player - BBC Sport
   */


  const cleanTitle =

    title

      .replace(

        /\s+-\s+[^-]+$/,

        ''

      )

      .trim();


  const patterns = [


    /linked with ([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,


    /linked to ([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,


    /bid for ([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,


    /offer for ([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,


    /talks for ([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,


    /talks with ([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,


    /target ([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i,


    /sign ([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’-]+){0,3})/i


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
      match[1]
    ) {


      return shortenPlayerName(

        match[1]
          .trim()

      );

    }

  }


  /*
   * If a player cannot confidently be extracted,
   * return a generic label.
   */


  return 'Transfer Update';

}


/* =========================================================
   TRANSFER STORY SCORE
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


  /*
   * Stronger transfer wording.
   */


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


  /*
   * Slight preference for newer stories.
   */


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
   GET AUTOMATIC TRANSFER WATCH
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

            score:

              scoreTransferArticle(
                article
              )

          })

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

        'No suitable recent transfer story found.'

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

        extractTransferPlayer(
          best.title
        ),

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


    /*
     * Transfer failure should not break
     * the whole dashboard.
     */


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


  /*
   * Select up to three highest-priority
   * availability concerns.
   */


  items.push(

    ...injuries.slice(

      0,

      MAX_INJURY_ITEMS

    )

  );


  /*
   * Add one automatic transfer story.
   */


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


  /*
   * If there is no transfer story,
   * use the fourth row for another injury.
   */


  if (
    !transfer

    &&

    items.length
    <
    MAX_SQUAD_ITEMS
  ) {


    const nextInjury =

      injuries[
        MAX_INJURY_ITEMS
      ];


    if (
      nextInjury
    ) {


      items.push(
        nextInjury
      );

    }

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


  /*
   * Load football.json created by
   * update-football.mjs.
   */


  const footballData =

    await readJsonFile(

      FOOTBALL_FILE

    );


  /*
   * Fetch injuries and transfer news
   * simultaneously.
   */


  const [

    fplData,

    transfer

  ] =

    await Promise.all([

      fetchFplData(),

      getTransferWatch()

    ]);


  /*
   * Build injury list.
   */


  const injuries =

    buildInjuryList(

      fplData

    );


  /*
   * Create final Squad Watch.
   */


  const squadWatch =

    buildSquadWatch(

      injuries,

      transfer

    );


  /*
   * Replace previous Squad Watch.
   */


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


  /*
   * Write updated football.json.
   */


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

    `Availability concerns found: ${injuries.length}`

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
