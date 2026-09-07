import { prisma } from '@/lib/prisma';
import { corpoJson, invalido, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { eventoAtualizarSchema } from '@/lib/validation';
import { garantirAfetado, garantirExiste } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const GET = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const evento = await prisma.event.findFirst({ where: { id, userId } });
  return ok(garantirExiste(evento, 'Esse evento'));
});

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = eventoAtualizarSchema.parse(await corpoJson(req));

  const atual = garantirExiste(
    await prisma.event.findFirst({ where: { id, userId } }),
    'Esse evento',
  );

  // A coerência início/fim precisa valer também numa edição parcial, em que
  // só um dos dois campos vem no corpo.
  const startAt = dados.startAt ?? atual.startAt;
  const endAt = dados.endAt ?? atual.endAt;
  if (endAt.getTime() < startAt.getTime()) {
    throw invalido('O fim precisa vir depois do começo.', {
      endAt: 'O fim precisa vir depois do começo.',
    });
  }

  const { count } = await prisma.event.updateMany({
    where: { id, userId },
    data: {
      ...(dados.title !== undefined ? { title: dados.title } : {}),
      ...(dados.notes !== undefined ? { notes: dados.notes ?? null } : {}),
      ...(dados.location !== undefined ? { location: dados.location ?? null } : {}),
      ...(dados.category !== undefined ? { category: dados.category } : {}),
      ...(dados.startAt !== undefined ? { startAt } : {}),
      ...(dados.endAt !== undefined ? { endAt } : {}),
      ...(dados.allDay !== undefined ? { allDay: dados.allDay } : {}),
      ...(dados.repeat !== undefined ? { repeat: dados.repeat } : {}),
      ...(dados.repeatUntil !== undefined ? { repeatUntil: dados.repeatUntil ?? null } : {}),
    },
  });

  garantirAfetado(count, 'Esse evento');
  return ok(await prisma.event.findFirst({ where: { id, userId } }));
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { count } = await prisma.event.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Esse evento');
  return semConteudo();
});
