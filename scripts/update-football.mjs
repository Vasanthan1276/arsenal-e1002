/**
 * Arsenal E1002 Football Dashboard Updater
 *
 * Automatically updates:
 *
 * 1. Premier League standings
 * 2. Arsenal's next 4 Premier League fixtures
 * 3. Match times converted to Singapore time
 *
 * Squad Watch is preserved from the existing football.json file.
 *
 * Data source:
 * football-data.org API v4
 */

import {
  readFile,
  writeFile,
  mkdir
} from 'node:fs/promises';


/* =========================================================
   CONFIGURATION
   ========================================================= */

const API_BASE =
  'https://api.football-data.org/v4';


const COMPETITION =
  'PL';


const ARSENAL_ID =
  57;


const DATA_FILE =
  'data/football.json';


const TIME_ZONE =
  'Asia/Singapore';


const API_TOKEN =
  process.env.FOOTBALL_DATA_TOKEN;


/* =========================================================
   CHECK API TOKEN
   ========================================================= */

if (!API_TOKEN) {

  console.error(
    'ERROR: FOOTBALL_DATA_TOKEN is not available.'
  );

  process.exit(1);

}


/* =========================================================
   API REQUEST
   ========================================================= */

async function apiRequest(
  endpoint
) {

  const url =
    `${API_BASE}${endpoint}`;


  console.log(
    `Fetching: ${url}`
  );


  const response =
    await fetch(

      url,

      {

        headers: {

          'X-Auth-Token':
            API_TOKEN

        }

      }

    );


  if (!response.ok) {

    const errorText =
      await response.text();


    throw new Error(

      `Football API error `
      +
      `${response.status}: `
      +
      errorText

    );

  }


  return response.json();

}


/* =========================================================
   READ EXISTING JSON

   This allows us to keep Squad Watch unchanged.
   ========================================================= */

async function readExistingData() {

  try {

    const raw =
      await readFile(

        DATA_FILE,

        'utf8'

      );


    return JSON.parse(
      raw
    );

  }

  catch (error) {

    console.warn(

      'Existing football.json could not be read.'

    );


    return {

      squadWatch: []

    };

  }

}


/* =========================================================
   GET PREMIER LEAGUE STANDINGS
   ========================================================= */

async function getStandings() {


  const data =
    await apiRequest(

      `/competitions/${COMPETITION}/standings`

    );


  const totalTable =

    data.standings?.find(

      standing =>
        standing.type === 'TOTAL'

    );


  if (
    !totalTable
    ||
    !Array.isArray(
      totalTable.table
    )
  ) {

    throw new Error(

      'Premier League standings were not found.'

    );

  }


  return totalTable.table.map(

    row => ({

      pos:
        row.position,

      team:
        shortenTeamName(
          row.team.name
        ),

      played:
        row.playedGames,

      gd:
        row.goalDifference,

      pts:
        row.points

    })

  );

}


/* =========================================================
   TEAM NAME SHORTENING

   Keeps names readable on the 800 x 480 display.
   ========================================================= */

function shortenTeamName(
  name
) {


  const replacements = {

    'Arsenal FC':
      'Arsenal',

    'Aston Villa FC':
      'Aston Villa',

    'AFC Bournemouth':
      'Bournemouth',

    'Brentford FC':
      'Brentford',

    'Brighton & Hove Albion FC':
      'Brighton',

    'Burnley FC':
      'Burnley',

    'Chelsea FC':
      'Chelsea',

    'Crystal Palace FC':
      'Crystal Palace',

    'Everton FC':
      'Everton',

    'Fulham FC':
      'Fulham',

    'Leeds United FC':
      'Leeds',

    'Liverpool FC':
      'Liverpool',

    'Manchester City FC':
      'Man City',

    'Manchester United FC':
      'Man United',

    'Newcastle United FC':
      'Newcastle',

    'Nottingham Forest FC':
      "Nott'm Forest",

    'Sunderland AFC':
      'Sunderland',

    'Tottenham Hotspur FC':
      'Tottenham',

    'West Ham United FC':
      'West Ham',

    'Wolverhampton Wanderers FC':
      'Wolves'

  };


  return replacements[name]
    ||
    name
      .replace(
        /\s+FC$/,
        ''
      );

}


/* =========================================================
   GET ARSENAL'S NEXT FOUR MATCHES
   ========================================================= */

