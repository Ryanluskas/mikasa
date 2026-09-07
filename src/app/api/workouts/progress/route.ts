import { prisma } from '@/lib/prisma';
import { ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';

export const runtime = 'nodejs';

/**
 * Evolução de carga por exercício.
 *
 * "Supino: 20kg → 25kg → 30kg" é a única métrica de academia que importa para
 * uma pessoa comum. Devolvemos a série por exercício, já em ordem cronológica.
 */
export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);
  const nome = url.searchParams.get('exercicio');

  const exercicios = await prisma.workoutExercise.findMany({
    where: { userId, ...(nome ? { name: nome } : {}) },
    include: { workout: { select: { startedAt: true } } },
    orderBy: { workout: { startedAt: 'asc' } },
    take: 500,
  });

  const porNome = new Map<
    string,
    { data: Date; weightG: number; sets: number; reps: number }[]
  >();

  for (const e of exercicios) {
    const lista = porNome.get(e.name) ?? [];
    lista.push({
      data: e.workout.startedAt,
      weightG: e.weightG,
      sets: e.sets,
      reps: e.reps,
    });
    porNome.set(e.name, lista);
  }

  const series = [...porNome.entries()]
    .map(([nomeExercicio, pontos]) => {
      const primeiro = pontos[0];
      const ultimo = pontos[pontos.length - 1];
      return {
        exercicio: nomeExercicio,
        pontos,
        evoluiuG: ultimo.weightG - primeiro.weightG,
        registros: pontos.length,
      };
    })
    // Quem tem um registro só ainda não tem evolução para mostrar.
    .filter((s) => s.registros >= 2)
    .sort((a, b) => b.registros - a.registros);

  return ok(series);
});
