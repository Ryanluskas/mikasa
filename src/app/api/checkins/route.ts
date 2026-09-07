import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { checkinSchema } from '@/lib/validation';
import { addDays, startOfDay } from '@/lib/dates';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);
  const dias = Math.min(Math.max(Number(url.searchParams.get('dias')) || 30, 1), 180);
  const desde = addDays(startOfDay(new Date()), -(dias - 1));

  const checkins = await prisma.checkin.findMany({
    where: { userId, date: { gte: desde } },
    orderBy: { date: 'desc' },
  });

  const hoje = checkins.find(
    (c) => startOfDay(c.date).getTime() === startOfDay(new Date()).getTime(),
  );

  return ok({ checkins, hoje: hoje ?? null });
});

/**
 * Registra o check-in de um dia.
 *
 * É um upsert: mudar de ideia sobre como foi o dia é normal, e criar dois
 * check-ins do mesmo dia estragaria toda a estatística da camada de vida.
 */
export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = checkinSchema.parse(await corpoJson(req));

  const dia = startOfDay(dados.date);

  // Check-in é sobre hoje ou sobre o passado. Não faz sentido registrar como
  // você vai estar amanhã.
  const amanha = addDays(startOfDay(new Date()), 1);
  if (dia.getTime() >= amanha.getTime()) {
    return ok({ error: 'Só dá para registrar como você está até hoje.' }, 422);
  }

  const checkin = await prisma.checkin.upsert({
    where: { userId_date: { userId, date: dia } },
    create: {
      userId,
      date: dia,
      mood: dados.mood,
      energy: dados.energy,
      sleepHours: dados.sleepHours ?? null,
      note: dados.note ?? null,
    },
    update: {
      mood: dados.mood,
      energy: dados.energy,
      sleepHours: dados.sleepHours ?? null,
      note: dados.note ?? null,
    },
  });

  return ok(checkin, 201);
});
