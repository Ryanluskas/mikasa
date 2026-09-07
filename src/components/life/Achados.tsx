'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/http';
import type { Achado } from '@/lib/life/correlate';

/**
 * Os padrões encontrados.
 *
 * Cada card carrega a base do achado ("12 dias com sono e energia
 * registrados") em texto visível. Isso não é rodapé jurídico: é o que separa
 * uma observação de um palpite, e é o que permite ao usuário discordar.
 *
 * Todo achado pode ser dispensado. O que foi dispensado não volta.
 */
export function Achados({ achados }: { achados: Achado[] }) {
  const router = useRouter();
  const { avisar } = useToast();
  const [escondidos, setEscondidos] = useState<Set<string>>(new Set());

  async function dispensar(key: string) {
    setEscondidos((atual) => new Set(atual).add(key));
    try {
      await api(`/api/life/insights/${encodeURIComponent(key)}`, { metodo: 'DELETE' });
      router.refresh();
    } catch {
      setEscondidos((atual) => {
        const copia = new Set(atual);
        copia.delete(key);
        return copia;
      });
      avisar('Não conseguimos dispensar isso agora.', 'erro');
    }
  }

  const visiveis = achados.filter((a) => !escondidos.has(a.key));
  if (visiveis.length === 0) return null;

  return (
    <div className="space-y-3">
      {visiveis.map((a) => (
        <Card key={a.key} className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15px] font-medium leading-snug text-ink">{a.titulo}</h3>
            <button
              type="button"
              onClick={() => dispensar(a.key)}
              aria-label={`Dispensar: ${a.titulo}`}
              className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded text-faint transition-colors hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M3.5 3.5l7 7m0-7l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <p className="mt-1.5 text-sm leading-relaxed text-muted">{a.corpo}</p>

          <p className="mt-3 text-xs text-faint">Observado em {a.base}</p>
        </Card>
      ))}
    </div>
  );
}
