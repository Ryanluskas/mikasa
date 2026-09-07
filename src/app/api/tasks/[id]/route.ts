import { prisma } from '@/lib/prisma';
import { corpoJson, invalido, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { tarefaAtualizarSchema } from '@/lib/validation';
import { garantirAfetado, garantirExiste } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const GET = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;

  const tarefa = await prisma.task.findFirst({ where: { id, userId } });
  return ok(garantirExiste(tarefa, 'Essa tarefa'));
});

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = tarefaAtualizarSchema.parse(await corpoJson(req));

  if (dados.projectId) {
    const projeto = await prisma.project.findFirst({
      where: { id: dados.projectId, userId },
      select: { id: true },
    });
    if (!projeto) throw invalido('Esse projeto não existe.', { projectId: 'Projeto inválido.' });
  }

  // `doneAt` é derivado de `done` no servidor. O cliente não escolhe quando
  // a tarefa foi concluída — senão a camada de vida analisaria datas forjadas.
  const doneAt =
    dados.done === undefined ? undefined : dados.done ? new Date() : null;

  const { count } = await prisma.task.updateMany({
    where: { id, userId },
    data: {
      ...(dados.title !== undefined ? { title: dados.title } : {}),
      ...(dados.notes !== undefined ? { notes: dados.notes ?? null } : {}),
      ...(dados.dueAt !== undefined ? { dueAt: dados.dueAt ?? null } : {}),
      ...(dados.priority !== undefined ? { priority: dados.priority } : {}),
      ...(dados.area !== undefined ? { area: dados.area } : {}),
      ...(dados.projectId !== undefined ? { projectId: dados.projectId ?? null } : {}),
      ...(dados.subjectId !== undefined ? { subjectId: dados.subjectId ?? null } : {}),
      ...(dados.done !== undefined ? { done: dados.done, doneAt } : {}),
    },
  });

  garantirAfetado(count, 'Essa tarefa');

  const tarefa = await prisma.task.findFirst({ where: { id, userId } });
  return ok(tarefa);
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;

  const { count } = await prisma.task.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Essa tarefa');

  return semConteudo();
});
