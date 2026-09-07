# Arsenal E1002 + Home Assistant Fantasy Hub

A single GitHub Pages project for:

1. **Seeed Studio reTerminal E1002** — direct static `arsenal.bmp`
2. **Home Assistant** — richer responsive `ha.html`
3. **Browser / diagnostic preview** — generated `index.html`

The project combines Arsenal fixtures, Premier League standings, recent Arsenal form/results, Squad Watch, and Fantasy Premier League information in one GitHub Actions pipeline.

---

## Production URLs

### E1002 — direct BMP

Use this URL in **SenseCraft HMI**:

```text
https://vasanthan1276.github.io/arsenal-e1002/arsenal.bmp
```

This is the production E1002 output.

Resolution:

```text
800 × 480
```

### Home Assistant

```text
https://vasanthan1276.github.io/arsenal-e1002/ha.html
```

### Browser / diagnostic preview

```text
https://vasanthan1276.github.io/arsenal-e1002/
```

or:

```text
https://vasanthan1276.github.io/arsenal-e1002/index.html
```

The physical E1002 should use `arsenal.bmp`, not the HTML preview.

---

# BMP-first E1002 architecture

From September 2026 onward, the physical E1002 follows a common static-image standard:

```text
Football / FPL / news sources
          ↓
     GitHub Actions
          ↓
    normalized JSON
          ↓
 generated 800×480 HTML
          ↓
 Playwright screenshot
          ↓
     arsenal.bmp
          ↓
    SenseCraft HMI
          ↓
 reTerminal E1002
```

The E1002 does not need to:

- call Football-Data.org;
- call Fantasy Premier League APIs;
- fetch Google News RSS;
- execute JavaScript;
- wait for dynamic rendering;
- calculate standings or Fantasy data.

All of that work happens before the E1002 wakes.

`index.html` is retained as the deterministic 800×480 render source and browser preview.

`ha.html` remains the separate richer Home Assistant dashboard.

---

# E1002 dashboard content

The 800×480 Arsenal display includes:

- large **next Arsenal match** panel;
- Singapore kickoff time;
- recent Arsenal form;
- latest Arsenal result;
- next three fixtures;
- compact Arsenal-focused Premier League table;
- Arsenal position;
- Arsenal points;
- goal difference;
- Squad Watch for injuries / suspensions / transfer items;
- Fantasy strip for:
  - Main FPL
  - Golden Eagles D1
  - Golden Eagles D2
  - Golden Eagles C1

The generated layout uses solid high-contrast colours suitable for the E1002 e-paper display.

---

# Home Assistant dashboard

`ha.html` provides a larger responsive Arsenal + Fantasy dashboard.

Tabs include:

- Overview
- Main FPL
- Golden Eagles D1
- Golden Eagles D2
- Golden Eagles C1

Depending on available live data it can show:

- gameweek points;
- total points;
- overall / league rank;
- Main FPL starting XI and bench;
- captain and vice-captain;
- individual player gameweek points;
- Main FPL leagues;
- Draft squads;
- Draft standings.

If a live source is unavailable, fallback / previously generated data can remain available rather than making the whole page unusable.

---

# Tracked Fantasy teams

## Main FPL

The Main FPL entry is configured in:

```text
config/fantasy-config.json
```

No FPL API key is required for the public read-only FPL endpoints used by this project.

## Golden Eagles D1

- FPL Draft
- 8-team league
- Head-to-Head scoring

Verified mapping as of September 2026:

```text
League ID: 66570
Entry ID:  351274
```

## Golden Eagles D2

- FPL Draft
- 8-team league
- Classic scoring

Verified mapping as of September 2026:

```text
League ID: 66701
Entry ID:  351935
```

## Golden Eagles C1

Fantasy Premier League Challenge.

A stable public Challenge API is not assumed. The project can preserve fallback Challenge data until a reliable source is configured.

---

# Repository structure

Important files:

```text
arsenal-e1002/
│
├── .github/
│   └── workflows/
│       └── update-football.yml
│
├── config/
│   └── fantasy-config.json
│
├── data/
│   ├── football.json
│   └── fantasy.json
│
├── home-assistant/
│   └── webpage-card.yaml
│
├── scripts/
│   ├── update-football.mjs
│   ├── update-squad-watch.mjs
│   ├── update-fantasy.mjs
│   ├── render-static-dashboard.mjs
│   ├── render-home-assistant.mjs
│   ├── render-e1002-bmp.mjs
│   └── png_to_bmp.py
│
├── arsenal.bmp
├── index.html
├── ha.html
└── README.md
```

Older files such as `e1002.png` or `sensecraft-test.html` may remain for historical or diagnostic purposes, but **`arsenal.bmp` is the production E1002 file**.

---

# Automatic update flow

Workflow:

```text
.github/workflows/update-football.yml
```

Workflow name:

```text
Update Arsenal + Fantasy Hub
```

Schedule:

```cron
17 */2 * * *
```

This provides an update opportunity approximately every two hours.

The workflow can also be run manually:

```text
GitHub
→ Actions
→ Update Arsenal + Fantasy Hub
→ Run workflow
```

The workflow performs:

