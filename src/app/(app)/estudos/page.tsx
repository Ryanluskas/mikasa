import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { addDays, formatDuracao, formatRelativo, startOfDay } from '@/lib/dates';
import { Card, Secao, Tag, Vazio } from '@/components/ui';
import { PainelDeEstudos } from '@/components/estudos/PainelDeEstudos';
import { VOZ } from '@/lib/voice';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Estudos' };

export default async function Estudos() {
  const user = await exigirUsuarioPronto();
  const desde = addDays(startOfDay(new Date()), -6);

  const [materias, provas, horasSemana] = await Promise.all([
    prisma.subject.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    }),
    prisma.exam.findMany({
      where: { userId: user.id, status: { not: 'done' }, date: { gte: startOfDay(new Date()) } },
      orderBy: { date: 'asc' },
      include: { subject: { select: { name: true } } },
      take: 10,
    }),
    prisma.studySession.aggregate({
      where: { userId: user.id, startedAt: { gte: desde } },
      _sum: { minutes: true },
    }),
  ]);

  const minutos = horasSemana._sum.minutes ?? 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display font-semibold text-ink">Estudos</h1>
        {minutos > 0 && (
          <p className="mt-1.5 text-[15px] text-muted">
            Você estudou {formatDuracao(minutos)} nesta semana.
          </p>
        )}
      </header>

      {provas.length > 0 && (
        <section>
          <Secao titulo="Chegando" />
          <Card className="divide-y divide-line">
            {provas.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{p.title}</p>
                  <p className="mt-0.5 text-xs text-faint">{p.subject.name}</p>
                </div>
                <Tag tom={p.date.getTime() - Date.now() < 3 * 86_400_000 ? 'atencao' : 'neutro'}>
                  {formatRelativo(p.date)}
                </Tag>
              </div>
            ))}
          </Card>
        </section>
      )}

      {materias.length === 0 ? (
        <Vazio titulo={VOZ.vazio.estudos.titulo} texto={VOZ.vazio.estudos.texto} />
      ) : null}

      <PainelDeEstudos
        materias={materias.map((m) => ({ id: m.id, name: m.name }))}
      />
    </div>
  );
}
