import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { treinoCriarSchema } from '@/lib/validation';
import { intervalo, paginacao } from '@/lib/owned';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);
  const faixa = intervalo(url);
  const { take, skip } = paginacao(url, 40, 200);
  const kind = url.searchParams.get('kind');

  const treinos = await prisma.workout.findMany({
    where: { userId, ...(faixa ? { startedAt: faixa } : {}), ...(kind ? { kind } : {}) },
    orderBy: { startedAt: 'desc' },
    include: { exercises: { orderBy: { order: 'asc' } } },
    take,
    skip,
  });

  return ok(treinos);
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = treinoCriarSchema.parse(await corpoJson(req));

  const treino = await prisma.workout.create({
    data: {
      userId,
      kind: dados.kind,
      title: dados.title ?? null,
      startedAt: dados.startedAt,
      durationMin: dados.durationMin,
      intensity: dados.intensity,
      notes: dados.notes ?? null,
      exercises: {
        create: dados.exercises.map((e, i) => ({
          userId,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weightG: e.weightG,
          restSec: e.restSec,
          order: i,
        })),
      },
    },
    include: { exercises: { orderBy: { order: 'asc' } } },
  });

  const total = await prisma.workout.count({ where: { userId } });
  return ok({ treino, totalTreinos: total }, 201);
});
