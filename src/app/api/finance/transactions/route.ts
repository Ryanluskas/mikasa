import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { transacaoCriarSchema } from '@/lib/validation';
import { intervalo, paginacao } from '@/lib/owned';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);
  const faixa = intervalo(url);
  const { take, skip } = paginacao(url, 60, 300);
  const categoria = url.searchParams.get('categoria');
  const tipo = url.searchParams.get('tipo');

  const transacoes = await prisma.transaction.findMany({
    where: {
      userId,
      ...(faixa ? { occurredAt: faixa } : {}),
      ...(categoria ? { category: categoria } : {}),
      ...(tipo === 'income' || tipo === 'expense' ? { type: tipo } : {}),
    },
    orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    take,
    skip,
  });

  return ok(transacoes);
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = transacaoCriarSchema.parse(await corpoJson(req));

  // `amountCents` já chegou aqui validado como inteiro positivo. O sinal
  // vive em `type` — assim um "gasto de -50" nunca vira uma receita disfarçada.
  const transacao = await prisma.transaction.create({
    data: {
      userId,
      type: dados.type,
      amountCents: dados.amountCents,
      category: dados.category,
      description: dados.description ?? null,
      occurredAt: dados.occurredAt,
      recurring: dados.recurring,
    },
  });

  return ok(transacao, 201);
});