async function getFixtures() {


  const data =
    await apiRequest(

      `/teams/${ARSENAL_ID}/matches?status=SCHEDULED`

    );


  if (
    !Array.isArray(
      data.matches
    )
  ) {

    throw new Error(

      'Arsenal fixture data was not found.'

    );

  }


  /*
   * Keep only future Premier League matches.
   */

  const premierLeagueMatches =

    data.matches.filter(

      match =>

        match.competition?.code
        ===
        COMPETITION

    );


  /*
   * Sort chronologically.
   */

  premierLeagueMatches.sort(

    (
      a,
      b
    ) =>

      new Date(
        a.utcDate
      )

      -

      new Date(
        b.utcDate
      )

  );


  /*
   * Take next four matches.
   */

  return premierLeagueMatches

    .slice(
      0,
      4
    )

    .map(

      match => ({

        date:
          formatFixtureDate(
            match.utcDate
          ),

        home:
          formatFixtureTeam(
            match.homeTeam.name
          ),

        away:
          formatFixtureTeam(
            match.awayTeam.name
          ),

        time:
          formatFixtureTime(
            match.utcDate
          )

      })

    );

}


/* =========================================================
   FIXTURE TEAM NAME
   ========================================================= */

function formatFixtureTeam(
  name
) {


  return shortenTeamName(
    name
  )
    .toUpperCase();

}


/* =========================================================
   FIXTURE DATE
   ========================================================= */

function formatFixtureDate(
  utcDate
) {


  const date =
    new Date(
      utcDate
    );


  const formatter =
    new Intl.DateTimeFormat(

      'en-GB',

      {

        timeZone:
          TIME_ZONE,

        day:
          '2-digit',

        month:
          'short'

      }

    );


  return formatter
    .format(
      date
    )
    .toUpperCase();

}


/* =========================================================
   FIXTURE TIME
   ========================================================= */

function formatFixtureTime(
  utcDate
) {


  if (!utcDate) {

    return 'TBC';

  }


  const date =
    new Date(
      utcDate
    );


  const formatter =
    new Intl.DateTimeFormat(

      'en-GB',

      {

        timeZone:
          TIME_ZONE,

        hour:
          '2-digit',

        minute:
          '2-digit',

        hour12:
          false

      }

    );


  return (

    formatter.format(
      date
    )

    +
    ' SGT'

  );

}


/* =========================================================
   UPDATED TIME
   ========================================================= */

function getUpdatedTime() {


  const now =
    new Date();


  const dateFormatter =
    new Intl.DateTimeFormat(

      'en-GB',

      {

        timeZone:
          TIME_ZONE,

        day:
          '2-digit',

        month:
          'short'

      }

    );


  const timeFormatter =
    new Intl.DateTimeFormat(

      'en-GB',

      {

        timeZone:
          TIME_ZONE,

        hour:
          '2-digit',

        minute:
          '2-digit',

        hour12:
          false

      }

    );


  return (

    dateFormatter
      .format(
        now
      )
      .toUpperCase()

    +

    ' '

    +

    timeFormatter
      .format(
        now
      )

    +

    ' SGT'

  );

}


/* =========================================================
   MAIN UPDATE
   ========================================================= */

async function updateFootballData() {


  console.log(

    'Starting Arsenal dashboard update...'

  );


  /*
   * Read current file first.
   */

  const existingData =
    await readExistingData();


  /*
   * Fetch new football information.
   */

  const [

    standings,

    fixtures

  ] =

    await Promise.all([

      getStandings(),

      getFixtures()

    ]);


  /*
   * Create final JSON.
   */

  const newData = {

    updated:
      getUpdatedTime(),

    fixtures,

    standings,

    squadWatch:
      existingData.squadWatch
      ||
      []

  };


  /*
   * Ensure data directory exists.
   */

  await mkdir(

    'data',

    {

      recursive:
        true

    }

  );


  /*
   * Write JSON.
   */

  await writeFile(

    DATA_FILE,

    JSON.stringify(

      newData,

      null,

      2

    )

    +

    '\n',

    'utf8'

  );


  console.log(

    'football.json updated successfully.'

  );


  console.log(

    `Standings: ${standings.length} teams`

  );


  console.log(

    `Fixtures: ${fixtures.length} matches`

  );


}


/* =========================================================
   RUN
   ========================================================= */

updateFootballData()

  .catch(

    error => {


      console.error(

        'Football update failed:'

      );


      console.error(

        error

      );


      process.exit(1);

    }

  );
