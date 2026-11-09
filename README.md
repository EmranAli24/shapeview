# ShapeView

Client-side shapefile viewer. Files are parsed entirely in the browser — nothing is uploaded,
and there is no backend. Builds to static files.

Built for CSE 618 — Geographic Information System Lab, University of Chittagong (Group 08),
from the ShapeView design prototype.

**Live demo:** https://shape-view-csecu.netlify.app/

## Team & credits

A Group 08 team project. The bundled sample (`Group08_Station`) holds 20 landmarks the team
surveyed by GPS around the Shuttle Train Station area of the University of Chittagong.

- Md. Abdullah Al Mamun Emon
- Emran Ali
- Saad Al Mahmud
- Md Faysal Ahmed Fahim
- Omar Faruk

Course teacher: Professor Rashed Mustafa, Ph.D., Department of Computer Science and Engineering,
University of Chittagong.

This repository holds the web app from the group's lab repository
([emon4075/GIS-Lab](https://github.com/emon4075/GIS-Lab/tree/master/Task%2002%20-%20Web%20App)),
with its original commit history kept.

## Features

- **Load** a zipped shapefile, or loose `.shp` + `.shx` + `.dbf` (+ `.prj`, `.cpg`) files, by
  drag-and-drop or file picker. A bundled sample dataset (`Group08_Station`) loads through the
  same parser.
- **Map** — four basemaps (light / dark / terrain / imagery), optional graticule with degree
  labels, live cursor coordinates, zoom level and a nice-number scale bar.
- **Layers** — multiple layers with reordering, visibility toggles, per-layer symbology
  (fill, stroke, opacity, stroke width, point radius) and metadata (size, GeoJSON geometry type
  with its feature count, the shape type code read from the `.shp` header, CRS, extent,
  attribute field types).
- **Attribute table** — searchable across all fields, sortable columns, and two-way selection:
  click a feature on the map to scroll to its row, click a row to fly the map to the feature.
- **Measure** — distance along a path, area and perimeter of a polygon, or the latitude/longitude
  of a single point, with a unit dropdown (metres · kilometres · feet · miles · nautical miles;
  m² · km² · hectares · acres · sq ft · sq mi). Geodesic, not pixel-based.
- **Export** — the active layer as GeoJSON, or the current map view as a PNG with a caption bar
  carrying the layer name, zoom, scale and basemap attribution. The caption bar follows the UI
  theme.
- **Dark mode** — toggled from the header. The first visit follows the operating system's
  `prefers-color-scheme`; once you use the toggle, that choice is remembered.
- **Team** — the "Group 08" badge in the header opens the group's roster (names and student IDs).

## Stack

React 19 + Vite 7 (TypeScript) · Leaflet · shpjs · proj4 · JSZip · html-to-image

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm run typecheck
```

`vite.config.ts` sets `base: './'`, so `dist/` can be served from any static subdirectory
(GitHub Pages project site, a course server folder, or opened through a local file server).

## Project layout

```
src/
  App.tsx                 state container + page layout
  types.ts                Layer, LayerStyle, Selection, BasemapKey
  constants.ts            palettes, geometry colours, basemap definitions
  team.ts                 group label, course, roster  ← edit this for member names + IDs
  shpjs.d.ts              local types for shpjs 6 (see note below)
  hooks/
    useLeafletMap.ts      map init, basemap swapping, scale/cursor readout, graticule
    useLayerSync.ts       per-layer panes, GeoJSON groups, styling, selection
    useMeasure.ts         distance / area / location tools and their map graphics
    useTheme.ts           light/dark theme, OS default, localStorage persistence
  lib/
    loadShapefile.ts      zip / loose-file / sample loading
    crs.ts                proj4 CRS identification and reprojection
    shapeType.ts          shape type code from the .shp header (not a GeoJSON type)
    measure.ts            haversine distance, spherical area, unit conversion
    exportPng.ts          html-to-image capture + caption bar
    exportGeoJSON.ts      GeoJSON download
    format.ts             size, value and coordinate formatting
    errors.ts             AppError (title + message)
  components/             Sidebar, LayerCard, SymbologyPanel, LayerMetadata,
                          MapChrome, StatusBar, AttributeTable, AboutDialog
  styles.css              theme tokens, hover/focus rules, Leaflet overrides
public/sample/            bundled Group08_Station shapefile
```

## Team details

`src/team.ts` holds the group label, the course line and the member roster shown in the app's
team dialog. To change the roster, edit only that file. Nothing else needs changing; the dialog sizes itself to however many rows are listed, and the
footer and header badge read the course and group strings from the same file.

## Theming

Every colour is a CSS custom property declared on `:root` in `src/styles.css`, with the dark
palette as one `:root[data-theme='dark']` override block. Components reference `var(--sv-…)` from
their inline styles rather than hex literals, so there is no theme prop to thread anywhere. Two
deliberate exceptions: `GEOM_COLORS`/`PALETTE` in `constants.ts` are layer symbology *data*, and a
handful of `#ffffff` foregrounds sit on an accent or geometry-badge background in both themes.

`useTheme` reads `localStorage['shapeview:theme']`, falling back to `prefers-color-scheme`, and an
inline script in `index.html` stamps `data-theme` on `<html>` before the bundle loads so a stored
dark preference does not flash light.

Note that "dark" means two independent things here. `DARK_BASEMAPS` (and `darkBasemap` in
`exportPng.ts`) is about whether the map *tiles* are dark — it drives graticule contrast and the
backdrop of an exported image, and has nothing to do with the UI theme.

## Notes for maintainers

**Do not install `@types/shpjs`.** Version 3.4.7 describes shpjs 3/4: a CommonJS `export =`
namespace where `parseShp`/`parseDbf`/`combine` hang off the callable default. shpjs 6 is ESM
and exports them as named bindings, and it also accepts the `{ shp, dbf, cpg, prj }` object
form this app relies on. `src/shpjs.d.ts` describes the real v6 surface.

**Do not install `@types/proj4`** either — proj4 2.21 ships its own types.

**Why proj4 is a direct dependency** even though shpjs bundles it: shpjs reprojects to WGS 84
when it can read the `.prj`, but it handles failure inconsistently. `parseZip` calls
`proj4(prj)` *uncaught*, so an unparseable `.prj` aborts the whole archive load with a
misleading "corrupt shapefile" error; the loose-file path swallows the same error and silently
leaves coordinates in their source projection, dropping the layer near (0, 0). So `lib/crs.ts`
parses the `.prj` itself first — stripping it from the archive and warning if proj4 cannot read
it — and after parsing checks the extent, reprojecting explicitly when the numbers are clearly
not degrees. It also supplies the EPSG code for WKT that carries no `AUTHORITY` node, which is
the case for the bundled sample's ESRI-flavour `GCS_WGS_1984` projection file.

**Measurement is spherical, not ellipsoidal.** `lib/measure.ts` uses haversine for distance and the
spherical-excess sum for area, both on the WGS 84 mean radius (6,371,008.8 m). Checked against
pyproj's true ellipsoidal geodesics, that reads **0.12% short on distance and 0.23% long on area** —
fine for a viewer, and the two stay consistent with each other because they share one radius. QGIS
and ArcGIS use ellipsoidal maths, so expect their last digits to differ.

**PNG export and CORS.** `html-to-image` inlines tile images, which requires the basemap to send
CORS headers. CARTO and Esri both do. If a future basemap does not, the capture taints the canvas
and the export reports that clearly rather than failing silently.
