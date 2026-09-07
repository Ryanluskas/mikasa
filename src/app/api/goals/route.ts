import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { metaCriarSchema } from '@/lib/validation';
import { paginacao } from '@/lib/owned';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);
  const { take, skip } = paginacao(url);
  const status = url.searchParams.get('status');

  const metas = await prisma.goal.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
    include: { steps: { orderBy: { order: 'asc' } } },
    take,
    skip,
  });

  return ok(metas);
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = metaCriarSchema.parse(await corpoJson(req));

  const meta = await prisma.goal.create({
    data: {
      userId,
      title: dados.title,
      description: dados.description ?? null,
      area: dados.area,
      targetCents: dados.targetCents ?? null,
      currentCents: dados.currentCents ?? (dados.targetCents != null ? 0 : null),
      targetValue: dados.targetValue ?? null,
      currentValue: dados.currentValue ?? (dados.targetValue != null ? 0 : null),
      unit: dados.unit ?? null,
      deadline: dados.deadline ?? null,
      steps: dados.steps?.length
        ? {
            create: dados.steps.map((title, i) => ({ userId, title, order: i })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  return ok(meta, 201);
});
