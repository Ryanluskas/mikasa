import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { habitoAtualizarSchema } from '@/lib/validation';
import { garantirAfetado } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = habitoAtualizarSchema.parse(await corpoJson(req));

  const { count } = await prisma.habit.updateMany({
    where: { id, userId },
    data: {
      ...(dados.name !== undefined ? { name: dados.name } : {}),
      ...(dados.targetPerWeek !== undefined ? { targetPerWeek: dados.targetPerWeek } : {}),
      ...(dados.archived !== undefined ? { archived: dados.archived } : {}),
    },
  });

  garantirAfetado(count, 'Esse hábito');
  return ok(await prisma.habit.findFirst({ where: { id, userId } }));
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { count } = await prisma.habit.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Esse hábito');
  return semConteudo();
});
