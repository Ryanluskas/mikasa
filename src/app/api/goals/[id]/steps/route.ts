import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { etapaCriarSchema } from '@/lib/validation';
import { garantirExiste } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const POST = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { title } = etapaCriarSchema.omit({ goalId: true }).parse(await corpoJson(req));

  // A meta precisa ser do usuário antes de ganhar uma etapa. Sem isso,
  // qualquer pessoa poderia escrever dentro da meta de outra.
  garantirExiste(
    await prisma.goal.findFirst({ where: { id, userId }, select: { id: true } }),
    'Essa meta',
  );

  const ultima = await prisma.goalStep.findFirst({
    where: { goalId: id, userId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const etapa = await prisma.goalStep.create({
    data: { userId, goalId: id, title, order: (ultima?.order ?? -1) + 1 },
  });

  return ok(etapa, 201);
});
