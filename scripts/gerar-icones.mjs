// Gera todos os ícones do Mikasa a partir de public/brand/mikasa.png.
//
// Rodar depois de trocar a arte: `node scripts/gerar-icones.mjs`

import sharp from 'sharp';
import path from 'node:path';

const ORIGEM = 'public/brand/mikasa.png';
const SAIDA = 'public';

// Cor de papel do Mikasa — o mesmo #F7F6F3 do design system.
const PAPEL = { r: 247, g: 246, b: 243, alpha: 1 };

const tamanhos = [
  { arquivo: 'icon-192.png', tamanho: 192 },
  { arquivo: 'icon-512.png', tamanho: 512 },
  { arquivo: 'apple-touch-icon.png', tamanho: 180 },
  { arquivo: 'favicon-32.png', tamanho: 32 },
  { arquivo: 'favicon-16.png', tamanho: 16 },
];

for (const { arquivo, tamanho } of tamanhos) {
  await sharp(ORIGEM)
    .resize(tamanho, tamanho, { fit: 'cover', background: PAPEL })
    .flatten({ background: PAPEL })
    .png()
    .toFile(path.join(SAIDA, arquivo));
  console.log(`${arquivo} (${tamanho}px)`);
}

// Ícone "maskable" do Android: o sistema recorta um círculo, então a arte
// precisa de folga nas bordas para o rosto não ser cortado.
const LADO = 512;
const ARTE = Math.round(LADO * 0.78);
const folga = Math.round((LADO - ARTE) / 2);

await sharp({
  create: { width: LADO, height: LADO, channels: 4, background: PAPEL },
})
  .composite([
    {
      input: await sharp(ORIGEM).resize(ARTE, ARTE, { fit: 'cover' }).toBuffer(),
      top: folga,
      left: folga,
    },
  ])
  .png()
  .toFile(path.join(SAIDA, 'icon-maskable-512.png'));

console.log('icon-maskable-512.png (512px, com folga)');
