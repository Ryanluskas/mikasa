import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { lerVida, sincronizarInsights } from '@/lib/life/engine';
import { Card, Secao, Vazio } from '@/components/ui';
import { Achados } from '@/components/life/Achados';
import { Equilibrio } from '@/components/life/Equilibrio';
import { LinhaDaSemana } from '@/components/life/LinhaDaSemana';
import { VOZ } from '@/lib/voice';
import type { AreaModulo } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Vida' };

/**
 * A tela Vida.
 *
 * É a razão do Mikasa existir como um aplicativo só.
 *
 * Finanças, treino, estudo e agenda existem separados em dezenas de apps. O
 * que nenhum deles responde é a pergunta que a pessoa realmente tem:
 * "como essas coisas estão afetando a minha vida como um todo?"
 *
 * Esta página responde isso — e só com o que foi de fato registrado. Quando
 * não há dados suficientes, ela diz que não há, em vez de inventar um número.
 */
export default async function Vida() {
  const user = await exigirUsuarioPronto();

  if (!user.lifeLayerEnabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-display font-semibold text-ink">Vida</h1>
        <Vazio
          titulo="Esta camada está desligada."
          texto="Você pode ligar de novo em Perfil, quando quiser."
          acao={
            <Link href="/perfil" className="text-sm text-accent underline-offset-4 hover:underline">
              Ir para o perfil
            </Link>
          }
        />
      </div>
    );
  }

  const modulos = user.modules.filter((m) => m.enabled).map((m) => m.key as AreaModulo);
  const leitura = await lerVida(user.id, modulos, 30);

  await sincronizarInsights(user.id, leitura.achados, 30);

  const dispensados = await prisma.insight.findMany({
    where: { userId: user.id, dismissedAt: { not: null } },
    select: { key: true },
  });
  const escondidos = new Set(dispensados.map((d) => d.key));
  const achados = leitura.achados.filter((a) => !escondidos.has(a.key));

  const temAlgo = leitura.retrato.numeros.length > 0 || leitura.diasComCheckin > 0;

  return (
    <div className="space-y-9">
      <header>
        <h1 className="text-display font-semibold text-ink">Sua vida</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Como as áreas que você acompanha estão se conectando.
        </p>
      </header>

      {!temAlgo ? (
        <Vazio titulo={VOZ.vazio.vida.titulo} texto={VOZ.vazio.vida.texto} />
      ) : (
        <>
          {/* ── O retrato ────────────────────────────────────────────────── */}
          <section>
            <Secao titulo="O retrato da semana" />
            <Card className="px-5 py-5">
              <p className="text-[15px] leading-relaxed text-ink">
                {leitura.retrato.frase}
              </p>

              {leitura.retrato.numeros.length > 0 && (
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
                  {leitura.retrato.numeros.map((n) => (
                    <div key={n.rotulo}>
                      <dt className="text-xs text-faint">{n.rotulo}</dt>
                      <dd className="tabular mt-0.5 text-lg font-semibold text-ink">
                        {n.valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          </section>

          {/* ── A semana em uma linha ────────────────────────────────────── */}
          {leitura.diasComCheckin >= 3 && (
            <section>
              <Secao titulo="Seus últimos 30 dias" />
              <Card className="px-5 py-5">
                <LinhaDaSemana serie={leitura.serie} />
              </Card>
            </section>
          )}

          {/* ── Conexões ─────────────────────────────────────────────────── */}
          <section>
            <Secao titulo="Padrões que apareceram" />
            {achados.length === 0 ? (
              <Card className="px-5 py-5">
                <p className="text-sm leading-relaxed text-muted">
                  Ainda não encontramos nenhum padrão com dados suficientes para
                  sustentar. O Mikasa prefere não dizer nada a dizer algo que os
                  seus registros não mostram.
                </p>
              </Card>
            ) : (
              <Achados achados={achados} />
            )}
          </section>

          {/* ── Equilíbrio ───────────────────────────────────────────────── */}
          {leitura.equilibrio.areas.length > 1 && (
            <section>
              <Secao titulo="Onde sua atenção esteve" />
              <Equilibrio equilibrio={leitura.equilibrio} />
            </section>
          )}

          {/* ── Honestidade ──────────────────────────────────────────────── */}
          {leitura.retrato.faltando.length > 0 && (
            <section>
              <Secao titulo="O que o Mikasa ainda não sabe" />
              <Card className="divide-y divide-line">
                {leitura.retrato.faltando.map((f) => (
                  <div key={f.rotulo} className="px-5 py-4">
                    <p className="text-sm font-medium text-ink">{f.rotulo}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{f.texto}</p>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </>
      )}

      <p className="pt-2 text-center text-xs leading-relaxed text-faint">
        O Mikasa mostra o que apareceu junto nos seus registros. Não é
        diagnóstico, não é conselho de saúde e não substitui um profissional.
      </p>
    </div>
  );
}
