import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { materiaSchema } from '@/lib/validation';
import { startOfDay } from '@/lib/dates';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);

  const materias = await prisma.subject.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    include: {
      exams: {
        where: { date: { gte: startOfDay(new Date()) }, status: { not: 'done' } },
        orderBy: { date: 'asc' },
        take: 3,
      },
    },
  });

  return ok(materias);
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const { name } = materiaSchema.parse(await corpoJson(req));

  const materia = await prisma.subject.create({ data: { userId, name } });
  return ok({ ...materia, exams: [] }, 201);
});
