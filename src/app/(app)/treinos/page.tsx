import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { addDays, formatDataCurta, startOfDay } from '@/lib/dates';
import { ROTULO_TREINO } from '@/lib/modules';
import { Card, Secao, Tag, Vazio } from '@/components/ui';
import { VOZ } from '@/lib/voice';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Treinos' };

/**
 * Treinos.
 *
 * Academia e luta na mesma tela, porque na vida da pessoa é a mesma coisa:
 * "eu treinei". O que muda é o detalhe que cada modalidade guarda.
 *
 * A evolução de carga é mostrada como uma frase — "20kg → 30kg" — e não como
 * gráfico. É a informação que a pessoa quer, no formato em que ela pensa.
 */
export default async function Treinos() {
  const user = await exigirUsuarioPronto();

  const desde = addDays(startOfDay(new Date()), -29);

  const [treinos, exercicios] = await Promise.all([
    prisma.workout.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      include: { exercises: { orderBy: { order: 'asc' } } },
      take: 30,
    }),
    prisma.workoutExercise.findMany({
      where: { userId: user.id },
      include: { workout: { select: { startedAt: true } } },
      orderBy: { workout: { startedAt: 'asc' } },
      take: 400,
    }),
  ]);

  const noMes = treinos.filter((t) => t.startedAt >= desde).length;

  // Evolução por exercício: primeiro e último registro de carga.
  const porExercicio = new Map<string, { primeiro: number; ultimo: number; n: number }>();
  for (const e of exercicios) {
    const atual = porExercicio.get(e.name);
    if (!atual) {
      porExercicio.set(e.name, { primeiro: e.weightG, ultimo: e.weightG, n: 1 });
    } else {
      atual.ultimo = e.weightG;
      atual.n += 1;
    }
  }

  const evolucoes = [...porExercicio.entries()]
    .filter(([, v]) => v.n >= 2 && v.ultimo !== v.primeiro && v.primeiro > 0)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 5);

  const kg = (g: number) => `${(g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}kg`;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display font-semibold text-ink">Treinos</h1>
        {noMes > 0 && (
          <p className="mt-1.5 text-[15px] text-muted">
            {noMes} {noMes === 1 ? 'treino' : 'treinos'} nos últimos 30 dias.
          </p>
        )}
      </header>

      {treinos.length === 0 ? (
        <Vazio titulo={VOZ.vazio.treinos.titulo} texto={VOZ.vazio.treinos.texto} />
      ) : (
        <>
          {evolucoes.length > 0 && (
            <section>
              <Secao titulo="Sua evolução" />
              <Card className="divide-y divide-line">
                {evolucoes.map(([nome, v]) => (
                  <div key={nome} className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{nome}</span>
                    <span className="tabular shrink-0 text-sm text-muted">
                      {kg(v.primeiro)} <span className="text-faint">→</span>{' '}
                      <span className="font-medium text-ink">{kg(v.ultimo)}</span>
                    </span>
                  </div>
                ))}
              </Card>
            </section>
          )}

          <section>
            <Secao titulo="Histórico" />
            <Card className="divide-y divide-line">
              {treinos.map((t) => (
                <div key={t.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {t.title || ROTULO_TREINO[t.kind] || 'Treino'}
                      </p>
                      <p className="mt-0.5 text-xs text-faint">
                        {formatDataCurta(t.startedAt)} · {t.durationMin} min
                        {t.exercises.length > 0 &&
                          ` · ${t.exercises.length} ${
                            t.exercises.length === 1 ? 'exercício' : 'exercícios'
                          }`}
                      </p>
                    </div>
                    <Tag>{ROTULO_TREINO[t.kind] ?? t.kind}</Tag>
                  </div>

                  {t.exercises.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {t.exercises.map((e) => (
                        <li
                          key={e.id}
                          className="tabular flex items-center justify-between gap-3 text-xs text-muted"
                        >
                          <span className="truncate">{e.name}</span>
                          <span className="shrink-0">
                            {e.sets}×{e.reps}
                            {e.weightG > 0 && ` · ${kg(e.weightG)}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {t.notes && <p className="mt-2 text-xs text-muted">{t.notes}</p>}
                </div>
              ))}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
