import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { transacaoAtualizarSchema } from '@/lib/validation';
import { garantirAfetado, garantirExiste } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const GET = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const t = await prisma.transaction.findFirst({ where: { id, userId } });
  return ok(garantirExiste(t, 'Esse lançamento'));
});

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = transacaoAtualizarSchema.parse(await corpoJson(req));

  const { count } = await prisma.transaction.updateMany({
    where: { id, userId },
    data: {
      ...(dados.type !== undefined ? { type: dados.type } : {}),
      ...(dados.amountCents !== undefined ? { amountCents: dados.amountCents } : {}),
      ...(dados.category !== undefined ? { category: dados.category } : {}),
      ...(dados.description !== undefined ? { description: dados.description ?? null } : {}),
      ...(dados.occurredAt !== undefined ? { occurredAt: dados.occurredAt } : {}),
      ...(dados.recurring !== undefined ? { recurring: dados.recurring } : {}),
    },
  });

  garantirAfetado(count, 'Esse lançamento');
  return ok(await prisma.transaction.findFirst({ where: { id, userId } }));
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { count } = await prisma.transaction.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Esse lançamento');
  return semConteudo();
});