1. update Arsenal football data;
2. update Squad Watch;
3. update Fantasy teams;
4. generate the fixed 800×480 `index.html`;
5. generate the responsive Home Assistant `ha.html`;
6. render `index.html` in headless Chromium at exactly 800×480;
7. capture an 800×480 PNG internally;
8. convert it to `arsenal.bmp`;
9. validate that the output is exactly 800×480;
10. commit the generated data / pages / BMP to the repository.

---

# Data sources

The project uses:

- **Football-Data.org API**
  - Premier League standings
  - Arsenal fixtures
  - Arsenal recent results

- **Fantasy Premier League public API**
  - Main FPL entry
  - player / gameweek data
  - league data

- **Fantasy Premier League Draft endpoints**
  - Draft entry data
  - Draft league data

- **FPL bootstrap data**
  - player availability information

- **Google News RSS**
  - lightweight Arsenal transfer-watch information

---

# Required GitHub secret

Keep the existing repository secret:

```text
FOOTBALL_DATA_TOKEN
```

It is used by:

```text
scripts/update-football.mjs
```

---

# Configure live Fantasy data

Edit:

```text
config/fantasy-config.json
```

## Main FPL

Example:

```json
"main": {
  "name": "Main FPL",
  "entryId": 1234567,
  "leagueIds": []
}
```

The entry ID is the number in a URL such as:

```text
https://fantasy.premierleague.com/entry/1234567/event/3
```

If `leagueIds` is empty, the updater can use leagues returned from the entry profile.

## Draft D1 / D2

Each Draft team needs the correct league ID and entry ID.

Example:

```json
{
  "key": "d1",
  "name": "Golden Eagles D1",
  "format": "FPL Draft",
  "scoring": "Head-to-Head",
  "leagueId": 66570,
  "entryId": 351274
}
```

D1 and D2 are independent and must use their own verified IDs.

---

# Home Assistant setup

The easiest method is a Home Assistant **Webpage** card.

Use:

```text
https://vasanthan1276.github.io/arsenal-e1002/ha.html
```

No `configuration.yaml` change is required for the webpage-card approach.

---

# SenseCraft HMI setup

For the physical E1002 use:

```text
https://vasanthan1276.github.io/arsenal-e1002/arsenal.bmp
```

Target dimensions:

```text
Width:  800
Height: 480
```

The E1002 should no longer use the root `index.html` as its normal production source.

## Important crop / copied-page note

When changing an existing SenseCraft page from HTML or PNG to a direct BMP, old crop / scale / position settings may remain associated with a copied page.

If the BMP preview shows:

- a large black area;
- only part of the dashboard;
- the dashboard shifted vertically;
- unexpected zoom or crop;

first test the BMP in a **brand-new SenseCraft page** with no inherited crop/zoom settings.

Do not modify the GitHub renderer only to compensate for stale SenseCraft crop settings unless the BMP itself is also wrong when opened directly in a browser.

---

# BMP generation validation

`scripts/render-e1002-bmp.mjs` renders the generated `index.html` in Chromium using:

```text
Viewport: 800 × 480
Device scale factor: 1
```

Before taking the screenshot it validates that the rendered document has not exceeded the 800×480 E1002 canvas.

`scripts/png_to_bmp.py` then checks the intermediate screenshot dimensions again before saving:

```text
arsenal.bmp
```

The BMP is RGB and exactly 800×480.

---

# Troubleshooting

## `arsenal.bmp` does not exist

Run:

```text
Actions
→ Update Arsenal + Fantasy Hub
→ Run workflow
```

Confirm these workflow steps succeed:

```text
Install E1002 render dependencies
Generate static E1002 HTML source
Render direct E1002 BMP
Commit updated dashboards
```

## GitHub Action fails during Chromium installation

Check the log for:

```text
Install E1002 render dependencies
```

The workflow installs Playwright and Chromium on the GitHub runner.

## `arsenal.bmp` is the wrong size

The workflow should fail rather than commit an incorrectly sized BMP.

Expected size:

```text
800 × 480
```

## SenseCraft shows an old image

1. open the BMP URL directly in a browser;
2. verify GitHub Pages has deployed the latest commit;
3. reopen or refresh the SenseCraft page;
4. republish if necessary.

## SenseCraft crops the BMP

Create a new clean SenseCraft page and use the direct BMP URL without inherited crop / zoom settings.

## Home Assistant shows an old dashboard

Refresh the Home Assistant webpage card / client.

The Home Assistant page remains:

```text
https://vasanthan1276.github.io/arsenal-e1002/ha.html
```

## Fantasy points show `—`

Check:

```text
config/fantasy-config.json
```

and confirm the configured entry / league IDs are correct.

## C1 does not update automatically

This can be expected until a reliable FPL Challenge source is configured.

---

# September 2026 architecture standard

The Arsenal project now follows the same preferred physical-E1002 delivery model as the F1 and calendar projects:

```text
External data
    ↓
GitHub Actions
    ↓
Pre-rendered 800×480 BMP
    ↓
SenseCraft HMI
    ↓
E1002
```

This keeps API work and rendering off the battery-powered E1002 and provides a consistent page-delivery method across the project.

---

# Current production links

```text
Arsenal E1002:
https://vasanthan1276.github.io/arsenal-e1002/arsenal.bmp

Arsenal browser preview:
https://vasanthan1276.github.io/arsenal-e1002/

Home Assistant:
https://vasanthan1276.github.io/arsenal-e1002/ha.html
```
