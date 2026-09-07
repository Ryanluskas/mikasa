import { prisma } from '@/lib/prisma';
import { addDays, dayKey, startOfDay } from '@/lib/dates';

/**
 * A camada de vida — parte 1: os sinais.
 *
 * Esta é a ideia central do Mikasa. Cada área (dinheiro, treino, estudo,
 * tarefas, pessoas) sabe muito sobre um pedaço da rotina e nada sobre o resto.
 * Sozinhas, elas produzem relatórios. Juntas, elas produzem uma leitura da
 * vida.
 *
 * Para juntá-las é preciso uma unidade comum. No Mikasa a unidade é o DIA:
 * tudo que aconteceu é reduzido a uma linha por dia, com as mesmas colunas,
 * venha de onde vier. Só depois disso faz sentido perguntar
 * "como uma coisa está afetando a outra".
 *
 * Nada aqui inventa dado. Se o usuário não registrou, o campo é `null` — e
 * `null` nunca vira zero, porque "não registrei" é diferente de "foi zero".
 */

export type DiaDaVida = {
  data: Date;
  chave: string;
  /** 0 = domingo */
  diaSemana: number;

  // Como a pessoa disse que estava (só do check-in — nunca inferido).
  humor: number | null; // 1..5
  energia: number | null; // 1..3
  sono: number | null; // horas

  // O que a pessoa fez.
  treinou: boolean;
  cargaTreino: number; // minutos × intensidade
  minutosEstudo: number;
  tarefasConcluidas: number;
  compromissos: number;
  gastoCents: number;
  entradaCents: number;
  habitosFeitos: number;
  habitosPossiveis: number;
  contatosPessoas: number;

  /** Houve qualquer registro neste dia? Base para "sumiu por uns dias". */
  registrou: boolean;
};

export type JanelaDeVida = {
  dias: DiaDaVida[];
  de: Date;
  ate: Date;
  /** Dias com check-in — o denominador honesto de qualquer análise de humor. */
  diasComCheckin: number;
  diasComRegistro: number;
};

/**
 * Monta a janela de dias do usuário.
 *
 * Uma consulta por área, todas escopadas por `userId` e pelo intervalo. Não
 * usamos N+1: o custo é constante no número de dias pedidos.
 */
export async function carregarJanela(
  userId: string,
  dias = 30,
  fim = new Date(),
): Promise<JanelaDeVida> {
  const ate = startOfDay(fim);
  const de = addDays(ate, -(dias - 1));
  const limiteSuperior = addDays(ate, 1);

  const [
    checkins,
    treinos,
    estudos,
    tarefas,
    eventos,
    transacoes,
    habitos,
    entradasHabito,
    relacoes,
  ] = await Promise.all([
    prisma.checkin.findMany({
      where: { userId, date: { gte: de, lt: limiteSuperior } },
      select: { date: true, mood: true, energy: true, sleepHours: true },
    }),
    prisma.workout.findMany({
      where: { userId, startedAt: { gte: de, lt: limiteSuperior } },
      select: { startedAt: true, durationMin: true, intensity: true },
    }),
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: de, lt: limiteSuperior } },
      select: { startedAt: true, minutes: true },
    }),
    prisma.task.findMany({
      where: { userId, doneAt: { gte: de, lt: limiteSuperior } },
      select: { doneAt: true },
    }),
    prisma.event.findMany({
      where: { userId, startAt: { gte: de, lt: limiteSuperior } },
      select: { startAt: true },
    }),
    prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: de, lt: limiteSuperior } },
      select: { occurredAt: true, type: true, amountCents: true },
    }),
    prisma.habit.count({ where: { userId, archived: false } }),
    prisma.habitEntry.findMany({
      where: { userId, done: true, date: { gte: de, lt: limiteSuperior } },
      select: { date: true },
    }),
    prisma.relationship.findMany({
      where: { userId, lastContactAt: { gte: de, lt: limiteSuperior } },
      select: { lastContactAt: true },
    }),
  ]);

  // Esqueleto: um dia por posição, sempre presente mesmo sem dado nenhum.
  const mapa = new Map<string, DiaDaVida>();
  for (let i = 0; i < dias; i++) {
    const data = addDays(de, i);
    mapa.set(dayKey(data), {
      data,
      chave: dayKey(data),
      diaSemana: data.getDay(),
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
      habitosPossiveis: habitos,
      contatosPessoas: 0,
      registrou: false,
    });
  }

  const em = (d: Date | null) => (d ? mapa.get(dayKey(d)) : undefined);

  for (const c of checkins) {
    const dia = em(c.date);
    if (!dia) continue;
    dia.humor = c.mood;
    dia.energia = c.energy;
    dia.sono = c.sleepHours;
    dia.registrou = true;
  }

  for (const t of treinos) {
    const dia = em(t.startedAt);
    if (!dia) continue;
    dia.treinou = true;
    dia.cargaTreino += t.durationMin * t.intensity;
    dia.registrou = true;
  }

  for (const s of estudos) {
    const dia = em(s.startedAt);
    if (!dia) continue;
    dia.minutosEstudo += s.minutes;
    dia.registrou = true;
  }

  for (const t of tarefas) {
    const dia = em(t.doneAt);
    if (!dia) continue;
    dia.tarefasConcluidas += 1;
    dia.registrou = true;
  }

  for (const e of eventos) {
    const dia = em(e.startAt);
    if (!dia) continue;
    dia.compromissos += 1;
  }

  for (const t of transacoes) {
    const dia = em(t.occurredAt);
    if (!dia) continue;
    if (t.type === 'expense') dia.gastoCents += t.amountCents;
    else dia.entradaCents += t.amountCents;
    dia.registrou = true;
  }

  for (const h of entradasHabito) {
    const dia = em(h.date);
    if (!dia) continue;
    dia.habitosFeitos += 1;
    dia.registrou = true;
  }

  for (const r of relacoes) {
    const dia = em(r.lastContactAt);
    if (!dia) continue;
    dia.contatosPessoas += 1;
    dia.registrou = true;
  }

  const lista = [...mapa.values()].sort(
    (a, b) => a.data.getTime() - b.data.getTime(),
  );

  return {
    dias: lista,
    de,
    ate,
    diasComCheckin: lista.filter((d) => d.humor !== null).length,
    diasComRegistro: lista.filter((d) => d.registrou).length,
  };
}

// ── Utilidades estatísticas honestas ─────────────────────────────────────────

export function media(valores: number[]): number {
  if (!valores.length) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export function soma(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0);
}

/**
 * Correlação de Pearson.
 *
 * Devolve `null` quando não há variação em uma das séries — nesse caso o
 * coeficiente é indefinido, e fingir que é zero seria mentira estatística.
 */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;

  const mx = media(xs.slice(0, n));
  const my = media(ys.slice(0, n));

  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }

  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Sequência atual de dias consecutivos que satisfazem o teste, até hoje. */
export function sequenciaAtual(
  dias: DiaDaVida[],
  teste: (d: DiaDaVida) => boolean,
): number {
  let conta = 0;
  for (let i = dias.length - 1; i >= 0; i--) {
    if (teste(dias[i])) conta++;
    else break;
  }
  return conta;
}
