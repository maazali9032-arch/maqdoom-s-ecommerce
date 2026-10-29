// One-time: convert the design images in public/images to WebP at display sizes.
// Originals are preserved in git history (first commit). Usage: node scripts/optimise-design-images.mjs
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve("public/images");
const maxWidth = (name) =>
  /hero_bg|section_\d_bg|tailoring_image/.test(name) ? 2400 : /hero_section_person/.test(name) ? 1400 : /logo|name|mahib/.test(name) ? 1200 : 1000;

let before = 0, after = 0;
for (const file of await fs.readdir(dir)) {
  if (!/\.(png|jpe?g|webp)$/i.test(file) || /old/i.test(file)) continue;
  const src = path.join(dir, file);
  const out = path.join(dir, file.replace(/\.(png|jpe?g|webp)$/i, ".webp").replace(/ /g, "-"));
  const input = await fs.readFile(src);
  const meta = await sharp(input).metadata();
  const width = Math.min(meta.width ?? 0, maxWidth(file));
  const buf = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90, effort: 5 }).toBuffer();
  before += input.length; after += buf.length;
  if (src !== out) await fs.unlink(src);
  await fs.writeFile(out, buf);
  console.log(`${file} ${meta.width}x${meta.height} ${(input.length / 1024).toFixed(0)} KB -> ${path.basename(out)} ${width}px ${(buf.length / 1024).toFixed(0)} KB`);
}
console.log(`total ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
