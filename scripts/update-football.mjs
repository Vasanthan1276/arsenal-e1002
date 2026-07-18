/**
 * Arsenal E1002 Football Dashboard Updater
 *
 * Updates:
 * - Premier League standings
 * - Arsenal's next 4 Premier League fixtures
 * - Singapore fixture times
 *
 * Preserves Squad Watch from the existing football.json.
 */

import {
  readFile,
  writeFile,
  mkdir
} from 'node:fs/promises';


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


if (!API_TOKEN) {

  console.error(
    'ERROR: FOOTBALL_DATA_TOKEN is not available.'
  );

  process.exit(1);

}


async function apiRequest(endpoint) {

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
          'X-Auth-Token': API_TOKEN
        }
      }
    );


  if (!response.ok) {

    const errorText =
      await response.text();


    throw new Error(
      `Football API error ${response.status}: ${errorText}`
    );

  }


  return response.json();

}


async function readExistingData() {

  try {

    const raw =
      await readFile(
        DATA_FILE,
        'utf8'
      );


    return JSON.parse(raw);

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


function shortenTeamName(name) {

  const replacements = {

    'Arsenal FC':
      'Arsenal',

    'Aston Villa FC':
      'Aston Villa',

    'AFC Bournemouth':
      'Bournemouth',

    'Bournemouth':
      'Bournemouth',

    'Brentford FC':
      'Brentford',

    'Brighton & Hove Albion FC':
      'Brighton',

    'Brighton & Hove Albion':
      'Brighton',

    'Burnley FC':
      'Burnley',

    'Chelsea FC':
      'Chelsea',

    'Coventry City FC':
      'Coventry',

    'Coventry City':
      'Coventry',

    'Crystal Palace FC':
      'Crystal Palace',

    'Everton FC':
      'Everton',

    'Fulham FC':
      'Fulham',

    'Hull City AFC':
      'Hull City',

    'Hull City':
      'Hull City',

    'Ipswich Town FC':
      'Ipswich',

    'Ipswich Town':
      'Ipswich',

    'Leeds United FC':
      'Leeds',

    'Leeds United':
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

    'Nottingham Forest':
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


  if (replacements[name]) {

    return replacements[name];

  }


  return name

    .replace(
      /\s+Football Club$/i,
      ''
    )

    .replace(
      /\s+AFC$/i,
      ''
    )

    .replace(
      /\s+FC$/i,
      ''
    );

}


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
    !Array.isArray(totalTable.table)
  ) {

    throw new Error(
      'Premier League standings were not found.'
    );

  }


  const seasonNotStarted =

    totalTable.table.every(

      row =>
        Number(row.playedGames) === 0

    );


  return totalTable.table.map(

    row => ({

      pos:

        seasonNotStarted
        ?
        '-'
        :
        row.position,


      team:

        shortenTeamName(
          row.team.name
        ),


      played:

        row.playedGames
        ??
        0,


      won:

        row.won
        ??
        0,


      draw:

        row.draw
        ??
        0,


      lost:

        row.lost
        ??
        0,


      gf:

        row.goalsFor
        ??
        0,


      ga:

        row.goalsAgainst
        ??
        0,


      gd:

        row.goalDifference
        ??
        0,


      pts:

        row.points
        ??
        0

    })

  );

}


async function getFixtures() {

  const data =
    await apiRequest(
      `/teams/${ARSENAL_ID}/matches?status=SCHEDULED`
    );


  if (!Array.isArray(data.matches)) {

    throw new Error(
      'Arsenal fixture data was not found.'
    );

  }


  const premierLeagueMatches =

    data.matches.filter(

      match =>
        match.competition?.code
        ===
        COMPETITION

    );


  premierLeagueMatches.sort(

    (a, b) =>

      new Date(a.utcDate)
      -
      new Date(b.utcDate)

  );


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


function formatFixtureTeam(name) {

  return shortenTeamName(name)
    .toUpperCase();

}


function formatFixtureDate(utcDate) {

  const date =
    new Date(utcDate);


  const parts =

    new Intl.DateTimeFormat(

      'en-GB',

      {
        timeZone: TIME_ZONE,
        day: '2-digit',
        month: '2-digit'
      }

    )
      .formatToParts(date);


  const day =

    parts.find(
      part => part.type === 'day'
    )?.value;


  const monthNumber =

    parts.find(
      part => part.type === 'month'
    )?.value;


  const monthNames = {

    '01': 'JAN',
    '02': 'FEB',
    '03': 'MAR',
    '04': 'APR',
    '05': 'MAY',
    '06': 'JUN',
    '07': 'JUL',
    '08': 'AUG',
    '09': 'SEP',
    '10': 'OCT',
    '11': 'NOV',
    '12': 'DEC'

  };


  return (
    day
    +
    ' '
    +
    monthNames[monthNumber]
  );

}


function formatFixtureTime(utcDate) {

  if (!utcDate) {

    return 'TBC';

  }


  const formatter =

    new Intl.DateTimeFormat(

      'en-GB',

      {
        timeZone: TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }

    );


  return (
    formatter.format(
      new Date(utcDate)
    )
    +
    ' SGT'
  );

}


function getUpdatedTime() {

  const now =
    new Date();


  const parts =

    new Intl.DateTimeFormat(

      'en-GB',

      {
        timeZone: TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }

    )
      .formatToParts(now);


  const getPart =
    type =>
      parts.find(
        part => part.type === type
      )?.value;


  const monthNames = {

    '01': 'JAN',
    '02': 'FEB',
    '03': 'MAR',
    '04': 'APR',
    '05': 'MAY',
    '06': 'JUN',
    '07': 'JUL',
    '08': 'AUG',
    '09': 'SEP',
    '10': 'OCT',
    '11': 'NOV',
    '12': 'DEC'

  };


  return (
    getPart('day')
    +
    ' '
    +
    monthNames[
      getPart('month')
    ]
    +
    ' '
    +
    getPart('hour')
    +
    ':'
    +
    getPart('minute')
    +
    ' SGT'
  );

}


async function updateFootballData() {

  console.log(
    'Starting Arsenal dashboard update...'
  );


  const existingData =
    await readExistingData();


  const [
    standings,
    fixtures
  ] =

    await Promise.all([

      getStandings(),

      getFixtures()

    ]);


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


  await mkdir(

    'data',

    {
      recursive: true
    }

  );


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


updateFootballData()

  .catch(

    error => {

      console.error(
        'Football update failed:'
      );


      console.error(error);


      process.exit(1);

    }

  );
