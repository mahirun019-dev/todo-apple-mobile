import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { deflateSync, inflateSync } from 'node:zlib';

const source = JSON.parse(await readFile(new URL('../src/brand/yami-mark.json', import.meta.url), 'utf8'));
const wordmark = JSON.parse(await readFile(new URL('../src/brand/yami-wordmark.json', import.meta.url), 'utf8'));
const paths = source.paths.map((path) => `<path d="${path.d}" fill="${path.fill}"/>`).join('');
const mark = `<g id="yami-mark">${paths}</g>`;
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${source.viewBox}" role="img" aria-label="Yami">${mark}</svg>`;
const maskPaths = source.paths.map((path) => `<path d="${path.d}" fill="#000"/>`).join('');
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${source.viewBox}">${maskPaths}</svg>`;
const wordmarkPaths = wordmark.strokes.map((path) => `<path d="${path}"/>`).join('');
const wordmarkGlint = source.paths[wordmark.glint.sourceMarkPathIndex];
const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${wordmark.viewBox}" role="img" aria-label="Yami"><g fill="none" stroke="#101114" stroke-linecap="${wordmark.strokeLinecap}" stroke-linejoin="${wordmark.strokeLinejoin}" stroke-width="${wordmark.strokeWidth}">${wordmarkPaths}</g><path d="${wordmarkGlint.d}" transform="${wordmark.glint.transform}" fill="${source.highlight}"/></svg>\n`;
const appSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#101114"/><g transform="translate(64 64) scale(12)">${paths}</g></svg>`;
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#101114"/>${mark}</svg>`;

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
const paeth = (left, above, upperLeft) => {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
};
const removeLightMatte = (png) => {
  const signature = png.subarray(0, 8);
  let offset = 8;
  let header;
  const compressed = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') header = data;
    if (type === 'IDAT') compressed.push(data);
    offset += length + 12;
  }
  if (!header || header[8] !== 8 || header[9] !== 6 || header[12] !== 0) {
    throw new Error('Expected a non-interlaced 8-bit RGBA PNG');
  }

  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const stride = width * 4;
  const decoded = inflateSync(Buffer.concat(compressed));
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = y * (stride + 1);
    const filter = decoded[sourceStart];
    const rowStart = y * stride;
    for (let i = 0; i < stride; i += 1) {
      const raw = decoded[sourceStart + i + 1];
      const left = i >= 4 ? pixels[rowStart + i - 4] : 0;
      const above = y > 0 ? pixels[rowStart + i - stride] : 0;
      const upperLeft = y > 0 && i >= 4 ? pixels[rowStart + i - stride - 4] : 0;
      const predictor = filter === 1 ? left
        : filter === 2 ? above
          : filter === 3 ? Math.floor((left + above) / 2)
            : filter === 4 ? paeth(left, above, upperLeft)
              : 0;
      pixels[rowStart + i] = (raw + predictor) & 0xff;
    }
  }

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    const red = pixels[i] * alpha + 16 * (1 - alpha);
    const green = pixels[i + 1] * alpha + 17 * (1 - alpha);
    const blue = pixels[i + 2] * alpha + 20 * (1 - alpha);
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    if (maximum > 28 && maximum - minimum <= 18) {
      pixels[i] = 16;
      pixels[i + 1] = 17;
      pixels[i + 2] = 20;
    } else {
      pixels[i] = Math.round(red);
      pixels[i + 1] = Math.round(green);
      pixels[i + 2] = Math.round(blue);
    }
    pixels[i + 3] = 255;
  }

  const rows = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const targetStart = y * (stride + 1);
    rows[targetStart] = 0;
    pixels.copy(rows, targetStart + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    signature,
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
const writeStampedPng = async (sourceUrl, outputUrl, version) => {
  const png = removeLightMatte(await readFile(sourceUrl));
  await writeFile(outputUrl, stampPng(png, version));
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
await writeFile(new URL('../public/yami-favicon-v9.svg', import.meta.url), faviconSvg);

const publicDir = new URL('../public/', import.meta.url);
const faviconSourceUrl = new URL('../src/brand/yami-favicon-source.png', import.meta.url);
const cleanFaviconSource = removeLightMatte(await readFile(faviconSourceUrl));
const faviconPng = stampPng(cleanFaviconSource, 'v9');
await writeFile(faviconSourceUrl, cleanFaviconSource);
const faviconIco = makeIco(faviconPng);
await writeFile(new URL('yami-favicon-32-v9.png', publicDir), faviconPng);
await writeFile(new URL('yami-favicon-v9.ico', publicDir), faviconIco);
await writeFile(new URL('favicon.ico', publicDir), faviconIco);

const appIconSources = [
  ['yami-app-icon-180-v5.png', 'yami-app-icon-180-v9.png'],
  ['yami-app-icon-192-v5.png', 'yami-app-icon-192-v9.png'],
  ['yami-app-icon-512-v5.png', 'yami-app-icon-512-v9.png'],
  ['yami-app-icon-maskable-512-v5.png', 'yami-app-icon-maskable-512-v9.png'],
];
for (const [sourceName, outputName] of appIconSources) {
  await writeStampedPng(new URL(`../public/${sourceName}`, import.meta.url), new URL(outputName, publicDir), 'v9');
}
await copyFile(new URL('yami-app-icon-180-v9.png', publicDir), new URL('apple-touch-icon.png', publicDir));
await copyFile(new URL('yami-app-icon-192-v9.png', publicDir), new URL('icon-192.png', publicDir));
await copyFile(new URL('yami-app-icon-512-v9.png', publicDir), new URL('icon-512.png', publicDir));
await copyFile(new URL('yami-app-icon-maskable-512-v9.png', publicDir), new URL('icon-maskable-512.png', publicDir));
