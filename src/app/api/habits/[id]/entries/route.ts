import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { habitoMarcarSchema } from '@/lib/validation';
import { garantirExiste } from '@/lib/owned';
import { startOfDay } from '@/lib/dates';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Marca ou desmarca o hábito num dia. */
export const PUT = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { date, done } = habitoMarcarSchema.parse(await corpoJson(req));

  garantirExiste(
    await prisma.habit.findFirst({ where: { id, userId }, select: { id: true } }),
    'Esse hábito',
  );

  // Normalizar para 00:00 é o que garante "um registro por dia": sem isso,
  // marcar às 9h e às 21h criaria dois registros do mesmo dia e a sequência
  // do usuário viraria ficção.
  const dia = startOfDay(date);

  if (!done) {
    await prisma.habitEntry.deleteMany({ where: { habitId: id, userId, date: dia } });
    return ok({ done: false, date: dia });
  }

  await prisma.habitEntry.upsert({
    where: { habitId_date: { habitId: id, date: dia } },
    create: { userId, habitId: id, date: dia, done: true },
    update: { done: true },
  });

  return ok({ done: true, date: dia });
});
