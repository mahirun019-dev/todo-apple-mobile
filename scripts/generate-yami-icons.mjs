import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const source = JSON.parse(await readFile(new URL('../src/brand/yami-mark.json', import.meta.url), 'utf8'));
const wordmark = JSON.parse(await readFile(new URL('../src/brand/yami-wordmark.json', import.meta.url), 'utf8'));
const paths = source.paths.map((path) => `<path d="${path.d}" fill="${path.fill}"/>`).join('');
const bladePaths = source.paths.slice(0, 2);
const faviconMark = bladePaths.map((path) => `<path d="${path.d}" fill="${path.fill}"/>`).join('');
const mark = `<g id="yami-mark">${paths}</g>`;
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${source.viewBox}" role="img" aria-label="Yami">${mark}</svg>`;
const maskPaths = source.paths.map((path) => `<path d="${path.d}" fill="#000"/>`).join('');
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${source.viewBox}">${maskPaths}</svg>`;
const wordmarkPaths = wordmark.strokes.map((path) => `<path d="${path}"/>`).join('');
const wordmarkGlint = source.paths[wordmark.glint.sourceMarkPathIndex];
const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${wordmark.viewBox}" role="img" aria-label="Yami"><g fill="none" stroke="#101114" stroke-linecap="${wordmark.strokeLinecap}" stroke-linejoin="${wordmark.strokeLinejoin}" stroke-width="${wordmark.strokeWidth}">${wordmarkPaths}</g><path d="${wordmarkGlint.d}" transform="${wordmark.glint.transform}" fill="${source.highlight}"/></svg>\n`;
const appSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#101114"/><g transform="translate(64 64) scale(12)">${paths}</g></svg>`;
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${faviconMark}</svg>`;

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const pngChunk = (type, data) => {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8);
  return chunk;
};
// Rasterize the shared polygon mark onto a full-bleed canvas to avoid matte halos.
const renderMarkPng = (size, { scale = 1, offset = 0, transparent = false, markPaths = source.paths } = {}) => {
  const samples = 4;
  const highSize = size * samples;
  const highPixels = Buffer.alloc(highSize * highSize * 4);
  if (!transparent) {
    for (let i = 0; i < highPixels.length; i += 4) {
      highPixels[i] = 16;
      highPixels[i + 1] = 17;
      highPixels[i + 2] = 20;
      highPixels[i + 3] = 255;
    }
  }

  for (const path of markPaths) {
    const values = [...path.d.matchAll(/-?\d*\.?\d+/g)].map((match) => Number(match[0]));
    const points = [];
    for (let i = 0; i < values.length; i += 2) {
      points.push([(offset + values[i] * scale) * samples, (offset + values[i + 1] * scale) * samples]);
    }
    const color = path.fill.toLowerCase();
    const rgb = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
    const minY = Math.max(0, Math.floor(Math.min(...points.map((point) => point[1]))));
    const maxY = Math.min(highSize, Math.ceil(Math.max(...points.map((point) => point[1]))));

    for (let y = minY; y < maxY; y += 1) {
      const scanY = y + 0.5;
      const intersections = [];
      for (let i = 0; i < points.length; i += 1) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= scanY && y2 > scanY) || (y2 <= scanY && y1 > scanY)) {
          intersections.push(x1 + ((scanY - y1) * (x2 - x1)) / (y2 - y1));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) {
        const startX = Math.max(0, Math.ceil(intersections[i] - 0.5));
        const endX = Math.min(highSize, Math.ceil(intersections[i + 1] - 0.5));
        for (let x = startX; x < endX; x += 1) {
          const pixel = (y * highSize + x) * 4;
          highPixels[pixel] = rgb[0];
          highPixels[pixel + 1] = rgb[1];
          highPixels[pixel + 2] = rgb[2];
          highPixels[pixel + 3] = 255;
        }
      }
    }
  }

  const pixels = Buffer.alloc(size * size * 4);
  const sampleCount = samples * samples;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixel = (y * size + x) * 4;
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const sample = (((y * samples + sy) * highSize) + x * samples + sx) * 4;
          const sampleAlpha = highPixels[sample + 3];
          red += highPixels[sample] * sampleAlpha;
          green += highPixels[sample + 1] * sampleAlpha;
          blue += highPixels[sample + 2] * sampleAlpha;
          alpha += sampleAlpha;
        }
      }
      pixels[pixel] = alpha ? Math.round(red / alpha) : 0;
      pixels[pixel + 1] = alpha ? Math.round(green / alpha) : 0;
      pixels[pixel + 2] = alpha ? Math.round(blue / alpha) : 0;
      pixels[pixel + 3] = Math.round(alpha / sampleCount);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    rows[row] = 0;
    pixels.copy(rows, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(rows, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};
const pngTextChunk = (text) => {
  const type = Buffer.from('tEXt');
  const data = Buffer.from(`Comment\0${text}`, 'latin1');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  type.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([type, data])), data.length + 8);
  return chunk;
};
const stampPng = (png, version) => {
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IEND') {
      return Buffer.concat([png.subarray(0, offset), pngTextChunk(`Yami brand asset ${version}`), png.subarray(offset)]);
    }
    offset += 12 + length;
  }
  throw new Error('Invalid PNG source');
};
const makeIco = (png) => {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(32, 6);
  header.writeUInt8(32, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
};

await mkdir(new URL('../public', import.meta.url), { recursive: true });
await writeFile(new URL('../public/yami-mark-v2.svg', import.meta.url), markSvg);
await writeFile(new URL('../public/yami-mask-icon-v8.svg', import.meta.url), maskSvg);
await writeFile(new URL('../public/yami-wordmark-v8.svg', import.meta.url), wordmarkSvg);
await writeFile(new URL('../public/yami-app-icon-v3.svg', import.meta.url), appSvg);
await writeFile(new URL('../public/yami-favicon-v10.svg', import.meta.url), faviconSvg);

const publicDir = new URL('../public/', import.meta.url);
const faviconPng = stampPng(renderMarkPng(32, { transparent: true, markPaths: bladePaths }), 'v10');
const faviconIco = makeIco(faviconPng);
await writeFile(new URL('../src/brand/yami-favicon-source.png', import.meta.url), faviconPng);
await writeFile(new URL('yami-favicon-32-v10.png', publicDir), faviconPng);
await writeFile(new URL('yami-favicon-v10.ico', publicDir), faviconIco);
await writeFile(new URL('favicon.ico', publicDir), faviconIco);

const appIcons = [
  [180, 'yami-app-icon-180-v9.png'],
  [192, 'yami-app-icon-192-v9.png'],
  [512, 'yami-app-icon-512-v9.png'],
  [512, 'yami-app-icon-maskable-512-v9.png'],
];
for (const [size, outputName] of appIcons) {
  const scale = (size * 12) / 512;
  const offset = (size * 64) / 512;
  await writeFile(new URL(outputName, publicDir), stampPng(renderMarkPng(size, { scale, offset }), 'v9'));
}
await copyFile(new URL('yami-app-icon-180-v9.png', publicDir), new URL('apple-touch-icon.png', publicDir));
await copyFile(new URL('yami-app-icon-192-v9.png', publicDir), new URL('icon-192.png', publicDir));
await copyFile(new URL('yami-app-icon-512-v9.png', publicDir), new URL('icon-512.png', publicDir));
await copyFile(new URL('yami-app-icon-maskable-512-v9.png', publicDir), new URL('icon-maskable-512.png', publicDir));
