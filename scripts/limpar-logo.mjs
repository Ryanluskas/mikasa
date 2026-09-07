// Remove o anel e o wordmark da logo do Mikasa, deixando só a personagem.
//
// O anel é desenhado à mão: não é um círculo perfeito, então testar um raio
// fixo não funciona. A varredura é feita ÂNGULO A ÂNGULO: em cada direção
// saindo do centro, procuramos um traço escuro FINO e ISOLADO (fundo claro
// dos dois lados) na faixa onde o anel deveria estar. Esse traço é o anel.
//
// Onde o anel cruza o cabelo ele não é fino nem isolado — e ali ele também é
// invisível, preto sobre preto. Por isso não precisamos apagá-lo.

import sharp from 'sharp';
import fs from 'node:fs';

const ORIGEM = process.argv[2];
const DESTINO = process.argv[3];

const img = sharp(ORIGEM).ensureAlpha();
const { width, height } = await img.metadata();
const { data } = await img.raw().toBuffer({ resolveWithObject: true });

const idx = (x, y) => (y * width + x) * 4;

function lum(x, y) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= width || yi >= height) return 255;
  const i = idx(xi, yi);
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

const bg = [data[0], data[1], data[2]];
const ESCURO = 145;

function pintar(x, y, raioPincel) {
  for (let dy = -raioPincel; dy <= raioPincel; dy++) {
    for (let dx = -raioPincel; dx <= raioPincel; dx++) {
      const xi = Math.round(x + dx);
      const yi = Math.round(y + dy);
      if (xi < 0 || yi < 0 || xi >= width || yi >= height) continue;
      const i = idx(xi, yi);
      data[i] = bg[0];
      data[i + 1] = bg[1];
      data[i + 2] = bg[2];
    }
  }
}

// ── 1. Geometria do círculo, por duas cordas ─────────────────────────────────
// Procurar "o primeiro pixel escuro de cima para baixo" não funciona: o cabelo
// passa por cima do anel e o wordmark fica embaixo. Duas cordas horizontais,
// porém, determinam o círculo sem ambiguidade.
function corda(y) {
  let a = -1;
  let b = -1;
  for (let x = 0; x < width; x++) if (lum(x, y) < ESCURO) { a = x; break; }
  for (let x = width - 1; x >= 0; x--) if (lum(x, y) < ESCURO) { b = x; break; }
  return a < 0 || b < 0 ? null : { a, b, meio: (a + b) / 2, semi: (b - a) / 2 };
}

const y1 = Math.round(height * 0.42);
const y2 = Math.round(height * 0.62);
const c1 = corda(y1);
const c2 = corda(y2);
if (!c1 || !c2) throw new Error('não consegui achar o círculo na imagem');

const cx = (c1.meio + c2.meio) / 2;

// a² + (y − cy)² = R², para as duas cordas → resolve cy e R.
const cy =
  (y2 * y2 - y1 * y1 - c1.semi * c1.semi + c2.semi * c2.semi) / (2 * (y2 - y1));
const raioAprox = Math.sqrt(c1.semi * c1.semi + (y1 - cy) * (y1 - cy));

console.log(`circulo ~ centro (${cx.toFixed(0)}, ${cy.toFixed(0)}) raio ${raioAprox.toFixed(0)}`);

// ── 2. Varredura radial: achar e apagar o traço do anel ──────────────────────
const FAIXA = Math.round(raioAprox * 0.09); // tolerância para a mão do desenho
const ESPESSURA_MAX = Math.round(raioAprox * 0.045);
const FOLGA = Math.round(raioAprox * 0.02); // quanto precisa estar limpo em volta

const passos = Math.ceil(2 * Math.PI * raioAprox * 3);
let apagados = 0;

