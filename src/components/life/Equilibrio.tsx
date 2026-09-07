import Link from 'next/link';
import { Card } from '@/components/ui';
import type { Equilibrio as TipoEquilibrio } from '@/lib/life/balance';

/**
 * Onde a atenção da pessoa esteve.
 *
 * Barras horizontais simples, sem gráfico de pizza e sem porcentagem grande
 * no meio da tela. A leitura aqui não é "quanto por cento" — é "esta parte da
 * minha vida praticamente não apareceu no último mês".
 *
 * A unidade é DIAS em que a área existiu, e não quantidade de registros: uma
 * pessoa que lançou trinta despesas num dia não teve uma vida financeira mais
 * presente do que quem lançou uma por dia durante um mês.
 */
export function Equilibrio({ equilibrio }: { equilibrio: TipoEquilibrio }) {
  const maior = Math.max(...equilibrio.areas.map((a) => a.dias), 1);

  return (
    <Card className="px-5 py-5">
      <ul className="space-y-3.5">
        {equilibrio.areas.map((a) => {
          const largura = Math.round((a.dias / maior) * 100);
          const sumida = a.dias === 0;

          return (
            <li key={a.key}>
              <Link href={a.href} className="group block">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={
                      sumida
                        ? 'text-sm text-faint'
                        : 'text-sm text-ink group-hover:underline underline-offset-4'
                    }
                  >
                    {a.nome}
                  </span>
                  <span className="tabular shrink-0 text-xs text-faint">
                    {a.dias === 0
                      ? a.diasSemRegistro === null
                        ? 'sem registros'
                        : `há ${a.diasSemRegistro} dias`
                      : `${a.dias} ${a.dias === 1 ? 'dia' : 'dias'}`}
                  </span>
                </div>

                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line/60">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-700 ease-mk"
                    style={{ width: `${largura}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-faint">
        Dias, dentro dos últimos {equilibrio.janelaDias}, em que cada área
        apareceu de alguma forma nos seus registros.
      </p>
    </Card>
  );
}
