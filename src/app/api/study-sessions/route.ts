import { prisma } from '@/lib/prisma';
import { corpoJson, invalido, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { sessaoEstudoSchema } from '@/lib/validation';
import { addDays, startOfDay } from '@/lib/dates';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);
  const dias = Math.min(Math.max(Number(url.searchParams.get('dias')) || 30, 1), 365);
  const desde = addDays(startOfDay(new Date()), -(dias - 1));

  const [sessoes, agregado] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: desde } },
      orderBy: { startedAt: 'desc' },
      include: { subject: { select: { id: true, name: true } } },
      take: 200,
    }),
    prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: desde } },
      _sum: { minutes: true },
    }),
  ]);

  return ok({ sessoes, minutosTotais: agregado._sum.minutes ?? 0, dias });
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = sessaoEstudoSchema.parse(await corpoJson(req));

  if (dados.subjectId) {
    const materia = await prisma.subject.findFirst({
      where: { id: dados.subjectId, userId },
      select: { id: true },
    });
    if (!materia) throw invalido('Essa matéria não existe.', { subjectId: 'Matéria inválida.' });
  }

  const sessao = await prisma.studySession.create({
    data: {
      userId,
      subjectId: dados.subjectId ?? null,
      minutes: dados.minutes,
      startedAt: dados.startedAt,
      notes: dados.notes ?? null,
    },
  });

  return ok(sessao, 201);
});
