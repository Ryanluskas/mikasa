import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { eventoCriarSchema } from '@/lib/validation';
import { intervalo, paginacao } from '@/lib/owned';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);
  const faixa = intervalo(url);
  const { take, skip } = paginacao(url, 200, 500);

  // Eventos recorrentes ficam guardados como UM registro. A expansão em
  // ocorrências acontece na leitura (lib/recurrence), e não no banco: assim
  // editar "toda quinta às 20h" continua sendo editar uma linha.
  const eventos = await prisma.event.findMany({
    where: {
      userId,
      ...(faixa
        ? {
            OR: [
              { startAt: faixa },
              { repeat: { not: 'none' }, startAt: { lte: faixa.lte ?? new Date() } },
            ],
          }
        : {}),
    },
    orderBy: { startAt: 'asc' },
    take,
    skip,
  });

  return ok(eventos);
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = eventoCriarSchema.parse(await corpoJson(req));

  const evento = await prisma.event.create({
    data: {
      userId,
      title: dados.title,
      notes: dados.notes ?? null,
      location: dados.location ?? null,
      category: dados.category,
      startAt: dados.startAt,
      endAt: dados.endAt,
      allDay: dados.allDay,
      repeat: dados.repeat,
      repeatUntil: dados.repeatUntil ?? null,
    },
  });

  return ok(evento, 201);
});
