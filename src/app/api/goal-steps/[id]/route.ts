import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { etapaAtualizarSchema } from '@/lib/validation';
import { garantirAfetado } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = etapaAtualizarSchema.parse(await corpoJson(req));

  const { count } = await prisma.goalStep.updateMany({
    where: { id, userId },
    data: {
      ...(dados.title !== undefined ? { title: dados.title } : {}),
      ...(dados.done !== undefined ? { done: dados.done } : {}),
    },
  });

  garantirAfetado(count, 'Essa etapa');

  const etapa = await prisma.goalStep.findFirst({ where: { id, userId } });

  // Mexer numa etapa conta como mexer na meta — a camada de vida usa
  // `updatedAt` da meta para saber quando a área "metas" esteve presente.
  if (etapa) {
    await prisma.goal.updateMany({
      where: { id: etapa.goalId, userId },
      data: { updatedAt: new Date() },
    });
  }

  return ok(etapa);
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { count } = await prisma.goalStep.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Essa etapa');
  return semConteudo();
});
