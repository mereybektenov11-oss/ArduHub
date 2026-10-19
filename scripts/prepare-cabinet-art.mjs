import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const root =
  "C:/Users/User/.codex/generated_images/01a140b8-52de-76c3-bb83-5e0e0b32b1bd/";
const sources = {
  island: "exec-9bcfda6d-9eb9-4800-84b9-55aef5722f9c.png",
  volt: "exec-9e210b1f-9285-442e-9673-32890a5ac5f7.png",
  oma: "exec-d6a22493-0de0-426e-8f7d-22f4fb63e402.png",
  rezik: "exec-8b751d79-287e-4a1d-b7a7-2878581e09fc.png",
  shina: "exec-10a43e34-c70b-4a5d-8058-a87c7b515a91.png",
  banner: "exec-beabe5d2-7df1-4d9b-8c2e-140a57247968.png",
};
await mkdir("public/cabinet", { recursive: true });
const meta = {};
for (const [name, path] of Object.entries(sources)) {
  const width = name === "island" ? 1280 : name === "banner" ? 1440 : 384;
  const base = sharp(root + path).resize({ width, withoutEnlargement: true });
  let buffer = await base
    .clone()
    .webp({ quality: 82, alphaQuality: 95 })
    .toBuffer();
  if (buffer.length > 250000)
    buffer = await base.clone().webp({ quality: 68 }).toBuffer();
  await writeFile(`public/cabinet/${name}.webp`, buffer);
  const { width: w, height: h } = await sharp(buffer).metadata();
  const thumb = await sharp(buffer).resize(12).webp({ quality: 30 }).toBuffer();
  meta[name] = {
    width: w,
    height: h,
    blur: `data:image/webp;base64,${thumb.toString("base64")}`,
    bytes: buffer.length,
    source: path,
  };
}
await writeFile(
  "src/content/cabinet-art.json",
  JSON.stringify(meta, null, 2) + "\n",
);
console.log(
  Object.fromEntries(Object.entries(meta).map(([name, v]) => [name, v.bytes])),
);
