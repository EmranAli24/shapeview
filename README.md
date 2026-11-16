# ShapeView

ShapeView is a browser-based shapefile viewer. You can drop in a shapefile, see it on a map,
browse its attribute table, take measurements and export the result. Everything runs in the
browser. There is no backend and no file is uploaded anywhere.

It was built for **CSE 618 (Geographic Information System Lab)**, Department of Computer Science
and Engineering, University of Chittagong, by Group 08.

**Live demo:** https://shape-view-csecu.netlify.app/

## Features

- **Load data** from a zipped shapefile or from loose `.shp`, `.shx`, `.dbf` (plus optional `.prj`
  and `.cpg`) files, by drag and drop or the file picker. A sample dataset is bundled.
- **Map** with four basemaps (light, dark, terrain, imagery), a graticule, live cursor
  coordinates, zoom level and a scale bar.
- **Layers**: several layers at once, reordering, show/hide, and per-layer styling (fill, stroke,
  opacity, stroke width, point size).
- **Layer metadata**: file size, geometry type and feature count, the shape type code from the
  `.shp` header, CRS, extent and attribute field types.
- **Attribute table** with search, column sorting and two-way selection (click a feature to find
  its row, click a row to zoom to the feature).
- **Measure** distance, area/perimeter and point coordinates, with a choice of units.
- **Export** the active layer as GeoJSON, or the current map view as a PNG.
- **Dark mode** that follows the OS setting until you toggle it.

## Tech stack

React 19, TypeScript, Vite, Leaflet, [shpjs](https://github.com/calvinmetcalf/shapefile-js),
proj4, JSZip, html-to-image.

## Getting started

You need Node.js 18 or newer.

```bash
git clone https://github.com/EmranAli24/shapeview.git
cd shapeview
npm install
npm run dev
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |

`dist/` uses relative paths, so it can be hosted from any static folder (Netlify, GitHub Pages,
a course server).

> On Windows, Vite's default port 5173 is sometimes reserved by the system. If the dev server
> fails with `EACCES`, pick another port: `npm run dev -- --port 5300`.

## Usage

1. Click **Load sample data**, or drop your own `.zip` / loose shapefile parts on the left panel.
2. Use the layer card to zoom, restyle, reorder or remove the layer.
3. Open the attribute table at the bottom to search and sort features.
4. Pick **Distance**, **Area** or **Location** on the map to measure. Double-click to finish a
   line or polygon.
5. Use **Download GeoJSON** or **Export map PNG** in the header to save your work.

## Sample data

`public/sample/Group08_Station.*` holds 20 points the group surveyed around the Shuttle Train
Station at the University of Chittagong (about 22.47 N, 91.79 E), in WGS 84.

## Project structure

```
src/
  App.tsx             application state and page layout
  types.ts            shared types (Layer, LayerStyle, Selection, ...)
  constants.ts        basemaps, palettes and limits
  team.ts             group name, course line and member list
  shpjs.d.ts          type declarations for shpjs 6
  hooks/              useLeafletMap, useLayerSync, useMeasure, useTheme
  lib/                shapefile loading, CRS handling, measuring, exports
  components/         sidebar, layer card, attribute table, map controls, dialogs
  styles.css          theme variables and component styles
public/sample/        bundled sample shapefile
```

## Implementation notes

- **CRS handling.** shpjs reprojects to WGS 84 but copes badly with an unreadable `.prj`: the zip
  path throws a misleading "corrupt shapefile" error and the loose-file path silently keeps the
  original coordinates. `src/lib/crs.ts` therefore parses the `.prj` with proj4 first, warns if it
  cannot be read, and reprojects explicitly if the extent does not look like degrees.
- **Measurements** use the haversine formula and a spherical area sum on the WGS 84 mean radius.
  Compared with ellipsoidal results this is about 0.12% short on distance and 0.23% long on area,
  so QGIS or ArcGIS will differ in the last digits.
- **PNG export** needs basemap tiles served with CORS headers. The Esri and OpenStreetMap tile
  servers used here do this.
- **Typings.** Do not install `@types/shpjs` (it describes shpjs 3/4) or `@types/proj4` (proj4
  ships its own). `src/shpjs.d.ts` covers the shpjs 6 API used here.

## Team (Group 08)

- Md. Abdullah Al Mamun Emon
- Emran Ali
- Saad Al Mahmud
- Md Faysal Ahmed Fahim
- Omar Faruk

Course teacher: Professor Rashed Mustafa, Ph.D., Department of Computer Science and Engineering,
University of Chittagong.

Basemap tiles: Esri, HERE, Garmin, OpenStreetMap contributors.
