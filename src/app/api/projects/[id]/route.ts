import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { projetoAtualizarSchema } from '@/lib/validation';
import { garantirAfetado, garantirExiste } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const GET = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;

  const projeto = await prisma.project.findFirst({
    where: { id, userId },
    include: { tasks: { orderBy: [{ done: 'asc' }, { dueAt: 'asc' }] } },
  });

  return ok(garantirExiste(projeto, 'Esse projeto'));
});

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = projetoAtualizarSchema.parse(await corpoJson(req));

  const { count } = await prisma.project.updateMany({
    where: { id, userId },
    data: {
      ...(dados.name !== undefined ? { name: dados.name } : {}),
      ...(dados.notes !== undefined ? { notes: dados.notes ?? null } : {}),
      ...(dados.deadline !== undefined ? { deadline: dados.deadline ?? null } : {}),
      ...(dados.status !== undefined ? { status: dados.status } : {}),
    },
  });

  garantirAfetado(count, 'Esse projeto');
  return ok(await prisma.project.findFirst({ where: { id, userId } }));
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;

  // As tarefas do projeto continuam existindo, soltas (SetNull no schema).
  // Apagar um projeto não deve apagar o trabalho que já foi feito.
  const { count } = await prisma.project.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Esse projeto');

  return semConteudo();
});
