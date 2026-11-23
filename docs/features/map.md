# Map and hex grid

Status: prototyping the base map and testing hex visuals in the hex lab. See [ADR 0003](../decisions/0003-hex-overlay-on-osm.md).

## Behaviour
- Normal OpenStreetMap-style base map.
- Hex grid drawn on top, computed for the visible area with H3.
- Owned hexes coloured by owner; strategic points and bases drawn as icons.

## Open questions
- Hex size. The team's favourite reference is street-level hexes (H3 resolution 11 or 12). Decide by prototyping.
- What zoomed-out views show (merged areas instead of single hexes).

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

The viewer's **Hex lab** panel is for deciding how the game should look. Every visual choice is a setting you can flip while looking at real Zlín streets:

| Group | What you can try |
|---|---|
| View | Flat top-down or 2.5D raised hexes, camera tilt |
| Base map | Fade the map, 3D buildings |
| Hex grid | On/off, hex size (H3 resolution 7–13, shown as edge length in metres), line colour, width, opacity |
| Territories | Fill / border / both, border around every hex or around the whole area, opacity, border width, how far territory spreads around a run, height in 2.5D, different height per player |
| Zoomed-out view | Simplify into bigger hexes when zoomed out, smallest hex size on screen, minimum dominance to colour a hex, fade contested areas, grid follows the simplified size |
| Runs | Line / hexes it crossed / both, width, opacity, dashed |
| Trade routes | Line / chain of hexes / both, width fixed or by bandwidth, colour fixed or low→high bandwidth gradient, height in 2.5D, moving resource packets with speed and size |
| Demo scenario | Random seed, up to 200 players, runs per player, run length, number of trade routes, play area radius, % of the map filled by territories, "generate around current view" |

### Crowded maps
*Map filled by territories* grows every player's territory outward from their runs, one ring at a time and all players at the same pace, until that share of the *play area* (a circle around the scenario centre) is claimed. That gives neighbourhood-like areas and a full map without thousands of fake runs. For tiny hex sizes the growth runs on a coarser grid (at most 150,000 hexes) and is then split back down. Beyond the 8 hand-picked player colours, extra players get evenly spread hues.

### Zoomed-out simplification
Zoomed out, the real-size hexes would be specks. With *Simplify when zoomed out* on, the lab switches to coarser H3 hexes whenever hexes would be smaller than the chosen number of pixels on screen. Every H3 hex has one parent about 7× bigger, so each big hex gathers the small hexes inside it and takes the colour of the player who owns the most of them. Details like exact borders disappear on purpose.

- *Who gets a big hex* picks the rule: **most of the claimed land** (the leader among owned small hexes wins, even if most of the area is unclaimed) or **over 50% of the whole hex** (a player must own more than half of the big hex's entire area, unclaimed land included; *minimum dominance* is ignored).
- *Minimum dominance* leaves a big hex uncoloured unless its leader owns at least that share of the owned hexes inside it.
- *Fade contested areas* makes big hexes more transparent the closer the fight is (2.5D blocks don't fade; MapLibre can't vary extrusion opacity per hex).
- The panel shows which resolution is being drawn, e.g. "resolution 7 (edge ≈ 1,406 m)".

### The demo scenario is fake
There is no game server yet, so the lab invents a scenario: each player gets a home intersection and does random walks along real roads from it. Territory is every hex a run crossed, plus N rings around it; contested hexes go to whoever ran through them more. Trade routes are longer walks with a random bandwidth between 10 and 1000. The same seed always gives the same scenario, so a saved preset shows the same picture for everyone.

### Sharing a view
The address bar always holds the current view as `#zoom/latitude/longitude/bearing/pitch`. Copy the link to show someone exactly what you're looking at; combine it with a preset for the full picture.

### Saving settings
- **Automatically:** the current settings are kept in your browser and come back on reload.
- **Named presets (shared):** with `pnpm map:dev` running, *Save* writes `prototypes/map-viewer/presets/<name>.json`. Commit those files to share a look with the team; *Load* reads them.
- **Export / import:** download the settings as a file or load one, e.g. to send over chat. Works without the dev server.

Every loaded or imported value is checked against the setting's allowed range or options; anything invalid falls back to the default.

### Adding a new option
Add a key to `Settings`, a default to `DEFAULT_SETTINGS` and a control to `CONTROL_GROUPS` in `prototypes/map-viewer/src/lab/settings.ts`, apply it in `labLayers.ts`, and add the label to `locales/en.json` and `locales/cs.json`. The panel, saving and validation pick it up automatically; a test fails if a label is missing.
