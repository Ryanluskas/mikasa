import { prisma } from '@/lib/prisma';
import { corpoJson, invalido, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { provaCriarSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);

  const provas = await prisma.exam.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
    include: { subject: { select: { id: true, name: true } } },
    take: 100,
  });

  return ok(provas);
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = provaCriarSchema.parse(await corpoJson(req));

  // A matéria precisa ser do usuário — senão daria para pendurar uma prova
  // na matéria de outra pessoa.
  const materia = await prisma.subject.findFirst({
    where: { id: dados.subjectId, userId },
    select: { id: true },
  });
  if (!materia) throw invalido('Essa matéria não existe.', { subjectId: 'Matéria inválida.' });

  const prova = await prisma.exam.create({
    data: {
      userId,
      subjectId: dados.subjectId,
      title: dados.title,
      date: dados.date,
      status: dados.status,
    },
    include: { subject: { select: { id: true, name: true } } },
  });

  return ok(prova, 201);
});
