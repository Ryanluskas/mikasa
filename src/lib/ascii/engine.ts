/**
 * O motor de dither do Mikasa.
 *
 * Reimplementação do pipeline "Electric Gaze" (21st.dev) em Canvas2D, rodando
 * na identidade do Mikasa em vez da estética escura da referência.
 *
 * A decisão de arte, explicada porque ela não é óbvia:
 * a referência é fundo quase-preto com um acento neon. Isso é bonito e é
 * também exatamente onde design gerado por IA se agrupa hoje. O Mikasa tem
 * uma marca desenhada a nanquim sobre papel — então o dither aqui é tinta
 * sobre papel. A textura de pontos vira uma extensão do traço original, e não
 * um filtro colado por cima dele.
 *
 * A decisão de engenharia que faz isso rodar em celular fraco:
 * a imagem é amostrada UMA vez, na montagem, virando uma grade de luminância.
 * A animação depois só modula um limiar por célula — nenhum frame relê pixel
 * de imagem. Sem isso, seriam ~7 mil leituras de canvas por frame.
 */

export type RenderMode = 'dither' | 'characters' | 'dots';

export type Params = {
  /**
   * Quantas células o desenho terá na horizontal.
   *
   * A referência define o efeito por tamanho de célula em pixels, o que só
   * funciona quando a tela tem sempre a mesma largura. Numa página responsiva
   * isso quebra: a mesma célula de 9px que fica boa em 1250px deixa 37 células
   * num celular de 340px, e o rosto vira uma mancha. Fixando a CONTAGEM de
   * células e derivando o tamanho, o desenho lê igual em qualquer largura.
   */
  colunasAlvo: number;
  /** 0-200, onde 100 é neutro. */
  contrast: number;
  /** -100 a 100. */
  brightness: number;
  /** 0-100. Quanta tinta a mesma luminância produz. */
  density: number;
  /** 0-100. Percentual de células desenhadas. */
  coverage: number;
  invert: boolean;
  mode: RenderMode;
  /** 0-100. Amplitude do shimmer. */
  animIntensity: number;
  /** 0-100. Velocidade do shimmer. */
  animSpeed: number;
  animated: boolean;
};

export const PADRAO: Params = {
  /** Densidade equivalente à da referência (9px de célula em ~830px de arte). */
  colunasAlvo: 92,
  contrast: 158,
  brightness: 0,
  density: 20,
  coverage: 100,
  invert: false,
  mode: 'dither',
  animIntensity: 60,
  animSpeed: 100,
  animated: true,
};

/** Glifos do modo "characters", do mais claro ao mais denso. */
const GLIFOS = ' .:-=+*#%@';

/**
 * Matriz de Bayer 4×4, normalizada em 0..1.
 *
 * É ela que dá a textura característica: em vez de um limiar único (que
 * produziria manchas chapadas), cada célula compara sua tinta contra um
 * limiar diferente conforme a posição. O olho lê o padrão resultante como
 * meio-tom contínuo.
 */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((linha) => linha.map((v) => (v + 0.5) / 16));

export type Grade = {
  colunas: number;
  linhas: number;
  /** Tinta por célula, 0..1 — 1 é preto cheio. */
  tinta: Float32Array;
};

/**
 * Amostra a imagem numa grade de luminância.
 *
 * Roda uma vez. O canvas de amostragem tem exatamente o tamanho da grade, o
 * que faz o próprio navegador calcular a média de cada célula ao redimensionar
 * — muito mais rápido (e mais suave) do que somar pixels em JavaScript.
 */
export function amostrar(
  imagem: CanvasImageSource,
  larguraFonte: number,
  alturaFonte: number,
  colunas: number,
  linhas: number,
  p: Pick<Params, 'contrast' | 'brightness' | 'density' | 'invert'>,
): Grade | null {
  if (colunas < 1 || linhas < 1) return null;

  const amostra = document.createElement('canvas');
  amostra.width = colunas;
  amostra.height = linhas;

  const ctx = amostra.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // O papel do Mikasa é claro; começar branco evita que as bordas da imagem
  // virem tinta por causa do alpha zero.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, colunas, linhas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imagem, 0, 0, larguraFonte, alturaFonte, 0, 0, colunas, linhas);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, colunas, linhas).data;
  } catch {
    // Canvas contaminado por imagem de outra origem. Não é caso nosso (a arte
    // é servida do mesmo domínio), mas falhar em silêncio é melhor que quebrar.
    return null;
  }

  const contraste = p.contrast / 100;
  const brilho = p.brightness / 100;
  const ganho = 0.4 + p.density / 50;

  const tinta = new Float32Array(colunas * linhas);

  for (let i = 0, j = 0; i < tinta.length; i++, j += 4) {
    // Luminância perceptual (Rec. 601): o verde pesa mais porque o olho
    // enxerga mais verde. Média simples achataria o contraste do desenho.
    let v =
      (0.299 * pixels[j] + 0.587 * pixels[j + 1] + 0.114 * pixels[j + 2]) / 255;

    v += brilho;
    v = (v - 0.5) * contraste + 0.5;

    // Tinta é o inverso da luminância: escuro = muita tinta.
    let ink = p.invert ? v : 1 - v;
    ink *= ganho;

    tinta[i] = ink < 0 ? 0 : ink > 1 ? 1 : ink;
  }

  return { colunas, linhas, tinta };
}