for (let k = 0; k < passos; k++) {
  const ang = (k / passos) * Math.PI * 2;
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);

  const rInicio = raioAprox - FAIXA;
  const rFim = raioAprox + FAIXA;

  let r = rInicio;
  while (r <= rFim) {
    if (lum(cx + ux * r, cy + uy * r) >= ESCURO) { r += 0.5; continue; }

    // Achou o começo de um traço. Mede até onde ele vai.
    const inicio = r;
    let fim = r;
    while (fim <= rFim + ESPESSURA_MAX && lum(cx + ux * fim, cy + uy * fim) < ESCURO) {
      fim += 0.5;
    }
    const espessura = fim - inicio;

    // Fino o bastante para ser um traço, e não uma mecha de cabelo?
    if (espessura > 0 && espessura <= ESPESSURA_MAX) {
      // O lado de FORA precisa estar limpo: nada do desenho vive além do
      // anel, então um traço fino com fundo limpo por fora é o anel.
      // Não exigimos o mesmo por dentro — é justamente onde o cabelo encosta,
      // e era isso que deixava cotocos do anel para trás.
      const depois = lum(cx + ux * (fim + FOLGA), cy + uy * (fim + FOLGA));
      const bemFora = lum(cx + ux * (fim + FOLGA * 2), cy + uy * (fim + FOLGA * 2));

      if (depois >= ESCURO && bemFora >= ESCURO) {
        for (let t = inicio - 1; t <= fim + 1; t += 0.4) {
          pintar(cx + ux * t, cy + uy * t, 1);
          apagados++;
        }
      }
    }

    r = fim + 0.5;
  }
}

console.log(`amostras do anel removidas: ${apagados}`);

// ── 3. Fora do círculo vira o MESMO papel de dentro ──────────────────────────
// O desenho tinha o disco levemente mais claro que a margem. Se pintássemos a
// margem com a cor de fora, o antigo disco continuaria visível como um halo.
// Pegamos então o tom de dentro e estendemos ele para toda a arte.
const amostraX = Math.round(cx - raioAprox * 0.55);
const amostraY = Math.round(cy - raioAprox * 0.55);
const iAmostra = idx(amostraX, amostraY);
const papel = [data[iAmostra], data[iAmostra + 1], data[iAmostra + 2]];

const limiteExterno = raioAprox - 2;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const r = Math.hypot(x - cx, y - cy);
    if (r <= limiteExterno) continue;

    const i = idx(x, y);
    // Dentro da faixa do anel ainda pode haver cabelo legítimo. O que
    // distingue cabelo de caco de anel é a continuidade: cabelo vem de dentro
    // do desenho. Se, andando para o centro, o traço acaba logo em papel,
    // é sobra do anel e sai.
    const claro = lum(x, y) >= ESCURO;
    const ux = (x - cx) / (r || 1);
    const uy = (y - cy) / (r || 1);
    const continuaParaDentro =
      lum(x - ux * FOLGA, y - uy * FOLGA) < ESCURO ||
      lum(x - ux * FOLGA * 2, y - uy * FOLGA * 2) < ESCURO;

    if (r > raioAprox + FAIXA || claro || !continuaParaDentro) {
      data[i] = papel[0];
      data[i + 1] = papel[1];
      data[i + 2] = papel[2];
    }
  }
}

// ── 4. Recorte no conteúdo real ──────────────────────────────────────────────
// O papel tem textura, então "conteúdo" é o que for claramente mais escuro
// que o fundo — e não qualquer pixel abaixo de um limiar absoluto.
const lumBg = 0.299 * papel[0] + 0.587 * papel[1] + 0.114 * papel[2];
const LIMIAR_CONTEUDO = lumBg - 28;

let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (lum(x, y) < LIMIAR_CONTEUDO) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const pad = Math.round(raioAprox * 0.08);
const centroX = (minX + maxX) / 2;
const centroY = (minY + maxY) / 2;
const lado = Math.max(maxX - minX, maxY - minY) + 1 + pad * 2;

const left = Math.max(0, Math.round(centroX - lado / 2));
const top = Math.max(0, Math.round(centroY - lado / 2));
const w = Math.min(lado, width - left);
const h = Math.min(lado, height - top);

console.log(`conteudo: ${minX},${minY} → ${maxX},${maxY} | recorte ${left},${top} ${w}x${h}`);

await sharp(data, { raw: { width, height, channels: 4 } })
  .extract({ left, top, width: w, height: h })
  .png()
  .toFile(DESTINO);

console.log('ok:', DESTINO, fs.statSync(DESTINO).size, 'bytes');
