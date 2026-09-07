import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { projetoCriarSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);

  const projetos = await prisma.project.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
    include: {
      // Contagem em vez da lista inteira: a tela de projetos mostra "3 de 8",
      // e não precisa carregar as oito tarefas.
      _count: { select: { tasks: true } },
      tasks: { where: { done: false }, select: { id: true }, take: 100 },
    },
    take: 100,
  });

  return ok(
    projetos.map((p) => ({
      id: p.id,
      name: p.name,
      notes: p.notes,
      status: p.status,
      deadline: p.deadline,
      totalTarefas: p._count.tasks,
      abertas: p.tasks.length,
    })),
  );
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = projetoCriarSchema.parse(await corpoJson(req));

  const projeto = await prisma.project.create({
    data: {
      userId,
      name: dados.name,
      notes: dados.notes ?? null,
      deadline: dados.deadline ?? null,
    },
  });

  return ok({ ...projeto, totalTarefas: 0, abertas: 0 }, 201);
});
