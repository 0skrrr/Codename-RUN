# Map and hex grid

Status: prototyping the base map and testing hex visuals in the hex lab. See [ADR 0003](../decisions/0003-hex-overlay-on-osm.md).

## Behaviour
- Normal OpenStreetMap-style base map.
- Hex grid drawn on top, computed for the visible area with H3.
- Owned hexes coloured by owner; strategic points and bases drawn as icons.

## Open questions
- Hex size. The team's favourite reference is street-level hexes (H3 resolution 11 or 12). Decide by prototyping.

## Map data prototype

A pipeline for testing how to draw the map from raw OpenStreetMap data, using the Zlín district (okres Zlín) as the example.

```
Geofabrik (Czech Republic .pbf) ──osmium──▶ data/osm/zlin-district.osm ──convert──▶ data/geojson/zlin-district/*.geojson ──▶ map viewer
```

### Run it
```bash
pnpm install
pnpm osm:fetch:zlin      # first run downloads the Czech Republic (~950 MB), then cuts out okres Zlín
pnpm osm:convert:zlin    # .osm → one GeoJSON file per layer + manifest.json
pnpm map:dev             # opens the viewer at http://localhost:5173
```
The viewer shows `zlin-district` by default. Any other converted dataset opens with `?dataset=<folder-name>`, e.g. `?dataset=small-town` after converting the test fixture:
```bash
node packages/osm/src/cli/convert.ts packages/osm/test/fixtures/small-town.osm data/geojson/small-town
```

### Where the pieces live
| Part | Path | Job |
|---|---|---|
| Extract script | `packages/osm/src/cli/extract.ts` | Downloads the Geofabrik country extract (cached) and cuts out one OSM boundary with osmium. |
| Parser | `packages/osm/src/parse.ts` | Streams `.osm` XML into nodes, ways and relations. |
| Layer builder | `packages/osm/src/layers.ts`, `classify.ts` | Turns OSM elements into GeoJSON layers by their tags. |
| Convert script | `packages/osm/src/cli/convert.ts` | Runs the parser and layer builder, writes files the viewer loads. |
| Viewer | `prototypes/map-viewer` | MapLibre page that draws the layers with our own colours. |

### Decisions and gotchas
- **The map data is not in git.** The Zlín `.osm` is hundreds of MB. GitHub rejects files over 100 MB, and every version would stay in history forever. `data/osm/` and `data/geojson/` are gitignored; the fetch script recreates them. The only OSM file in git is the tiny hand-written test fixture.
- **Map data comes from Geofabrik, not Overpass.** Public Overpass servers timed out on an area this size again and again. Geofabrik publishes a fresh country extract daily; we download it once and cut areas out locally, which takes seconds and never fails on someone else's server load.
- **osmium is required.** `brew install osmium-tool` on macOS, `apt install osmium-tool` on Linux. The extract script checks for it and says so.
- **The country file is cached.** `data/osm/czech-republic-latest.osm.pbf` is reused on later runs. Pass `--refresh` to download today's version: `node packages/osm/src/cli/extract.ts 440923 data/osm/zlin-district.osm --refresh`. Set `GEOFABRIK_PBF_URL` to use another country.
- **Which area:** okres Zlín is OSM relation `440923`. Other areas work by passing another relation id: `node packages/osm/src/cli/extract.ts <relation-id> data/osm/<name>.osm`. Find ids on openstreetmap.org by searching the place and opening its boundary relation.
- **Shapes crossing the border are kept whole.** osmium's `smart` strategy includes complete forests, lakes and roads that cross the district boundary, so they don't get cut or dropped.
- **The parser streams.** The whole file never sits in memory as text, only the parsed elements do.
- **Areas vs lines:** a closed way is an area only if its tags say so (building, landuse, water…). A closed `highway` such as a roundabout stays a line.
- **Multipolygons** (big forests, lakes with islands) are assembled from their member ways. If some member ways were missing from the file the ring couldn't close and the shape would be skipped; the `smart` extract strategy avoids that.
- **Coordinates are rounded to 6 decimals** (about 10 cm), which shrinks the GeoJSON noticeably.
- **No outside map tiles.** The viewer draws only what is in our data, so we see exactly what OSM gives us. Buildings appear from zoom 13 and footpaths from zoom 12, to keep the zoomed-out view fast.
- **MapLibre worker in Vite:** MapLibre runs a web worker from a separate file. Vite's dependency pre-bundling breaks the path to it, so `maplibre-gl` is excluded from pre-bundling, and the worker URL is set explicitly so production builds include the file.
- **Production builds copy the data.** `vite build` copies `data/geojson/` into the build output. That's fine for the prototype; a real app would serve map data from the API or tiles.

## Hex lab

The **Hex lab** settings (the sliders button in the top-right corner) are for deciding how the game should look. Every visual choice is a setting you can flip while looking at real Zlín streets:

| Group | What you can try |
|---|---|
| View | Flat top-down or 2.5D raised hexes, camera tilt |
| Base map | Fade the map, 3D buildings |
| Hex grid | On/off, hex size (H3 resolution 7–13, shown as edge length in metres), line colour, width, opacity |
| Territories | Fill / border / both, border around the whole area or also around every hex, opacity, border width, glowing edge, how far territory spreads around a run, height in 2.5D, different height per player |
| Zooming out | How big a hex must be on screen before hexes start to appear |
| Runs | Line / hexes it crossed / both, width, opacity, dashed |
| Trade routes | Line / chain of hexes / both, width fixed or by bandwidth, colour fixed or low→high bandwidth gradient, height in 2.5D, moving resource packets with speed and size |
| Demo scenario | Random seed, players, runs per player, run length, number of trade routes, "generate around current view" |

