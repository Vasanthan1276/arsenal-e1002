# Arsenal E1002 + Home Assistant Fantasy Hub

A single GitHub Pages project that powers both:

1. **reTerminal E1002 Arsenal dashboard** — `index.html` (fixed 800×480)
2. **Home Assistant Arsenal + Fantasy Hub** — `ha.html` (responsive)

The project combines Arsenal fixtures, Premier League standings, recent Arsenal form/results, injury/transfer watch, and four Fantasy teams in one update pipeline.

## Live pages

- E1002: `https://vasanthan1276.github.io/arsenal-e1002/`
- Home Assistant: `https://vasanthan1276.github.io/arsenal-e1002/ha.html`

## What changed

### E1002 display

The old full 20-team spreadsheet-style view has been replaced with a more glanceable 800×480 layout:

- large **next Arsenal match** hero panel
- Singapore kickoff time
- Arsenal recent form / last result
- next three fixtures
- compact **Arsenal-focused Premier League table**
- Arsenal position / points / goal difference
- Squad Watch for injuries, suspensions and transfers
- bottom Fantasy strip for Main FPL, D1, D2 and C1 gameweek points

The design uses solid high-contrast colours suited to the E1002 e-paper display rather than gradients, animations or small dense tables.

### Home Assistant

`ha.html` is a responsive Arsenal + Fantasy dashboard with tabs for:

- Overview
- Main FPL
- Golden Eagles D1
- Golden Eagles D2
- Golden Eagles C1

When live IDs are configured it can show:

- gameweek points
- total points
- overall / league rank
- Main FPL starting XI and bench
- captain and vice-captain
- individual player GW points
- Main FPL leagues
- Draft squads and Draft standings

If IDs are not yet configured, the dashboard continues to show the last known squads instead of failing.

## Tracked Fantasy teams

### Main FPL

Fallback squad:

- GKP: Antonín Kinský, Bart Verbruggen
- DEF: Riccardo Calafiori, Joško Gvardiol, Harry Maguire, Jacob Greaves, Bobby Thomas
- MID: Bruno Fernandes, Bryan Mbeumo, Florian Wirtz, Christos Tzolis, Pascal Groß
- FWD: Erling Haaland, João Pedro, Jonah Kusi-Asare

### Golden Eagles D1

- FPL Draft
- 8-team league
- Head-to-Head scoring

Fallback squad:

- GKP: Gianluigi Donnarumma, Bart Verbruggen
- DEF: Marc Guéhi, Joško Gvardiol, Jeremie Frimpong, Harry Maguire, Neco Williams
- MID: Cole Palmer, Bryan Mbeumo, Phil Foden, Christos Tzolis, Iliman Ndiaye
- FWD: Gonzalo García, Jean-Philippe Mateta, Brian Brobbey

### Golden Eagles D2

- FPL Draft
- 8-team league
- Classic scoring

Fallback squad:

- GKP: Dean Henderson, James Trafford
- DEF: Daniel Muñoz, Joško Gvardiol, Pedro Porro, Ben White, Neco Williams
- MID: Bruno Fernandes, Florian Wirtz, Phil Foden, Eberechi Eze, Martin Ødegaard
- FWD: João Pedro, Jean-Philippe Mateta, Evanilson

### Golden Eagles C1

- Fantasy Premier League Challenge

The fallback C1 squad is retained until a reliable live Challenge source is configured. C1 is designed to be replaceable each Challenge Gameweek.

## Repository structure

```text
arsenal-e1002/
├── .github/
│   └── workflows/
│       └── update-football.yml
├── config/
│   └── fantasy-config.json
├── data/
│   ├── football.json
│   └── fantasy.json
├── home-assistant/
│   └── webpage-card.yaml
├── scripts/
│   ├── update-football.mjs
│   ├── update-squad-watch.mjs
│   ├── update-fantasy.mjs
│   ├── render-static-dashboard.mjs
│   └── render-home-assistant.mjs
├── index.html
├── ha.html
└── README.md
```

## Automatic update flow

GitHub Actions runs every two hours and can also be started manually.

```text
Football-Data.org
        │
        ├── standings
        ├── Arsenal fixtures
        └── Arsenal recent results
        │
        ▼
 data/football.json
        ▲
        │
FPL bootstrap + Google News RSS
        │
        └── Squad Watch

Fantasy Premier League / Draft APIs
        │
        ▼
 data/fantasy.json
        │
        ├───────────────┐
        ▼               ▼
    index.html        ha.html
      E1002        Home Assistant
```

## Existing GitHub secret

Keep the existing repository secret:

```text
FOOTBALL_DATA_TOKEN
```

This is used by `scripts/update-football.mjs`.

No FPL API key is required for the public read-only Main FPL endpoints used by this project.

## Configure live Fantasy data

Edit:

```text
config/fantasy-config.json
```

### Main FPL

Replace `null` with your numeric FPL entry ID:

```json
"main": {
  "name": "Main FPL",
  "entryId": 1234567,
  "leagueIds": []
}
```

The entry ID is the number in a URL similar to:

```text
https://fantasy.premierleague.com/entry/1234567/event/3
```

`leagueIds` is optional. If left empty, the updater shows up to six non-system leagues returned by the entry profile. If you only want particular mini-leagues, enter their numeric league IDs.

### Golden Eagles D1 / D2

For each Draft league enter both the **league ID** and **entry ID**:

```json
{
  "key": "d1",
  "name": "Golden Eagles D1",
  "format": "FPL Draft",
  "scoring": "Head-to-Head",
  "leagueId": 12345,
  "entryId": 67890
}
```

A Draft league ID can be found in the network request:

```text
/api/league/12345/details
```

The Draft entry ID is visible in the Draft Points page URL / API request containing:

```text
/api/entry/67890/event/<GW>
```

