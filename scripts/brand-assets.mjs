/**
 * Gera os arquivos da identidade visual a partir de brand/ (rode: npm run brand).
 *   brand/leviata-logo.png → logo com o dragão (menu, login, prévia de link)
 *   brand/lvt.png          → monograma LVT (favicon, ícones do app)
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const BG = "#09090a"; // grey-950
const LOGO = "brand/leviata-logo.png";
const LVT = "brand/lvt.png";

const trimmed = (file) => sharp(file).trim({ threshold: 1 }).toBuffer();

/** Coloca a imagem centralizada num quadrado, com margem e fundo opcional. */
async function square(input, size, { pad = 0.08, background = { r: 0, g: 0, b: 0, alpha: 0 } } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const fitted = await sharp(input).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: fitted, gravity: "center" }])
    .png()
    .toBuffer();
}

/** ICO com PNGs embutidos (16/32/48). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.buf)]);
}

const logo = await trimmed(LOGO);
const lvt = await trimmed(LVT);
const logoMeta = await sharp(logo).metadata();
console.log(`logo recortado: ${logoMeta.width}×${logoMeta.height}`);

// logo para o menu e o login (2x para telas retina)
await sharp(logo).resize({ width: 640 }).webp({ quality: 90 }).toFile("public/brand/leviata.webp");
await sharp(lvt).resize({ width: 256 }).webp({ quality: 90 }).toFile("public/brand/lvt.webp");

// favicon e ícones (convenções de arquivo do Next em src/app)
await writeFile("src/app/icon.png", await square(lvt, 512, { pad: 0.04 }));
const icoSizes = await Promise.all([16, 32, 48].map(async (size) => ({ size, buf: await square(lvt, size, { pad: 0 }) })));
await writeFile("src/app/favicon.ico", ico(icoSizes));
await writeFile("src/app/apple-icon.png", await square(lvt, 180, { pad: 0.14, background: BG }));

// ícones do app instalado (tela inicial do celular): fundo escuro, margem para máscara redonda
await writeFile("public/brand/icon-192.png", await square(lvt, 192, { pad: 0.16, background: BG }));
await writeFile("public/brand/icon-512.png", await square(lvt, 512, { pad: 0.16, background: BG }));

// prévia de link (Discord/WhatsApp): logo sobre o fundo escuro com brilho ciano
const W = 1200, H = 630;
const glow = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="g" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#06d4ec" stop-opacity=".22"/><stop offset="1" stop-color="#06d4ec" stop-opacity="0"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="${BG}"/><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
const ogLogo = await sharp(logo).resize({ height: 470, width: 1000, fit: "inside" }).toBuffer();
await sharp(glow).composite([{ input: ogLogo, gravity: "center" }]).png().toFile("src/app/opengraph-image.png");

console.log("ok: public/brand/*, src/app/{icon.png,favicon.ico,apple-icon.png,opengraph-image.png}");