### Zooming out: areas far away, hexes up close
Each player's territory is always drawn as one merged area with a glowing edge. The hexes themselves (the grid, per-hex borders, hex chains of runs and trade routes) fade in only when you zoom close enough that a hex edge is about *Hexes appear when an edge is* pixels on screen (10 px by default), and are fully visible about ¾ of a zoom level later. The panel shows the exact zoom range, e.g. "between zoom 14.1 and 14.9" for 28 m hexes.

This replaced an earlier approach that switched to 7× bigger H3 hexes as you zoomed out. That redrew the territories only when you let go of the map, so shapes jumped and borders changed between zoom levels. Now nothing is recalculated while zooming: the fade is a zoom-based opacity expression in MapLibre, so it follows your fingers frame by frame. The grid is computed only once you are close enough to see it, for the visible area plus a 50 % margin, so panning doesn't reveal empty edges straight away.

### The demo scenario is fake
There is no game server yet, so the lab invents a scenario: each player gets a home intersection and does random walks along real roads from it. Territory is every hex a run crossed, plus N rings around it; contested hexes go to whoever ran through them more. Trade routes are longer walks with a random bandwidth between 10 and 1000. The same seed always gives the same scenario, so a saved preset shows the same picture for everyone.

### Sharing a view
The address bar always holds the current view as `#zoom/latitude/longitude/bearing/pitch`. Copy the link to show someone exactly what you're looking at; combine it with a preset for the full picture.

### Saving settings
- **Automatically:** the current settings are kept in your browser and come back on reload. The storage key ends in `.v2` since the switch to the dark map; settings saved before that (light grid colours, the removed zoomed-out options) are ignored once so the new defaults show.
- **Named presets (shared):** with `pnpm map:dev` running, *Save* writes `prototypes/map-viewer/presets/<name>.json`. Commit those files to share a look with the team; *Load* reads them.
- **Export / import:** download the settings as a file or load one, e.g. to send over chat. Works without the dev server.

Every loaded or imported value is checked against the setting's allowed range or options; anything invalid falls back to the default.

### Adding a new option
Add a key to `Settings`, a default to `DEFAULT_SETTINGS` and a control to `CONTROL_GROUPS` in `prototypes/map-viewer/src/lab/settings.ts`, apply it in `labLayers.ts`, and add the label to `locales/en.json` and `locales/cs.json`. The panel, saving and validation pick it up automatically; a test fails if a label is missing.

## Look and layout

The map follows a dark "game" style with Apple's interface conventions on top:

- **Dark base map.** Land, roads and buildings are near-black and grey so the bright player colours are the loudest thing on screen. Footpaths appear from zoom 14.5, buildings from 14 and municipal boundaries from 11, which keeps the zoomed-out view calm. Colours live in `COLORS` in `prototypes/map-viewer/src/mapStyle.ts`; player colours in `PLAYER_COLORS` in `src/lab/scenario.ts`.
- **The map fills the screen.** A bar in the top-left shows the dataset and every player with a glowing colour dot and their territory size in hexes (compact numbers, "1,3 tis."). All settings, layers and the hex lab live in a sheet behind the sliders button in the top-right. The sheet does not dim or block the map, so you can keep panning while it is open. It remembers whether it was open.
- **The sheet slides in from the edge it belongs to:** from the right on desktop, from the bottom on phones, and leaves the same way (320 ms, iOS drawer curve `--ease-drawer`). It's a CSS transition, so tapping the button again mid-slide reverses it from where it is. Escape or the × button closes it.
- **Translucent material.** The bar, sheet, card and map controls float over the map with a blurred, semi-transparent dark background.
- **Accessibility settings are respected.** *Reduce transparency* and *Increase contrast* make the surfaces solid. *Reduce motion* turns the sheet slide into a short fade and turns the other transitions off.
- **Other motion is short and only where it explains something.** Setting groups open and close with a 200 ms height transition and a rotating chevron (`::details-content`; browsers without it just open instantly). Buttons scale down slightly while pressed (100 ms). The feature card fades in over 150 ms.
- **Clicked features open a floating card** under the top bar, not a section inside the settings, where the result used to land out of sight. It closes with its × button, Escape, or a click on empty map.
- **Feature types are translated.** OSM tag values like `yes`, `motorway_link` or `farm_auxiliary` are shown as "Budova", "Nájezd na dálnici", "Hospodářská budova". The list of translated values is `TRANSLATED_KINDS` in `prototypes/map-viewer/src/featureKind.ts` and covers everything that appears in okres Zlín; any other value is shown with underscores turned into spaces. Boundaries show their administrative level. A test fails if a listed value has no text in some language.
- **Names can be right-to-left.** The card's title uses `dir="auto"`, so Arabic or Hebrew names read correctly.
- **No toasts yet.** Preset messages ("Saved", "Import failed") are still a line of text in the settings sheet. A toast library like Sonner needs React, and the viewer is plain TypeScript; adding React just for toasts isn't worth it for a prototype.

## Testing with worst-case data

Demo data is kind: short names, every field filled in. `prototypes/map-viewer/fixtures/worst-case.osm` is the opposite: an 80-character hospital name, a school with its full legal name, a one-letter pub name, emoji, an Arabic (right-to-left) name, a website used as a name, buildings and roads with no name, and raw tag values like `yes`, `construction` and `motorway_link`.

```bash
pnpm map:fixtures   # converts the small-town and worst-case fixtures into data/geojson/
pnpm map:dev
```

With the dev server running, a switch at the bottom of the screen flips between **Demo data**, **Worst case**, **Missing** (a dataset that doesn't exist, with a long name) and **Zlín**. It only exists in `pnpm map:dev`, never in a production build.
