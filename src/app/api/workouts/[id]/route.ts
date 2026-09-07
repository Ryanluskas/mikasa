import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { treinoAtualizarSchema } from '@/lib/validation';
import { garantirAfetado, garantirExiste } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const GET = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const treino = await prisma.workout.findFirst({
    where: { id, userId },
    include: { exercises: { orderBy: { order: 'asc' } } },
  });
  return ok(garantirExiste(treino, 'Esse treino'));
});

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = treinoAtualizarSchema.parse(await corpoJson(req));

  garantirExiste(
    await prisma.workout.findFirst({ where: { id, userId }, select: { id: true } }),
    'Esse treino',
  );

  // Trocar a lista de exercícios é apagar e recriar — mas dentro de uma
  // transação. Sem ela, uma falha no meio deixaria o treino sem exercício
  // nenhum, e o histórico de carga do usuário perderia um dia.
  await prisma.$transaction(async (tx) => {
    await tx.workout.updateMany({
      where: { id, userId },
      data: {
        ...(dados.kind !== undefined ? { kind: dados.kind } : {}),
        ...(dados.title !== undefined ? { title: dados.title ?? null } : {}),
        ...(dados.startedAt !== undefined ? { startedAt: dados.startedAt } : {}),
        ...(dados.durationMin !== undefined ? { durationMin: dados.durationMin } : {}),
        ...(dados.intensity !== undefined ? { intensity: dados.intensity } : {}),
        ...(dados.notes !== undefined ? { notes: dados.notes ?? null } : {}),
      },
    });

    if (dados.exercises) {
      await tx.workoutExercise.deleteMany({ where: { workoutId: id, userId } });
      if (dados.exercises.length) {
        await tx.workoutExercise.createMany({
          data: dados.exercises.map((e, i) => ({
            userId,
            workoutId: id,
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weightG: e.weightG,
            restSec: e.restSec,
            order: i,
          })),
        });
      }
    }
  });

  const treino = await prisma.workout.findFirst({
    where: { id, userId },
    include: { exercises: { orderBy: { order: 'asc' } } },
  });

  return ok(treino);
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { count } = await prisma.workout.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Esse treino');
  return semConteudo();
});
