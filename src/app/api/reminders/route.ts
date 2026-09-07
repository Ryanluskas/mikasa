import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { lembreteCriarSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);

  const lembretes = await prisma.reminder.findMany({
    where: { userId },
    orderBy: [{ enabled: 'desc' }, { timeMin: 'asc' }],
    take: 100,
  });

  return ok(
    lembretes.map((l) => ({ ...l, daysOfWeek: JSON.parse(l.daysOfWeek) as number[] })),
  );
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = lembreteCriarSchema.parse(await corpoJson(req));

  const lembrete = await prisma.reminder.create({
    data: {
      userId,
      title: dados.title,
      message: dados.message ?? null,
      category: dados.category,
      timeMin: dados.timeMin,
      // Ordenado e sem repetição: [3,1,1] vira [1,3].
      daysOfWeek: JSON.stringify([...new Set(dados.daysOfWeek)].sort((a, b) => a - b)),
      enabled: dados.enabled,
    },
  });

  return ok({ ...lembrete, daysOfWeek: JSON.parse(lembrete.daysOfWeek) as number[] }, 201);
});
