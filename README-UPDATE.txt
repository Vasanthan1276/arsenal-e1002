ARSENAL + FANTASY HUB v7

Purpose
- Restore the improved E1002 Arsenal + Fantasy renderer used before the SenseCraft-preview troubleshooting detour.
- Keep the E1002 page separate from Home Assistant and do not add PNG/image-renderer workarounds.
- Improve the Home Assistant overview and team tabs.

Home Assistant improvements
- Replaces the stale "Data status / configure IDs" panel with a compact Fantasy Snapshot.
- Shows Main FPL overall rank and mini-league position.
- Shows D1 and D2 Draft league positions plus useful gap-to-top context when available.
- Shows the Main FPL captain and captain contribution.
- Shows best current GW contribution.
- Shows current data freshness without a large instruction panel.
- C1 Challenge is visually marked as FALLBACK and has a dedicated explanation.
- Main FPL detail includes captain, active chip, team value and bank when supplied.
- Draft detail includes best GW scorer, league gap and H2H league points where applicable.
- Your own Draft row is highlighted in standings.

E1002
- scripts/render-static-dashboard.mjs is restored from the improved combined v3 package.
- The workflow again runs the Node static E1002 renderer.
- No e1002.png or Python/Pillow image generation is used.

Important
After uploading the files, manually run the "Update Arsenal + Fantasy Hub" workflow once. This regenerates index.html and ha.html from the latest live data.
