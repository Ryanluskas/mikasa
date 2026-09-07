import { prisma } from '@/lib/prisma';
import { addDays, endOfDay, startOfDay } from '@/lib/dates';
import { expandirEventos } from '@/lib/recurrence';

/**
 * O dia do usuário, montado de uma vez só.
 *
 * A tela "Hoje" não pergunta a cada área separadamente — ela pergunta ao
 * Mikasa "o que é hoje?". Por isso a montagem do dia vive aqui, e não
 * espalhada em cinco componentes fazendo cinco requisições.
 */

export type ItemDoDia = {
  id: string;
  tipo: 'evento' | 'tarefa' | 'treino' | 'habito' | 'prova' | 'lembrete';
  titulo: string;
  detalhe?: string | null;
  /** Momento do dia, quando existir. Itens sem hora vão para o fim da lista. */
  quando: Date | null;
  concluido: boolean;
  categoria?: string;
  href?: string;
};

export type Dia = {
  data: Date;
  itens: ItemDoDia[];
  /** Quantas coisas "importantes" — o número que a Home mostra. */
  importantes: number;
  concluidos: number;
  checkinFeito: boolean;
};

export async function montarDia(userId: string, referencia = new Date()): Promise<Dia> {
  const inicio = startOfDay(referencia);
  const fim = endOfDay(referencia);

  const [eventosBrutos, tarefas, treinos, habitos, entradasHabito, provas, checkin] =
    await Promise.all([
      // Recorrentes entram mesmo começando no passado — é a expansão que decide.
      prisma.event.findMany({
        where: {
          userId,
          OR: [
            { startAt: { gte: inicio, lte: fim } },
            { repeat: { not: 'none' }, startAt: { lte: fim } },
          ],
        },
        take: 200,
      }),
      prisma.task.findMany({
        where: {
          userId,
          OR: [
            { dueAt: { gte: inicio, lte: fim } },
            // Atrasadas continuam sendo "de hoje" até serem resolvidas.
            { done: false, dueAt: { lt: inicio } },
            { done: true, doneAt: { gte: inicio, lte: fim } },
          ],
        },
        orderBy: [{ done: 'asc' }, { priority: 'desc' }, { dueAt: 'asc' }],
        take: 100,
      }),
      prisma.workout.findMany({
        where: { userId, startedAt: { gte: inicio, lte: fim } },
      }),
      prisma.habit.findMany({ where: { userId, archived: false } }),
      prisma.habitEntry.findMany({
        where: { userId, date: inicio, done: true },
        select: { habitId: true },
      }),
      prisma.exam.findMany({
        where: { userId, date: { gte: inicio, lte: fim } },
        include: { subject: { select: { name: true } } },
      }),
      prisma.checkin.findFirst({ where: { userId, date: inicio } }),
    ]);

  const ocorrencias = expandirEventos(eventosBrutos, inicio, inicio);
  const feitos = new Set(entradasHabito.map((e) => e.habitId));

  const itens: ItemDoDia[] = [
    ...ocorrencias.map((e) => ({
      id: `evento:${e.id}:${e.ocorreEm.getTime()}`,
      tipo: 'evento' as const,
      titulo: e.title,
      detalhe: e.location,
      quando: e.ocorreEm,
      concluido: e.terminaEm.getTime() < Date.now(),
      categoria: e.category,
      href: '/calendario',
    })),
    ...tarefas.map((t) => ({
      id: `tarefa:${t.id}`,
      tipo: 'tarefa' as const,
      titulo: t.title,
      detalhe:
        t.dueAt && t.dueAt < inicio && !t.done ? 'Ficou de outro dia' : null,
      quando: t.dueAt,
      concluido: t.done,
      categoria: t.area,
      href: '/hoje',
    })),
    ...treinos.map((w) => ({
      id: `treino:${w.id}`,
      tipo: 'treino' as const,
      titulo: w.title ?? 'Treino',
      detalhe: `${w.durationMin} min`,
      quando: w.startedAt,
      concluido: true,
      categoria: w.kind,
      href: '/treinos',
    })),
    ...provas.map((p) => ({
      id: `prova:${p.id}`,
      tipo: 'prova' as const,
      titulo: p.title,
      detalhe: p.subject.name,
      quando: p.date,
      concluido: p.status === 'done',
      href: '/estudos',
    })),
    ...habitos.map((h) => ({
      id: `habito:${h.id}`,
      tipo: 'habito' as const,
      titulo: h.name,
      quando: null,
      concluido: feitos.has(h.id),
      href: '/habitos',
    })),
  ];

  // Ordem do dia: primeiro o que tem hora, na hora; depois o que não tem.
  itens.sort((a, b) => {
    if (a.quando && b.quando) return a.quando.getTime() - b.quando.getTime();
    if (a.quando) return -1;
    if (b.quando) return 1;
    return 0;
  });

  // Hábitos não contam como "coisa importante" — eles são o pano de fundo
  // do dia, não compromissos. Somar todos faria a Home dizer "você tem 11
  // coisas hoje" para alguém que só precisa beber água.
  const importantes = itens.filter(
    (i) => i.tipo !== 'habito' && !i.concluido,
  ).length;

  return {
    data: inicio,
    itens,
    importantes,
    concluidos: itens.filter((i) => i.concluido).length,
    checkinFeito: Boolean(checkin),
  };
}

/** Próximos dias com alguma coisa marcada — usado na Home e no calendário. */
export async function proximosDias(userId: string, dias = 7) {
  const inicio = startOfDay(new Date());
  const fim = endOfDay(addDays(inicio, dias));

  const eventos = await prisma.event.findMany({
    where: {
      userId,
      OR: [
        { startAt: { gte: inicio, lte: fim } },
        { repeat: { not: 'none' }, startAt: { lte: fim } },
      ],
    },
    take: 200,
  });

  return expandirEventos(eventos, inicio, fim);
}
