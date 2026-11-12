import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const entries = JSON.parse(await fs.readFile(new URL('./asset-sources.json', import.meta.url), 'utf8'));
const originals = new URL('./originals/', import.meta.url);
await fs.mkdir(originals, { recursive: true });
const rows = [];
for (const { id, source } of entries) {
  const original = new URL(`${id}.png`, originals);
  await fs.copyFile(source, original);
  const meta = await sharp(source).metadata();
  if (!meta.hasAlpha) throw new Error(`${id} lacks alpha`);
  for (const size of [256, 640]) {
    const out = `public/images/landing/cobalt/${id}-${size}.webp`;
    await sharp(source).resize(size, size, { fit: 'inside' }).webp({ quality: 85, alphaQuality: 95 }).toFile(out);
    rows.push(`| ${id}-${size}.webp | ${size}×${size} | ${(await fs.stat(out)).size} |`);
  }
}
await fs.writeFile(new URL('./assets-manifest.md', import.meta.url), '# Cobalt hero assets\n\nGenerated with the built-in imagegen tool on 2026-11-08. Decorative 3D-style renders, not verified circuit references. Original transparent PNGs and exact generation prompts are saved alongside this manifest. Resized to WebP with alpha preserved; no semantic edits.\n\n| File | Size | Bytes |\n| --- | --- | --- |\n'+rows.join('\n')+'\n');
console.log(rows.join('\n'));
