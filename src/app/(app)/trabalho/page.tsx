import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { endOfDay, formatRelativo, startOfDay } from '@/lib/dates';
import { addDays } from '@/lib/dates';
import { Card, Secao, Tag, Vazio } from '@/components/ui';
import { PainelDeTrabalho } from '@/components/trabalho/PainelDeTrabalho';
import { VOZ } from '@/lib/voice';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Trabalho' };

/**
 * Trabalho.
 *
 * Separado do resto de propósito: o prompt pedia "Hoje / Esta semana /
 * Projetos / Concluídos". A divisão importa porque trabalho é a área que mais
 * invade as outras — dar a ela um lugar próprio é o que impede isso.
 */
export default async function Trabalho() {
  const user = await exigirUsuarioPronto();

  const hoje = startOfDay(new Date());
  const fimSemana = endOfDay(addDays(hoje, 7));

  const [deHoje, daSemana, projetos, concluidas] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId: user.id,
        area: 'work',
        done: false,
        OR: [{ dueAt: { lte: endOfDay(hoje) } }, { dueAt: null }],
      },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
      take: 30,
    }),
    prisma.task.findMany({
      where: {
        userId: user.id,
        area: 'work',
        done: false,
        dueAt: { gt: endOfDay(hoje), lte: fimSemana },
      },
      orderBy: { dueAt: 'asc' },
      take: 30,
    }),
    prisma.project.findMany({
      where: { userId: user.id, status: 'active' },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
      include: { tasks: { where: { done: false }, select: { id: true } } },
      take: 20,
    }),
    prisma.task.count({
      where: { userId: user.id, area: 'work', done: true, doneAt: { gte: addDays(hoje, -7) } },
    }),
  ]);

  const vazio =
    deHoje.length === 0 && daSemana.length === 0 && projetos.length === 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display font-semibold text-ink">Trabalho</h1>
        {concluidas > 0 && (
          <p className="mt-1.5 text-[15px] text-muted">
            {concluidas} {concluidas === 1 ? 'entrega concluída' : 'entregas concluídas'} nos
            últimos 7 dias.
          </p>
        )}
      </header>

      {vazio ? (
        <Vazio titulo={VOZ.vazio.trabalho.titulo} texto={VOZ.vazio.trabalho.texto} />
      ) : (
        <>
          {deHoje.length > 0 && (
            <section>
              <Secao titulo="Hoje" />
              <Card className="divide-y divide-line">
                {deHoje.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="flex-1 truncate text-sm text-ink">{t.title}</span>
                    {t.priority === 2 && <Tag tom="atencao">Prioridade</Tag>}
                  </div>
                ))}
              </Card>
            </section>
          )}

          {daSemana.length > 0 && (
            <section>
              <Secao titulo="Esta semana" />
              <Card className="divide-y divide-line">
                {daSemana.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="flex-1 truncate text-sm text-ink">{t.title}</span>
                    {t.dueAt && (
                      <span className="shrink-0 text-xs text-faint">
                        {formatRelativo(t.dueAt)}
                      </span>
                    )}
                  </div>
                ))}
              </Card>
            </section>
          )}

          {projetos.length > 0 && (
            <section>
              <Secao titulo="Projetos" />
              <Card className="divide-y divide-line">
                {projetos.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{p.name}</p>
                      <p className="mt-0.5 text-xs text-faint">
                        {p.tasks.length === 0
                          ? 'Nada pendente'
                          : `${p.tasks.length} ${
                              p.tasks.length === 1 ? 'tarefa aberta' : 'tarefas abertas'
                            }`}
                        {p.deadline && ` · ${formatRelativo(p.deadline)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </>
      )}

      <PainelDeTrabalho />
    </div>
  );
}
