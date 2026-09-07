import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { resumoDoMes } from '@/lib/finance';
import { formatCents } from '@/lib/money';
import { formatDataCurta, nomeMes } from '@/lib/dates';
import { ROTULO_CATEGORIA_FINANCEIRA } from '@/lib/modules';
import { Card, Progresso, Secao, Tag, Vazio } from '@/components/ui';
import { VOZ } from '@/lib/voice';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Financeiro' };

/**
 * A área financeira.
 *
 * É um app de organização pessoal, não um sistema contábil. A pergunta que
 * esta tela responde é "quanto eu gastei e em quê" — não "qual é meu balanço
 * patrimonial".
 */
export default async function Financeiro() {
  const user = await exigirUsuarioPronto();

  const [resumo, ultimas] = await Promise.all([
    resumoDoMes(user.id),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: 25,
    }),
  ]);

  const agora = new Date();
  const gastouMenos = resumo.variacaoSaidasCents < 0;

  return (
    <div className="space-y-8">
      <header>
        <p className="secao capitalize">{nomeMes(agora)}</p>
        <h1 className="mt-1 text-display font-semibold text-ink">Financeiro</h1>
      </header>

      {resumo.transacoes === 0 && ultimas.length === 0 ? (
        <Vazio titulo={VOZ.vazio.financeiro.titulo} texto={VOZ.vazio.financeiro.texto} />
      ) : (
        <>
          {/* ── O número que importa ─────────────────────────────────────── */}
          <Card className="px-5 py-5">
            <p className="text-sm text-muted">Você gastou este mês</p>
            <p className="tabular mt-1 text-display font-semibold text-ink">
              {formatCents(resumo.saidasCents)}
            </p>

            {Math.abs(resumo.variacaoSaidasCents) > 1000 && (
              <p className="mt-2 text-sm text-muted">
                {formatCents(Math.abs(resumo.variacaoSaidasCents))}{' '}
                {gastouMenos ? 'a menos' : 'a mais'} que no mês passado.
              </p>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
              <div>
                <dt className="text-xs text-faint">Entrou</dt>
                <dd className="tabular mt-0.5 text-base font-medium text-ink">
                  {formatCents(resumo.entradasCents)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-faint">Sobrou</dt>
                <dd
                  className={
                    resumo.saldoCents < 0
                      ? 'tabular mt-0.5 text-base font-medium text-danger'
                      : 'tabular mt-0.5 text-base font-medium text-ink'
                  }
                >
                  {formatCents(resumo.saldoCents)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* ── Por categoria ────────────────────────────────────────────── */}
          {resumo.porCategoria.length > 0 && (
            <section>
              <Secao titulo="Onde foi" />
              <Card className="px-5 py-5">
                <ul className="space-y-4">
                  {resumo.porCategoria.slice(0, 8).map((c) => {
                    const maior = resumo.porCategoria[0].gastoCents || 1;
                    const largura = Math.round((c.gastoCents / maior) * 100);
                    const estourou = c.usoPct !== null && c.usoPct > 100;

                    return (
                      <li key={c.categoria}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-ink">
                            {ROTULO_CATEGORIA_FINANCEIRA[c.categoria] ?? c.categoria}
                          </span>
                          <span className="tabular shrink-0 text-sm text-muted">
                            {formatCents(c.gastoCents)}
                          </span>
                        </div>

                        <div className="mt-1.5">
                          <Progresso valor={largura} rotulo={c.categoria} />
                        </div>

                        {c.limiteCents !== null && (
                          <p className="mt-1.5 flex items-center gap-2 text-xs text-faint">
                            <span className="tabular">
                              {c.usoPct}% de {formatCents(c.limiteCents)}
                            </span>
                            {estourou && <Tag tom="atencao">passou do combinado</Tag>}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          )}

          {/* ── Histórico ────────────────────────────────────────────────── */}
          <section>
            <Secao titulo="Últimos lançamentos" />
            {ultimas.length === 0 ? (
              <Vazio
                titulo="Nada lançado ainda."
                texto="Use o botão + para registrar uma entrada ou despesa."
              />
            ) : (
              <Card className="divide-y divide-line">
                {ultimas.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">
                        {t.description ||
                          ROTULO_CATEGORIA_FINANCEIRA[t.category] ||
                          'Lançamento'}
                      </p>
                      <p className="mt-0.5 text-xs text-faint">
                        {ROTULO_CATEGORIA_FINANCEIRA[t.category] ?? t.category} ·{' '}
                        {formatDataCurta(t.occurredAt)}
                      </p>
                    </div>
                    <span
                      className={
                        t.type === 'income'
                          ? 'tabular shrink-0 text-sm font-medium text-success'
                          : 'tabular shrink-0 text-sm text-ink'
                      }
                    >
                      {t.type === 'income' ? '+' : '−'}
                      {formatCents(t.amountCents)}
                    </span>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
