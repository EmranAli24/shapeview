import type { Theme } from '../hooks/useTheme';
import { AppError } from './errors';
import { download } from './exportGeoJSON';

const BAR_HEIGHT = 28;
const PIXEL_RATIO = 2;

const CAPTION_COLORS: Record<Theme, { bar: string; rule: string; left: string; right: string }> = {
  light: { bar: '#ffffff', rule: '#e6eaf0', left: '#475467', right: '#667085' },
  dark: { bar: '#171b22', rule: '#262c36', left: '#c6cedb', right: '#8b95a5' },
};

export interface PngExportOptions {
  layerName: string | null;
  zoom: number;
  scaleLabel: string;
  attribution: string;
  darkBasemap: boolean;
  theme: Theme;
}

function waitForTiles(element: HTMLElement, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const tiles = Array.from(element.querySelectorAll<HTMLImageElement>('img.leaflet-tile'));
      const pending = tiles.filter((t) => !t.complete || !t.naturalWidth).length;
      if (!pending || Date.now() - started > timeoutMs) resolve();
      else setTimeout(tick, 180);
    };
    tick();
  });
}

function attributionText(html: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = html.replace(/<[^>]+>/g, '');
  return el.value.replace(/\s+/g, ' ').trim();
}

function clipToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (maxWidth <= 12) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(clipped + '…').width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return clipped + '…';
}

export async function exportMapPng(
  mapElement: HTMLElement,
  options: PngExportOptions,
  onProgress: (message: string, pct: number) => Promise<void> | void,
): Promise<void> {
  await onProgress('Waiting for map tiles…', 25);
  await waitForTiles(mapElement);

  await onProgress('Compositing map image…', 60);

  const width = Math.round(mapElement.getBoundingClientRect().width);
  const height = Math.round(mapElement.getBoundingClientRect().height);
  const background = options.darkBasemap ? '#1a1c22' : '#e9edf2';
  const caption = CAPTION_COLORS[options.theme];

  const { toCanvas } = await import('html-to-image');

  let mapCanvas: HTMLCanvasElement;
  try {
    mapCanvas = await toCanvas(mapElement, {
      pixelRatio: PIXEL_RATIO,
      backgroundColor: background,
      skipFonts: true,
      filter: (node) =>
        !(node instanceof Element && node.classList.contains('leaflet-control-container')),
    });
  } catch {
    throw new AppError(
      'Map image export failed',
      'The browser blocked the capture — usually a basemap tile that refused cross-origin access. ' +
        'Switch basemap (Light or Dark), let the tiles finish loading, then export again.',
    );
  }

  await onProgress('Drawing caption…', 85);

  const out = document.createElement('canvas');
  out.width = width * PIXEL_RATIO;
  out.height = (height + BAR_HEIGHT) * PIXEL_RATIO;

  const ctx = out.getContext('2d');
  if (!ctx) {
    throw new AppError('Map image export failed', 'This browser did not provide a 2D canvas context.');
  }
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height + BAR_HEIGHT);
  ctx.drawImage(mapCanvas, 0, 0, width, height);

  ctx.fillStyle = caption.bar;
  ctx.fillRect(0, height, width, BAR_HEIGHT);
  ctx.fillStyle = caption.rule;
  ctx.fillRect(0, height, width, 1);
  ctx.font = '500 11px "IBM Plex Mono", monospace';

  const pad = 10;
  const gap = 18;
  const available = width - pad * 2 - gap;
  const attribution = attributionText(options.attribution);
  const rightText = clipToWidth(ctx, attribution, Math.min(ctx.measureText(attribution).width, available * 0.55));
  const leftText =
    (options.layerName ? options.layerName + '  ·  ' : '') +
    'Z ' +
    options.zoom +
    '  ·  ' +
    options.scaleLabel +
    '  ·  ShapeView';

  ctx.fillStyle = caption.right;
  ctx.textAlign = 'right';
  ctx.fillText(rightText, width - pad, height + BAR_HEIGHT - 10);

  ctx.textAlign = 'left';
  ctx.fillStyle = caption.left;
  ctx.fillText(clipToWidth(ctx, leftText, available - ctx.measureText(rightText).width), pad, height + BAR_HEIGHT - 10);

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new AppError(
      'Map image export failed',
      'The browser blocked the capture — usually a basemap tile that refused cross-origin access. ' +
        'Switch basemap (Light or Dark), let the tiles finish loading, then export again.',
    );
  }

  download(blob, 'shapeview-map.png');
}
