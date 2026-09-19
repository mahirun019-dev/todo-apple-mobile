import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const source = JSON.parse(await readFile(new URL('../src/brand/yami-mark.json', import.meta.url), 'utf8'));
const wordmark = JSON.parse(await readFile(new URL('../src/brand/yami-wordmark.json', import.meta.url), 'utf8'));
const paths = source.paths.map((path) => `<path d="${path.d}" fill="${path.fill}"/>`).join('');
const mark = `<g id="yami-mark">${paths}</g>`;
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${source.viewBox}" role="img" aria-label="Yami">${mark}</svg>`;
const maskPaths = source.paths.map((path) => `<path d="${path.d}" fill="#000"/>`).join('');
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${source.viewBox}">${maskPaths}</svg>`;
const wordmarkPaths = wordmark.strokes.map((path) => `<path d="${path}"/>`).join('');
const wordmarkGlint = source.paths[wordmark.glint.sourceMarkPathIndex];
const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${wordmark.viewBox}" role="img" aria-label="Yami"><g fill="none" stroke="#101114" stroke-linecap="${wordmark.strokeLinecap}" stroke-linejoin="${wordmark.strokeLinejoin}" stroke-width="${wordmark.strokeWidth}">${wordmarkPaths}</g><path d="${wordmarkGlint.d}" transform="${wordmark.glint.transform}" fill="${source.highlight}"/></svg>`;
const appSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#101114"/><g transform="translate(64 64) scale(12)">${paths}</g></svg>`;

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
const stampPng = async (sourceUrl, version) => {
  const png = await readFile(sourceUrl);
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IEND') {
      return Buffer.concat([png.subarray(0, offset), pngTextChunk(`Yami brand asset ${version}`), png.subarray(offset)]);
    }
    offset += 12 + length;
  }
  throw new Error(`Invalid PNG: ${sourceUrl.pathname}`);
};
const writeStampedPng = async (sourceUrl, outputUrl, version) => {
  await writeFile(outputUrl, await stampPng(sourceUrl, version));
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
await writeFile(new URL('../public/yami-app-icon-v2.svg', import.meta.url), appSvg);

const publicDir = new URL('../public/', import.meta.url);
const faviconPng = await stampPng(new URL('../src/brand/yami-favicon-source.png', import.meta.url), 'v8');
const faviconIco = makeIco(faviconPng);
await writeFile(new URL('yami-favicon-32-v8.png', publicDir), faviconPng);
await writeFile(new URL('yami-favicon-v8.ico', publicDir), faviconIco);
await writeFile(new URL('favicon.ico', publicDir), faviconIco);

const appIconSources = [
  ['yami-app-icon-180-v5.png', 'yami-app-icon-180-v8.png'],
  ['yami-app-icon-192-v5.png', 'yami-app-icon-192-v8.png'],
  ['yami-app-icon-512-v5.png', 'yami-app-icon-512-v8.png'],
  ['yami-app-icon-maskable-512-v5.png', 'yami-app-icon-maskable-512-v8.png'],
];
for (const [sourceName, outputName] of appIconSources) {
  await writeStampedPng(new URL(`../public/${sourceName}`, import.meta.url), new URL(outputName, publicDir), 'v8');
}
await copyFile(new URL('yami-app-icon-180-v8.png', publicDir), new URL('apple-touch-icon.png', publicDir));
await copyFile(new URL('yami-app-icon-192-v8.png', publicDir), new URL('icon-192.png', publicDir));
await copyFile(new URL('yami-app-icon-512-v8.png', publicDir), new URL('icon-512.png', publicDir));
await copyFile(new URL('yami-app-icon-maskable-512-v8.png', publicDir), new URL('icon-maskable-512.png', publicDir));
