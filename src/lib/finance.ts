import { prisma } from '@/lib/prisma';
import { endOfMonth, startOfMonth } from '@/lib/dates';

/**
 * Resumo financeiro do mês.
 *
 * Toda a aritmética acontece em centavos inteiros. A soma é feita pelo banco
 * (`aggregate`) para não trazer milhares de linhas até o Node só para somar.
 */

export type ResumoFinanceiro = {
  mes: string;
  entradasCents: number;
  saidasCents: number;
  saldoCents: number;
  /** Comparação com o mês anterior — negativo significa que gastou menos. */
  variacaoSaidasCents: number;
  porCategoria: {
    categoria: string;
    gastoCents: number;
    limiteCents: number | null;
    /** Percentual do orçamento usado. Pode passar de 100. */
    usoPct: number | null;
  }[];
  transacoes: number;
};

export async function resumoDoMes(
  userId: string,
  referencia = new Date(),
): Promise<ResumoFinanceiro> {
  const inicio = startOfMonth(referencia);
  const fim = endOfMonth(referencia);

  const inicioAnterior = startOfMonth(new Date(inicio.getTime() - 1));
  const fimAnterior = endOfMonth(inicioAnterior);

  const [entradas, saidas, saidasAnteriores, porCategoria, orcamentos, total] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'income', occurredAt: { gte: inicio, lte: fim } },
        _sum: { amountCents: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'expense', occurredAt: { gte: inicio, lte: fim } },
        _sum: { amountCents: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
          occurredAt: { gte: inicioAnterior, lte: fimAnterior },
        },
        _sum: { amountCents: true },
      }),
      prisma.transaction.groupBy({
        by: ['category'],
        where: { userId, type: 'expense', occurredAt: { gte: inicio, lte: fim } },
        _sum: { amountCents: true },
      }),
      prisma.budget.findMany({ where: { userId } }),
      prisma.transaction.count({
        where: { userId, occurredAt: { gte: inicio, lte: fim } },
      }),
    ]);

  const entradasCents = entradas._sum.amountCents ?? 0;
  const saidasCents = saidas._sum.amountCents ?? 0;
  const anteriorCents = saidasAnteriores._sum.amountCents ?? 0;

  const limitePorCategoria = new Map(orcamentos.map((o) => [o.category, o.limitCents]));

  const categorias = porCategoria
    .map((c) => {
      const gastoCents = c._sum.amountCents ?? 0;
      const limiteCents = limitePorCategoria.get(c.category) ?? null;
      return {
        categoria: c.category,
        gastoCents,
        limiteCents,
        usoPct:
          limiteCents && limiteCents > 0
            ? Math.round((gastoCents / limiteCents) * 100)
            : null,
      };
    })
    .sort((a, b) => b.gastoCents - a.gastoCents);

  // Categorias com orçamento definido mas sem gasto ainda também aparecem —
  // saber que você ainda não gastou nada em "lazer" é informação.
  for (const o of orcamentos) {
    if (!categorias.some((c) => c.categoria === o.category)) {
      categorias.push({
        categoria: o.category,
        gastoCents: 0,
        limiteCents: o.limitCents,
        usoPct: o.limitCents > 0 ? 0 : null,
      });
    }
  }

  return {
    mes: `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`,
    entradasCents,
    saidasCents,
    saldoCents: entradasCents - saidasCents,
    variacaoSaidasCents: saidasCents - anteriorCents,
    porCategoria: categorias,
    transacoes: total,
  };
}
