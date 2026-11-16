import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(raiz, "public");
const appDir = path.join(raiz, "src/app");
const FUNDO = { r: 0x1f, g: 0x4d, b: 0x3a, alpha: 1 };

const completo = await readFile(path.join(publicDir, "logo-agenda.svg"));
const pequeno = await readFile(path.join(publicDir, "logo-agenda-pequeno.svg"));

async function raster(svg, size) {
  const inner = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "fill" })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: FUNDO },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toBuffer();
}

async function maskable(svg, size) {
  const innerSize = Math.round(size * 0.8);
  const inner = await sharp(svg, { density: 384 })
    .resize(innerSize, innerSize, { fit: "fill" })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: FUNDO },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toBuffer();
}

function icoFromPngs(pngs) {
  const count = pngs.length;
  const headerSize = 6 + 16 * count;
  let offset = headerSize;
  const entries = pngs.map((png) => {
    const entry = { size: png.size, bytes: png.buffer.length, offset };
    offset += png.buffer.length;
    return entry;
  });
  const buf = Buffer.alloc(offset);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(count, 4);
  let at = 6;
  for (const entry of entries) {
    buf.writeUInt8(entry.size >= 256 ? 0 : entry.size, at);
    buf.writeUInt8(entry.size >= 256 ? 0 : entry.size, at + 1);
    buf.writeUInt8(0, at + 2);
    buf.writeUInt8(0, at + 3);
    buf.writeUInt16LE(1, at + 4);
    buf.writeUInt16LE(32, at + 6);
    buf.writeUInt32LE(entry.bytes, at + 8);
    buf.writeUInt32LE(entry.offset, at + 12);
    at += 16;
  }
  for (let i = 0; i < pngs.length; i++) {
    pngs[i].buffer.copy(buf, entries[i].offset);
  }
  return buf;
}

await mkdir(publicDir, { recursive: true });

const fav16 = await raster(pequeno, 16);
const fav32 = await raster(pequeno, 32);
const fav48 = await raster(pequeno, 48);
const icon192 = await raster(completo, 192);
const icon512 = await raster(completo, 512);
const apple180 = await raster(completo, 180);
const mask192 = await maskable(completo, 192);
const mask512 = await maskable(completo, 512);
const marca = await raster(completo, 512);
const marcaIcone = await raster(pequeno, 96);

const ico = icoFromPngs([
  { size: 16, buffer: fav16 },
  { size: 32, buffer: fav32 },
  { size: 48, buffer: fav48 },
]);

const arquivos = [
  [path.join(publicDir, "favicon-16x16.png"), fav16],
  [path.join(publicDir, "favicon-32x32.png"), fav32],
  [path.join(publicDir, "icon-48.png"), fav48],
  [path.join(publicDir, "icon-192.png"), icon192],
  [path.join(publicDir, "icon-512.png"), icon512],
  [path.join(publicDir, "icon-192-maskable.png"), mask192],
  [path.join(publicDir, "icon-512-maskable.png"), mask512],
  [path.join(publicDir, "apple-touch-icon.png"), apple180],
  [path.join(publicDir, "marca.png"), marca],
  [path.join(publicDir, "marca-icone.png"), marcaIcone],
  [path.join(appDir, "favicon.ico"), ico],
];

for (const [destino, dados] of arquivos) {
  await writeFile(destino, dados);
  console.log("escreveu", path.relative(raiz, destino));
}
