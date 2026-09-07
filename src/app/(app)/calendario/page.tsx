import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { addDays, startOfMonth, endOfMonth } from '@/lib/dates';
import { expandirEventos } from '@/lib/recurrence';
import { Calendario } from '@/components/calendario/Calendario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Agenda' };

export default async function PaginaCalendario() {
  const user = await exigirUsuarioPronto();

  // Carregamos uma janela larga (mês anterior até o próximo) para que navegar
  // entre meses não dispare uma requisição a cada clique.
  const hoje = new Date();
  const de = addDays(startOfMonth(hoje), -40);
  const ate = addDays(endOfMonth(hoje), 40);

  const eventos = await prisma.event.findMany({
    where: {
      userId: user.id,
      OR: [{ startAt: { gte: de, lte: ate } }, { repeat: { not: 'none' }, startAt: { lte: ate } }],
    },
    take: 400,
  });

  const ocorrencias = expandirEventos(eventos, de, ate);

  return (
    <Calendario
      ocorrencias={ocorrencias.map((o) => ({
        id: `${o.id}:${o.ocorreEm.getTime()}`,
        eventoId: o.id,
        title: o.title,
        category: o.category,
        location: o.location ?? null,
        ocorreEm: o.ocorreEm.toISOString(),
        terminaEm: o.terminaEm.toISOString(),
        allDay: o.allDay,
        eRepeticao: o.eRepeticao,
      }))}
    />
  );
}
