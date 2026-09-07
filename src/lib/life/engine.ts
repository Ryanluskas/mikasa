import { prisma } from '@/lib/prisma';
import { formatCentsShort } from '@/lib/money';
import { nomeDiaLongo } from '@/lib/dates';
import { VOZ } from '@/lib/voice';
import type { AreaModulo } from '@/lib/validation';
import { carregarJanela, media, sequenciaAtual, type JanelaDeVida } from './signals';
import { detectarPadroes, type Achado } from './correlate';
import { achadosDeEquilibrio, calcularEquilibrio, type Equilibrio } from './balance';

/**
 * A camada de vida — parte 4: a leitura.
 *
 * Este arquivo junta sinais, padrões e equilíbrio e devolve a única coisa que
 * o usuário realmente pediu: uma frase que faça sentido sobre a vida dele.
 *
 * O que o Mikasa NÃO faz aqui, de propósito:
 *  - não dá nota para a vida de ninguém (nada de "sua semana: 72/100");
 *  - não dá conselho de saúde nem interpreta sentimento;
 *  - não fala do que não tem dado. Quando falta informação, ele diz que falta.
 */

export type Retrato = {
  /** A leitura do todo, em uma ou duas frases. */
  frase: string;
  numeros: { rotulo: string; valor: string }[];
  /** Honestidade: o que ainda não dá para observar, e o que destravaria. */
  faltando: { rotulo: string; texto: string }[];
};

export type LeituraDeVida = {
  retrato: Retrato;
  equilibrio: Equilibrio;
  achados: Achado[];
  serie: {
    chave: string;
    diaSemana: number;
    humor: number | null;
    energia: number | null;
    treinou: boolean;
    registrou: boolean;
  }[];
  diasComCheckin: number;
  janelaDias: number;
};

const horas = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
};

function montarRetrato(j: JanelaDeVida, e: Equilibrio): Retrato {
  const semana = j.dias.slice(-7);
  const treinos = semana.filter((d) => d.treinou).length;
  const estudo = semana.reduce((s, d) => s + d.minutosEstudo, 0);
  const gasto = semana.reduce((s, d) => s + d.gastoCents, 0);
  const tarefas = semana.reduce((s, d) => s + d.tarefasConcluidas, 0);
  const humores = semana.map((d) => d.humor).filter((v): v is number => v !== null);

  const numeros: { rotulo: string; valor: string }[] = [];
  if (treinos > 0) numeros.push({ rotulo: 'Treinos', valor: String(treinos) });
  if (estudo > 0) numeros.push({ rotulo: 'Estudo', valor: horas(estudo) });
  if (tarefas > 0) numeros.push({ rotulo: 'Tarefas', valor: String(tarefas) });
  if (gasto > 0) numeros.push({ rotulo: 'Gastos', valor: formatCentsShort(gasto) });

  // ── A frase ────────────────────────────────────────────────────────────────
  const partes: string[] = [];

  if (numeros.length === 0) {
    partes.push('Sua semana ainda está em branco por aqui.');
  } else {
    const feitos: string[] = [];
    if (treinos > 0) feitos.push(treinos === 1 ? 'um treino' : `${treinos} treinos`);
    if (estudo >= 30) feitos.push(`${horas(estudo)} de estudo`);
    if (tarefas > 0) feitos.push(tarefas === 1 ? 'uma tarefa' : `${tarefas} tarefas`);
    if (feitos.length) {
      partes.push(
        `Nos últimos sete dias você registrou ${
          feitos.length === 1
            ? feitos[0]
            : `${feitos.slice(0, -1).join(', ')} e ${feitos[feitos.length - 1]}`
        }.`,
      );
    }
  }

  if (humores.length >= 3) {
    const m = media(humores);
    const rotulo = VOZ.humor[Math.min(4, Math.max(0, Math.round(m) - 1))];
    partes.push(
      `Seus check-ins ficaram em torno de "${rotulo.toLowerCase()}" em ${humores.length} dos 7 dias.`,
    );
  }

  if (e.esquecida) {
    partes.push(`${e.esquecida.nome} não apareceu nenhuma vez.`);
  } else if (e.dominante) {
    partes.push(`A maior parte do que você registrou veio de ${e.dominante.nome.toLowerCase()}.`);
  }

  // ── O que ainda não dá para ver ────────────────────────────────────────────
  const faltando: { rotulo: string; texto: string }[] = [];

  if (j.diasComCheckin < 10) {
    faltando.push({
      rotulo: 'Check-in diário',
      texto: `Você tem ${j.diasComCheckin} ${
        j.diasComCheckin === 1 ? 'dia registrado' : 'dias registrados'
      }. A partir de uns 10, o Mikasa começa a enxergar padrões entre como você está e o que você faz.`,
    });
  }

  const comSono = j.dias.filter((d) => d.sono !== null).length;
  if (comSono < 8 && j.diasComCheckin >= 3) {
    faltando.push({
      rotulo: 'Horas de sono',
      texto:
        'Sono é o sinal que mais explica os outros. Se você anotar junto com o check-in, dá para cruzar com sua energia.',
    });
  }

  return {
    frase: partes.join(' ') || 'Ainda estamos nos conhecendo.',
    numeros,
    faltando,
  };
}

