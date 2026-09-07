import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { metaAtualizarSchema } from '@/lib/validation';
import { garantirAfetado, garantirExiste } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const GET = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;

  const meta = await prisma.goal.findFirst({
    where: { id, userId },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  return ok(garantirExiste(meta, 'Essa meta'));
});

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = metaAtualizarSchema.parse(await corpoJson(req));

  const atual = garantirExiste(
    await prisma.goal.findFirst({ where: { id, userId } }),
    'Essa meta',
  );

  // A meta se conclui sozinha quando o valor chega no alvo. `completedAt` é
  // decidido aqui, no servidor, e não pelo cliente.
  const alvoCents = dados.targetCents ?? atual.targetCents;
  const atualCents = dados.currentCents ?? atual.currentCents;
  const alvoValor = dados.targetValue ?? atual.targetValue;
  const atualValor = dados.currentValue ?? atual.currentValue;

  const atingiu =
    (alvoCents != null && atualCents != null && atualCents >= alvoCents) ||
    (alvoValor != null && atualValor != null && atualValor >= alvoValor);

  const status = dados.status ?? (atingiu && atual.status === 'active' ? 'done' : atual.status);

  const { count } = await prisma.goal.updateMany({
    where: { id, userId },
    data: {
      ...(dados.title !== undefined ? { title: dados.title } : {}),
      ...(dados.description !== undefined ? { description: dados.description ?? null } : {}),
      ...(dados.area !== undefined ? { area: dados.area } : {}),
      ...(dados.targetCents !== undefined ? { targetCents: dados.targetCents ?? null } : {}),
      ...(dados.currentCents !== undefined ? { currentCents: dados.currentCents ?? null } : {}),
      ...(dados.targetValue !== undefined ? { targetValue: dados.targetValue ?? null } : {}),
      ...(dados.currentValue !== undefined ? { currentValue: dados.currentValue ?? null } : {}),
      ...(dados.unit !== undefined ? { unit: dados.unit ?? null } : {}),
      ...(dados.deadline !== undefined ? { deadline: dados.deadline ?? null } : {}),
      status,
      completedAt: status === 'done' ? (atual.completedAt ?? new Date()) : null,
    },
  });

  garantirAfetado(count, 'Essa meta');

  const meta = await prisma.goal.findFirst({
    where: { id, userId },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  return ok({ meta, concluiuAgora: status === 'done' && atual.status !== 'done' });
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  // As etapas somem junto por cascade no schema.
  const { count } = await prisma.goal.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Essa meta');
  return semConteudo();
});
