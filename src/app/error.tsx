'use client';

import { useEffect } from 'react';

/**
 * A tela de erro.
 *
 * O usuário lê uma frase humana; o detalhe técnico vai para o console. Em
 * nenhum momento mostramos stack trace na tela — além de ser inútil para
 * quem está usando o app, é informação sobre a estrutura do servidor.
 */
export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[mikasa] erro na interface', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm text-center">
        <span aria-hidden className="mx-auto mb-6 block h-px w-8 bg-accent-soft" />

        <h1 className="text-title font-semibold text-ink">
          Não conseguimos carregar isso agora.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Pode ter sido a conexão. Tente de novo — seus dados estão salvos.
        </p>

        <div className="mt-7 flex flex-col gap-2">
          <button
            onClick={reset}
            className="h-11 rounded-md bg-ink px-4 text-sm font-medium text-bg transition-colors hover:bg-ink/90"
          >
            Tentar novamente
          </button>
          <a
            href="/inicio"
            className="h-11 rounded-md border border-line bg-surface px-4 text-sm leading-[2.75rem] text-ink transition-colors hover:bg-raised"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}