/**
 * Leitura completa da vida do usuário.
 *
 * Uma chamada, uma janela de dados, todos os detectores. A página `/vida`
 * e a Home consomem exatamente isto — não existe uma segunda fonte de verdade.
 */
export async function lerVida(
  userId: string,
  modulosLigados: AreaModulo[],
  dias = 30,
): Promise<LeituraDeVida> {
  const janela = await carregarJanela(userId, dias);
  const equilibrio = await calcularEquilibrio(userId, janela, modulosLigados);

  const achados = [...detectarPadroes(janela), ...achadosDeEquilibrio(equilibrio)].sort(
    (a, b) => b.forca - a.forca,
  );

  return {
    retrato: montarRetrato(janela, equilibrio),
    equilibrio,
    achados,
    serie: janela.dias.map((d) => ({
      chave: d.chave,
      diaSemana: d.diaSemana,
      humor: d.humor,
      energia: d.energia,
      treinou: d.treinou,
      registrou: d.registrou,
    })),
    diasComCheckin: janela.diasComCheckin,
    janelaDias: janela.dias.length,
  };
}

/**
 * Persiste os achados como Insights.
 *
 * Guardar em vez de recalcular a cada render tem um motivo de produto: assim
 * o usuário pode dispensar um card e ele não volta no dia seguinte.
 */
export async function sincronizarInsights(
  userId: string,
  achados: Achado[],
  janelaDias: number,
): Promise<void> {
  const ate = new Date();
  const de = new Date(ate.getTime() - janelaDias * 86_400_000);

  for (const a of achados) {
    await prisma.insight
      .upsert({
        where: { userId_key: { userId, key: a.key } },
        create: {
          userId,
          key: a.key,
          kind: a.kind,
          area: a.area,
          title: a.titulo,
          body: a.corpo,
          strength: a.forca,
          windowFrom: de,
          windowTo: ate,
        },
        // Atualizamos o conteúdo mas preservamos `dismissedAt`: se a pessoa
        // dispensou este achado, ele continua dispensado.
        update: {
          title: a.titulo,
          body: a.corpo,
          strength: a.forca,
          windowFrom: de,
          windowTo: ate,
        },
      })
      .catch(() => undefined);
  }
}

/** Achados que o usuário ainda não dispensou. */
export async function insightsVisiveis(userId: string, limite = 6) {
  return prisma.insight.findMany({
    where: { userId, dismissedAt: null },
    orderBy: [{ strength: 'desc' }, { createdAt: 'desc' }],
    take: limite,
  });
}

/**
 * A observação do dia para a Home.
 *
 * Uma frase só. Ela olha para o dia inteiro — agenda, treino, metas, ausência —
 * e não para uma área isolada. É a camada de vida em versão de bolso.
 */
export async function observacaoDoDia(
  userId: string,
  ctx: {
    compromissosHoje: number;
    proximoTreinoEm: number | null; // minutos até o próximo treino de hoje
    tarefasAbertas: number;
    metaQuaseLa: { titulo: string; pct: number } | null;
  },
): Promise<string | null> {
  const janela = await carregarJanela(userId, 14);
  const semRegistro = sequenciaAtual(janela.dias, (d) => !d.registrou);

  if (semRegistro >= 4) return VOZ.semRegistroHaDias();

  if (ctx.proximoTreinoEm !== null && ctx.proximoTreinoEm > 30 && ctx.proximoTreinoEm < 240) {
    return 'Você tem treino mais tarde. Quer separar 30 minutos antes para descansar?';
  }

  if (ctx.metaQuaseLa && ctx.metaQuaseLa.pct >= 80) {
    return `"${ctx.metaQuaseLa.titulo}" está chegando perto. ${ctx.metaQuaseLa.pct}% do caminho.`;
  }

  if (ctx.compromissosHoje === 0 && ctx.tarefasAbertas === 0) {
    return 'Hoje está livre. Nada marcado, nada pendente.';
  }

  if (ctx.compromissosHoje >= 4) {
    const hoje = new Date();
    return `${nomeDiaLongo(hoje)} está cheia. Comece pela primeira e o resto se resolve.`;
  }

  const treinosSemana = janela.dias.slice(-7).filter((d) => d.treinou).length;
  if (treinosSemana >= 3) {
    return `Você treinou ${treinosSemana} vezes esta semana. Continue assim.`;
  }

  return null;
}
