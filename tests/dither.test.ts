import { describe, expect, it } from 'vitest';
import { limiarDither, ondaShimmer, PADRAO } from '@/lib/ascii/engine';

/**
 * O shimmer do dither.
 *
 * Estes testes existem por um motivo específico: a animação roda em
 * `requestAnimationFrame` dentro de um canvas, e nem toda máquina de CI (nem
 * todo painel de navegador) desenha quadros. Sem eles, "a animação funciona"
 * seria uma afirmação sem prova.
 *
 * A parte verificável é o deslocamento de limiar por célula — é ele que faz
 * o desenho cintilar. Se ele varia no tempo, varia no espaço, e some quando
 * a animação está desligada, a animação está correta.
 */

const P = {
  animated: PADRAO.animated,
  animIntensity: PADRAO.animIntensity,
  animSpeed: PADRAO.animSpeed,
};

describe('onda do shimmer', () => {
  it('muda com o tempo', () => {
    const t0 = ondaShimmer(10, 10, 0, P);
    const t1 = ondaShimmer(10, 10, 0.5, P);
    const t2 = ondaShimmer(10, 10, 1.0, P);

    expect(t0).not.toBeCloseTo(t1, 4);
    expect(t1).not.toBeCloseTo(t2, 4);
  });

  it('muda no espaço — o cintilar percorre a grade em vez de piscar junto', () => {
    const a = ondaShimmer(0, 0, 0.3, P);
    const b = ondaShimmer(7, 0, 0.3, P);
    const c = ondaShimmer(0, 7, 0.3, P);

    expect(a).not.toBeCloseTo(b, 4);
    expect(a).not.toBeCloseTo(c, 4);
  });

  it('é exatamente zero quando a animação está desligada', () => {
    const parado = { ...P, animated: false };
    for (const t of [0, 0.5, 1, 3.7]) {
      expect(ondaShimmer(4, 9, t, parado)).toBe(0);
    }
  });

  it('é exatamente zero com intensidade zero', () => {
    expect(ondaShimmer(4, 9, 1.2, { ...P, animIntensity: 0 })).toBe(0);
  });

  it('a amplitude acompanha animIntensity', () => {
    const pico = (intensidade: number) => {
      let maior = 0;
      // Varre um período inteiro: o pico da senoide é a amplitude.
      for (let t = 0; t < 12; t += 0.01) {
        maior = Math.max(maior, Math.abs(ondaShimmer(0, 0, t, { ...P, animIntensity: intensidade })));
      }
      return maior;
    };

    const fraco = pico(20);
    const forte = pico(80);

    expect(forte).toBeGreaterThan(fraco * 3);
    // Teto sanitário: o shimmer nunca pode dominar o limiar de Bayer, senão
    // o desenho deixa de ser legível e vira ruído pulsando.
    expect(pico(100)).toBeLessThanOrEqual(0.16 + 1e-9);
  });

  it('nunca é maior que a velocidade pede — velocidade não vira amplitude', () => {
    const lento = ondaShimmer(3, 3, 1, { ...P, animSpeed: 10 });
    const rapido = ondaShimmer(3, 3, 1, { ...P, animSpeed: 100 });
    const amplitudeMax = (P.animIntensity / 100) * 0.16;

    expect(Math.abs(lento)).toBeLessThanOrEqual(amplitudeMax + 1e-9);
    expect(Math.abs(rapido)).toBeLessThanOrEqual(amplitudeMax + 1e-9);
  });
});

describe('limiar do dither', () => {
  it('fica dentro de 0..1 mesmo no pico do shimmer', () => {
    for (let t = 0; t < 8; t += 0.05) {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const l = limiarDither(x, y, t, P);
          expect(l).toBeGreaterThan(-0.2);
          expect(l).toBeLessThan(1.2);
        }
      }
    }
  });

  it('células vizinhas têm limiares diferentes — é isso que cria a textura', () => {
    const limiares = new Set<number>();
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        limiares.add(limiarDither(x, y, 0, { ...P, animated: false }));
      }
    }
    // A matriz de Bayer 4×4 tem 16 níveis distintos.
    expect(limiares.size).toBe(16);
  });

  it('uma célula de tinta intermediária acende e apaga ao longo do tempo', () => {
    // É este comportamento que o olho lê como cintilar. Sem ele, o canvas
    // seria redesenhado a 60fps sem nunca mudar nada.
    const ink = BAYER_MEIO;
    let acesa = 0;
    let apagada = 0;

    for (let t = 0; t < 10; t += 0.05) {
      if (ink >= limiarDither(1, 2, t, P)) acesa++;
      else apagada++;
    }

    expect(acesa).toBeGreaterThan(0);
    expect(apagada).toBeGreaterThan(0);
  });
});

/**
 * Tinta escolhida para cair praticamente em cima do limiar da célula (1,2),
 * que é onde o shimmer consegue empurrar a decisão para os dois lados.
 */
const BAYER_MEIO = limiarDither(1, 2, 0, {
  animated: false,
  animIntensity: 0,
  animSpeed: 0,
});