D1 and D2 are independent, so use the correct league ID and entry ID for each.

### Golden Eagles C1

A stable public Challenge API has not been assumed. The current known C1 squad remains available as fallback.

If you later have a JSON endpoint that returns C1 fields, set:

```json
"sourceUrl": "https://example.com/c1.json"
```

The updater merges that JSON into the C1 record.

## Home Assistant setup — no configuration.yaml required

The easiest setup is a **Webpage / iframe card**.

### Through the Home Assistant UI

1. Open your Home Assistant dashboard.
2. Select **Edit dashboard**.
3. Select **Add card**.
4. Choose **Webpage**.
5. Use this URL:

```text
https://vasanthan1276.github.io/arsenal-e1002/ha.html
```

6. Give it a large vertical height so the dashboard has room to scroll.

A YAML example is also included at:

```text
home-assistant/webpage-card.yaml
```

## E1002 setup

Continue using the root GitHub Pages URL:

```text
https://vasanthan1276.github.io/arsenal-e1002/
```

The root `index.html` remains fixed at exactly **800×480** for the E1002.

## Running manually in GitHub

Go to:

```text
Actions → Update Arsenal + Fantasy Hub → Run workflow
```

This performs all updates in one run:

1. update Arsenal football data
2. update Squad Watch
3. update Fantasy data
4. rebuild E1002 page
5. rebuild Home Assistant page
6. commit generated JSON / HTML changes

Fantasy and Squad Watch are intentionally non-blocking. If an external source is temporarily unavailable, the main Arsenal page still rebuilds and the previous Fantasy / Squad Watch data remains usable.

## Local rendering

No npm packages are required. Node.js 22 is enough.

```bash
node scripts/render-static-dashboard.mjs
node scripts/render-home-assistant.mjs
```

To fetch live data as well:

```bash
FOOTBALL_DATA_TOKEN=your_token node scripts/update-football.mjs
node scripts/update-squad-watch.mjs
node scripts/update-fantasy.mjs
node scripts/render-static-dashboard.mjs
node scripts/render-home-assistant.mjs
```

## Data sources

- Football-Data.org API — Premier League table, Arsenal fixtures and results
- Fantasy Premier League public API — Main FPL player, entry, gameweek and league data
- Fantasy Premier League Draft endpoints — Draft entry / league data
- FPL bootstrap data — Arsenal availability information
- Google News RSS — lightweight Arsenal transfer-watch feed

## September 2026 live-data hardening

The Fantasy updater now accepts both array-shaped Classic FPL live data and object-shaped FPL Draft live data. Main FPL, D1 and D2 are updated independently, so a temporary issue with one source does not discard successful updates from the others. The workflow no longer hides Fantasy updater failures behind `continue-on-error`.

Squad Watch also filters transfer/departure news from FPL availability text so a player who has joined another club is not incorrectly displayed as an Arsenal injury.

## Troubleshooting

### E1002 still shows the previous layout

Check that GitHub Actions completed and GitHub Pages has deployed the new `index.html`. Then refresh / republish the E1002 page if necessary.

### Home Assistant shows an old page

Reload the iframe card or refresh the Home Assistant client. The GitHub Pages HTML itself is regenerated by the workflow.

### Fantasy points show `—`

The fallback squad is active. Add the correct numeric IDs to `config/fantasy-config.json` and manually run the workflow once.

### Draft squad is not updating

Confirm both `leagueId` and `entryId` are from the correct Draft league. D1 and D2 must not share IDs unless they genuinely point to the same league / entry.

### C1 does not update automatically

That is expected until a stable Challenge source is configured. The fallback preserves the last known Challenge squad.

---

This repository is intentionally kept dependency-free and static so the same data pipeline can reliably serve a low-power e-paper display and Home Assistant without running another server.

### Configured Draft IDs (Sep 2026)

The verified team mapping is:

- **Golden Eagles D1** — league `66570`, entry `351274`
- **Golden Eagles D2** — league `66701`, entry `351935`

These entry IDs are intentionally different from the initial URL-order assumption; live squad validation showed the first mapping was reversed. The updater also derives Draft total/rank from the league standings table when the API does not expose the top-level row fields directly.

## SenseCraft HMI compatibility note

The E1002 `index.html` now deliberately uses the same proven DOM/CSS structure as the earlier Arsenal dashboard that rendered successfully in SenseCraft. The generated file is ASCII-only, uses a standard `width=device-width` viewport, contains no JavaScript or external assets, and keeps the E1002 view focused on Arsenal fixtures, Squad Watch, and the full league table.

Fantasy detail remains available in `ha.html` for Home Assistant. This separation is intentional: it preserves the reliable E1002 renderer while keeping the richer Main FPL / D1 / D2 / C1 experience in Home Assistant.

A small `sensecraft-test.html` file remains included for renderer diagnostics.


## E1002 delivery method — static PNG

The E1002 now uses a rendered **800 x 480 PNG** instead of asking SenseCraft's Web renderer to interpret a large HTML/CSS dashboard.

The workflow generates:

- `e1002.png` — the actual E1002 dashboard image
- `index.html` — a tiny wrapper that displays `e1002.png`
- `ha.html` — the separate rich Home Assistant dashboard

### Recommended SenseCraft setup

Use **Gallery** and import this public image URL:

`https://vasanthan1276.github.io/arsenal-e1002/e1002.png`

This is the most reliable option for the E1002.

You can also test the tiny Web wrapper:

`https://vasanthan1276.github.io/arsenal-e1002/index.html`

If the Web function remains unreliable, keep using Gallery with the PNG URL.

### Automatic updates

GitHub Actions regenerates `e1002.png` from the same `football.json` and `fantasy.json` data on the normal schedule. No API calls are made by the E1002 itself.
