'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Bottom sheet no celular, modal centrado no desktop.
 *
 * É o mesmo componente nas duas telas — o Mikasa não tem uma "versão mobile"
 * separada. O que muda é só onde ele encosta.
 *
 * Acessibilidade que não é opcional aqui:
 *  - Esc fecha;
 *  - o foco fica preso dentro enquanto está aberto;
 *  - ao fechar, o foco volta para quem abriu;
 *  - o fundo para de rolar.
 */

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  rodape?: ReactNode;
};

export function Sheet({ aberto, aoFechar, titulo, descricao, children, rodape }: Props) {
  const painel = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberto) return;

    focoAnterior.current = document.activeElement as HTMLElement | null;

    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // O primeiro campo do formulário recebe o foco; se não houver, o painel.
    const primeiro = painel.current?.querySelector<HTMLElement>(
      'input, textarea, select, button:not([data-fechar])',
    );
    (primeiro ?? painel.current)?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        aoFechar();
        return;
      }

      if (e.key !== 'Tab' || !painel.current) return;

      const focaveis = painel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focaveis.length) return;

      const primeiroFoco = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (e.shiftKey && document.activeElement === primeiroFoco) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiroFoco.focus();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAntes;
      focoAnterior.current?.focus?.();
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/25 animate-fade"
        onClick={aoFechar}
        aria-hidden
      />

      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-lg animate-sheet-in bg-surface',
          'max-h-[92vh] overflow-y-auto',
          'rounded-t-xl sm:rounded-xl',
          'border border-line shadow-lift',
          // Respeita a barra de gestos do iPhone.
          'pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0',
        )}
      >
        {/* Alcinha do bottom sheet — só faz sentido no celular. */}
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden>
          <span className="h-1 w-9 rounded-full bg-line" />
        </div>

        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4">
          <div className="min-w-0">
            <h2 className="text-title font-semibold text-ink">{titulo}</h2>
            {descricao && <p className="mt-1 text-sm text-muted">{descricao}</p>}
          </div>
          <button
            type="button"
            data-fechar
            onClick={aoFechar}
            aria-label="Fechar"
            className="toque -mr-2 -mt-1 flex items-center justify-center rounded text-muted transition-colors hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M4.5 4.5l9 9m0-9l-9 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5">{children}</div>

        {rodape && (
          <div className="sticky bottom-0 border-t border-line bg-surface px-5 py-4">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
