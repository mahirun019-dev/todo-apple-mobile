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
const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${wordmark.viewBox}" role="img" aria-label="Yami"><g fill="none" stroke="#101114" stroke-linecap="butt" stroke-linejoin="miter" stroke-width="${wordmark.strokeWidth}">${wordmarkPaths}</g><path d="${wordmarkGlint.d}" transform="${wordmark.glint.transform}" fill="${source.highlight}"/></svg>`;
const appSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#101114"/><g transform="translate(64 64) scale(12)">${paths}</g></svg>`;
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#101114"/><g transform="translate(3 3) scale(.81)">${paths}</g></svg>`;

await mkdir(new URL('../public', import.meta.url), { recursive: true });
await writeFile(new URL('../public/yami-mark-v2.svg', import.meta.url), markSvg);
await writeFile(new URL('../public/yami-mask-icon-v3.svg', import.meta.url), maskSvg);
await writeFile(new URL('../public/yami-wordmark-v6.svg', import.meta.url), wordmarkSvg);
await writeFile(new URL('../public/yami-app-icon-v2.svg', import.meta.url), appSvg);
await writeFile(new URL('../public/yami-favicon-v6.svg', import.meta.url), faviconSvg);
await writeFile(new URL('../public/yami-mask-icon-v6.svg', import.meta.url), maskSvg);
await copyFile(new URL('../public/yami-favicon-v2.ico', import.meta.url), new URL('../public/yami-favicon-v6.ico', import.meta.url));
await copyFile(new URL('../public/yami-favicon-32-v2.png', import.meta.url), new URL('../public/yami-favicon-32-v6.png', import.meta.url));
await copyFile(new URL('../public/yami-favicon-v2.ico', import.meta.url), new URL('../public/favicon.ico', import.meta.url));
await copyFile(new URL('../public/yami-app-icon-180-v4.png', import.meta.url), new URL('../public/yami-app-icon-180-v5.png', import.meta.url));
await copyFile(new URL('../public/yami-app-icon-192-v4.png', import.meta.url), new URL('../public/yami-app-icon-192-v5.png', import.meta.url));
await copyFile(new URL('../public/yami-app-icon-512-v4.png', import.meta.url), new URL('../public/yami-app-icon-512-v5.png', import.meta.url));
await copyFile(new URL('../public/yami-app-icon-maskable-512-v4.png', import.meta.url), new URL('../public/yami-app-icon-maskable-512-v5.png', import.meta.url));
