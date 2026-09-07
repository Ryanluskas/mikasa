import { prisma } from '@/lib/prisma';
import { corpoJson, invalido, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { tarefaCriarSchema } from '@/lib/validation';
import { paginacao } from '@/lib/owned';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);
  const { take, skip } = paginacao(url);

  const done = url.searchParams.get('done');
  const area = url.searchParams.get('area');

  const tarefas = await prisma.task.findMany({
    where: {
      userId,
      ...(done === 'true' ? { done: true } : done === 'false' ? { done: false } : {}),
      ...(area ? { area } : {}),
    },
    orderBy: [{ done: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    take,
    skip,
    include: { project: { select: { id: true, name: true } } },
  });

  return ok(tarefas);
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = tarefaCriarSchema.parse(await corpoJson(req));

  // Uma tarefa só pode apontar para um projeto ou matéria DO PRÓPRIO usuário.
  // Sem esta checagem, mandar o ID de um projeto alheio criaria um vínculo
  // entre contas — o clássico "mass assignment".
  if (dados.projectId) {
    const projeto = await prisma.project.findFirst({
      where: { id: dados.projectId, userId },
      select: { id: true },
    });
    if (!projeto) throw invalido('Esse projeto não existe.', { projectId: 'Projeto inválido.' });
  }

  if (dados.subjectId) {
    const materia = await prisma.subject.findFirst({
      where: { id: dados.subjectId, userId },
      select: { id: true },
    });
    if (!materia) throw invalido('Essa matéria não existe.', { subjectId: 'Matéria inválida.' });
  }

  const tarefa = await prisma.task.create({
    data: {
      userId, // sempre do servidor, nunca do corpo da requisição
      title: dados.title,
      notes: dados.notes ?? null,
      dueAt: dados.dueAt ?? null,
      priority: dados.priority,
      area: dados.area,
      projectId: dados.projectId ?? null,
      subjectId: dados.subjectId ?? null,
    },
  });

  return ok(tarefa, 201);
});
