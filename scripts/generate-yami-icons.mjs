import { mkdir, readFile, writeFile } from 'node:fs/promises';

const source = JSON.parse(await readFile(new URL('../src/brand/yami-mark.json', import.meta.url), 'utf8'));
const paths = source.paths.map((path) => `<path d="${path.d}" fill="${path.fill}"/>`).join('');
const mark = `<g id="yami-mark">${paths}</g>`;
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${source.viewBox}" role="img" aria-label="Yami">${mark}</svg>`;
const appSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#101114"/><g transform="translate(64 64) scale(12)">${paths}</g></svg>`;

await mkdir(new URL('../public', import.meta.url), { recursive: true });
await writeFile(new URL('../public/yami-mark-v2.svg', import.meta.url), markSvg);
await writeFile(new URL('../public/yami-app-icon-v2.svg', import.meta.url), appSvg);
