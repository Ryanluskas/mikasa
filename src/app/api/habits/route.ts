import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { habitoCriarSchema } from '@/lib/validation';
import { addDays, startOfDay } from '@/lib/dates';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);

  // Trazemos as últimas 5 semanas de marcações: é o que a interface mostra
  // (sequência e consistência) sem puxar o histórico inteiro.
  const desde = addDays(startOfDay(new Date()), -34);

  const habitos = await prisma.habit.findMany({
    where: { userId, archived: false },
    orderBy: { createdAt: 'asc' },
    include: {
      entries: {
        where: { date: { gte: desde }, done: true },
        orderBy: { date: 'desc' },
        select: { date: true },
      },
    },
  });

  return ok(habitos);
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = habitoCriarSchema.parse(await corpoJson(req));

  const habito = await prisma.habit.create({
    data: { userId, name: dados.name, targetPerWeek: dados.targetPerWeek },
  });

  return ok({ ...habito, entries: [] }, 201);
});
