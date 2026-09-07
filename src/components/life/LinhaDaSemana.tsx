import { cn } from '@/lib/cn';
import { VOZ } from '@/lib/voice';

/**
 * Os últimos 30 dias em uma faixa.
 *
 * Cada coluna é um dia: a altura vem do humor registrado, e um ponto embaixo
 * marca os dias de treino. É aqui que a conexão fica visível sem precisar de
 * texto — dá para ver a olho nu se os dias de treino coincidem com os dias
 * mais altos.
 *
 * Dias sem check-in ficam vazios, e não em zero. Um dia não registrado não é
 * um dia ruim, e o gráfico não pode sugerir que foi.
 */

type Ponto = {
  chave: string;
  diaSemana: number;
  humor: number | null;
  energia: number | null;
  treinou: boolean;
  registrou: boolean;
};

export function LinhaDaSemana({ serie }: { serie: Ponto[] }) {
  return (
    <div>
      <div className="flex items-end gap-[3px]" role="img" aria-label={resumoAcessivel(serie)}>
        {serie.map((d) => {
          const altura = d.humor ? 14 + (d.humor - 1) * 12 : 6;

          return (
            <div key={d.chave} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full rounded-sm transition-colors',
                  d.humor === null
                    ? 'bg-line/50'
                    : d.humor >= 4
                      ? 'bg-accent'
                      : d.humor === 3
                        ? 'bg-accent/65'
                        : 'bg-accent-soft',
                )}
                style={{ height: altura }}
                title={
                  d.humor
                    ? `${d.chave}: ${VOZ.humor[d.humor - 1]}${d.treinou ? ' · treinou' : ''}`
                    : `${d.chave}: sem registro`
                }
              />
              <span
                aria-hidden
                className={cn(
                  'h-1 w-1 rounded-full',
                  d.treinou ? 'bg-ink' : 'bg-transparent',
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-faint">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-accent" />
          check-in mais alto
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-accent-soft" />
          mais baixo
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" />
          dia de treino
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-line/50" />
          sem registro
        </span>
      </div>
    </div>
  );
}

/**
 * Descrição para quem não enxerga o gráfico.
 *
 * Um `role="img"` sem `aria-label` útil é o mesmo que uma imagem sem alt —
 * a informação simplesmente não existe para quem usa leitor de tela.
 */
function resumoAcessivel(serie: Ponto[]): string {
  const comCheckin = serie.filter((d) => d.humor !== null);
  const treinos = serie.filter((d) => d.treinou).length;

  if (comCheckin.length === 0) {
    return 'Ainda sem check-ins registrados neste período.';
  }

  const media =
    comCheckin.reduce((s, d) => s + (d.humor ?? 0), 0) / comCheckin.length;
  const rotulo = VOZ.humor[Math.min(4, Math.max(0, Math.round(media) - 1))];

  return `Últimos ${serie.length} dias: ${comCheckin.length} com check-in, em média perto de "${rotulo.toLowerCase()}", e ${treinos} ${
    treinos === 1 ? 'dia de treino' : 'dias de treino'
  }.`;
}
