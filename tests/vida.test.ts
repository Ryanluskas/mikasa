import { describe, expect, it } from 'vitest';
import { detectarPadroes } from '@/lib/life/correlate';
import { pearson, type DiaDaVida, type JanelaDeVida } from '@/lib/life/signals';
import { addDays, startOfDay } from '@/lib/dates';

/**
 * A camada de vida.
 *
 * O risco desta parte do produto não é errar uma conta — é AFIRMAR coisas
 * sobre a vida de alguém sem base. Por isso a maioria destes testes verifica
 * o silêncio: com pouco dado, o Mikasa não pode encontrar padrão nenhum.
 */

function dia(parcial: Partial<DiaDaVida> & { data: Date }): DiaDaVida {
  return {
    chave: parcial.data.toISOString().slice(0, 10),
    diaSemana: parcial.data.getDay(),
    humor: null,
    energia: null,
    sono: null,
    treinou: false,
    cargaTreino: 0,
    minutosEstudo: 0,
    tarefasConcluidas: 0,
    compromissos: 0,
    gastoCents: 0,
    entradaCents: 0,
    habitosFeitos: 0,
    habitosPossiveis: 0,
    contatosPessoas: 0,
    registrou: true,
    ...parcial,
  };
}

function janela(dias: DiaDaVida[]): JanelaDeVida {
  return {
    dias,
    de: dias[0].data,
    ate: dias[dias.length - 1].data,
    diasComCheckin: dias.filter((d) => d.humor !== null).length,
    diasComRegistro: dias.filter((d) => d.registrou).length,
  };
}

const base = startOfDay(new Date('2026-08-01T00:00:00'));

describe('correlação de Pearson', () => {
  it('encontra relação perfeita', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
  });

  it('devolve null quando uma das séries não varia', () => {
    // Correlação com uma constante é indefinida. Chamar isso de zero seria
    // afirmar "não há relação", o que é diferente de "não dá para saber".
    expect(pearson([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull();
  });

  it('devolve null com amostra pequena demais', () => {
    expect(pearson([1, 2], [2, 4])).toBeNull();
  });
});

describe('o Mikasa fica em silêncio quando não tem base', () => {
  it('não encontra nada num histórico vazio', () => {
    const dias = Array.from({ length: 30 }, (_, i) =>
      dia({ data: addDays(base, i), registrou: false }),
    );
    expect(detectarPadroes(janela(dias))).toHaveLength(0);
  });

  it('não afirma padrão de treino com 3 dias de check-in', () => {
    const dias = Array.from({ length: 30 }, (_, i) =>
      dia({
        data: addDays(base, i),
        humor: i < 3 ? 5 : null,
        treinou: i < 3,
      }),
    );

    const achados = detectarPadroes(janela(dias));
    expect(achados.find((a) => a.key === 'treino-humor')).toBeUndefined();
  });

  it('não afirma padrão quando um dos grupos tem menos de 4 dias', () => {
    // 12 check-ins, mas só 2 dias de treino: amostra insuficiente de um lado.
    const dias = Array.from({ length: 30 }, (_, i) =>
      dia({
        data: addDays(base, i),
        humor: i < 12 ? (i < 2 ? 5 : 2) : null,
        treinou: i < 2,
      }),
    );

    const achados = detectarPadroes(janela(dias));
    expect(achados.find((a) => a.key === 'treino-humor')).toBeUndefined();
  });
});

describe('o Mikasa encontra o padrão quando ele existe de verdade', () => {
  it('vê a relação entre sono e energia', () => {
    const dias = Array.from({ length: 20 }, (_, i) => {
      const dormiu = 5 + (i % 5); // 5..9 horas
      return dia({
        data: addDays(base, i),
        sono: dormiu,
        energia: dormiu >= 8 ? 3 : dormiu >= 6 ? 2 : 1,
        humor: 3,
      });
    });

    const achado = detectarPadroes(janela(dias)).find((a) => a.key === 'sono-energia');
    expect(achado).toBeDefined();
    expect(achado!.corpo).not.toMatch(/porque|causa|faz com que/i);
    expect(achado!.base).toContain('dias');
  });

  it('vê que os dias de treino têm check-in mais alto', () => {
    const dias = Array.from({ length: 24 }, (_, i) => {
      const treinou = i % 2 === 0;
      return dia({
        data: addDays(base, i),
        treinou,
        humor: treinou ? 4 : 2,
        energia: treinou ? 3 : 1,
      });
    });

    const achados = detectarPadroes(janela(dias));
    expect(achados.find((a) => a.key === 'treino-humor')).toBeDefined();
  });

  it('vê que dias cheios reduzem o que é concluído', () => {
    const dias = Array.from({ length: 24 }, (_, i) => {
      const cheio = i % 2 === 0;
      return dia({
        data: addDays(base, i),
        compromissos: cheio ? 4 : 0,
        tarefasConcluidas: cheio ? 0 : 3,
      });
    });

    const achados = detectarPadroes(janela(dias));
    expect(achados.find((a) => a.key === 'agenda-tarefas')).toBeDefined();
  });

  it('percebe que a pessoa sumiu por alguns dias', () => {
    const dias = Array.from({ length: 30 }, (_, i) =>
      dia({ data: addDays(base, i), registrou: i < 24, humor: i < 24 ? 3 : null }),
    );

    const achados = detectarPadroes(janela(dias));
    const sumico = achados.find((a) => a.key === 'sem-registro');
    expect(sumico).toBeDefined();
    // E o tom nunca é de cobrança.
    expect(sumico!.corpo).toMatch(/tudo bem/i);
  });
});

describe('a linguagem dos achados', () => {
  it('nunca afirma causalidade e sempre mostra a base', () => {
    const dias = Array.from({ length: 28 }, (_, i) => {
      const treinou = i % 2 === 0;
      return dia({
        data: addDays(base, i),
        treinou,
        humor: treinou ? 4 : 2,
        energia: treinou ? 3 : 1,
        sono: treinou ? 8 : 6,
        minutosEstudo: i % 3 === 0 ? 60 : 0,
        gastoCents: i % 4 === 0 ? 20_000 : 1_000,
        compromissos: i % 5,
        tarefasConcluidas: i % 3,
      });
    });

    const achados = detectarPadroes(janela(dias));
    expect(achados.length).toBeGreaterThan(0);

    for (const a of achados) {
      expect(a.base, `achado "${a.key}" sem base declarada`).toBeTruthy();
      expect(a.corpo, `achado "${a.key}" afirma causa`).not.toMatch(
        /\bporque\b|\bcausa\b|\bfaz com que\b|\bprovoca\b/i,
      );
      // Nada de linguagem clínica.
      expect(a.corpo).not.toMatch(/depress|ansiedade|transtorno|diagn/i);
      expect(a.forca).toBeGreaterThanOrEqual(0);
      expect(a.forca).toBeLessThanOrEqual(1);
    }
  });

  it('ordena do achado mais forte para o mais fraco', () => {
    const dias = Array.from({ length: 28 }, (_, i) =>
      dia({
        data: addDays(base, i),
        treinou: i % 2 === 0,
        humor: i % 2 === 0 ? 5 : 1,
        energia: i % 2 === 0 ? 3 : 1,
        sono: i % 2 === 0 ? 9 : 5,
      }),
    );

    const achados = detectarPadroes(janela(dias));
    for (let i = 1; i < achados.length; i++) {
      expect(achados[i - 1].forca).toBeGreaterThanOrEqual(achados[i].forca);
    }
  });
});