/** Ruído estável por célula: mesma célula, mesmo valor, sempre. */
function ruido(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * O deslocamento de limiar que produz o shimmer.
 *
 * Exportado e puro de propósito: é a única parte da animação que dá para
 * verificar sem um canvas de verdade, e ela é testada em
 * `tests/dither.test.ts`. Uma onda diagonal percorre a grade, e como o limiar
 * de Bayer já varia no espaço, o resultado é um cintilar que atravessa o
 * desenho em vez de piscar a imagem inteira de uma vez.
 */
export function ondaShimmer(
  x: number,
  y: number,
  tempo: number,
  p: Pick<Params, 'animated' | 'animIntensity' | 'animSpeed'>,
): number {
  if (!p.animated || p.animIntensity <= 0) return 0;

  const amplitude = (p.animIntensity / 100) * 0.16;
  const velocidade = (p.animSpeed / 100) * 1.4;

  return Math.sin(tempo * velocidade + x * 0.28 + y * 0.19) * amplitude;
}

/** Limiar de Bayer da célula, já com o shimmer aplicado. */
export function limiarDither(
  x: number,
  y: number,
  tempo: number,
  p: Pick<Params, 'animated' | 'animIntensity' | 'animSpeed'>,
): number {
  return BAYER[y & 3][x & 3] + ondaShimmer(x, y, tempo, p);
}

export type Pintura = {
  ctx: CanvasRenderingContext2D;
  grade: Grade;
  cell: number;
  /** Segundos desde o início. */
  tempo: number;
  cor: string;
  params: Params;
};

/**
 * Desenha um quadro.
 *
 * Sem alocação dentro do laço e sem mudança de `fillStyle` por célula: a cor
 * é definida uma vez antes. Trocar estado do contexto é a operação cara em
 * Canvas2D, e aqui seriam milhares de trocas por frame.
 */
export function pintar({ ctx, grade, cell, tempo, cor, params }: Pintura): void {
  const { colunas, linhas, tinta } = grade;

  ctx.clearRect(0, 0, colunas * cell, linhas * cell);
  ctx.fillStyle = cor;

  const cobertura = params.coverage / 100;

  if (params.mode === 'characters') {
    ctx.font = `${cell * 1.05}px ui-monospace, "SF Mono", Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  for (let y = 0; y < linhas; y++) {
    const py = y * cell;

    for (let x = 0; x < colunas; x++) {
      const ink = tinta[y * colunas + x];
      if (ink <= 0.02) continue;

      if (cobertura < 1 && ruido(x, y) > cobertura) continue;

      const onda = ondaShimmer(x, y, tempo, params);
      const px = x * cell;

      if (params.mode === 'dither') {
        if (ink < limiarDither(x, y, tempo, params)) continue;

        // Um pouco de variação de tamanho dentro da célula dá peso às áreas
        // mais escuras sem precisar de uma segunda passada.
        const lado = cell * (0.55 + Math.min(ink, 1) * 0.45);
        const folga = (cell - lado) / 2;
        ctx.fillRect(px + folga, py + folga, lado, lado);
        continue;
      }

      if (params.mode === 'dots') {
        const raio = (cell / 2) * Math.min(1, ink + onda) * 0.95;
        if (raio < 0.35) continue;
        ctx.beginPath();
        ctx.arc(px + cell / 2, py + cell / 2, raio, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      // characters
      const nivel = Math.min(1, Math.max(0, ink + onda));
      const idx = Math.round(nivel * (GLIFOS.length - 1));
      const glifo = GLIFOS[idx];
      if (glifo === ' ') continue;
      ctx.fillText(glifo, px + cell / 2, py + cell / 2);
    }
  }
}
