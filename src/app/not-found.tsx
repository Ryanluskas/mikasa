import Link from 'next/link';
import { Marca } from '@/components/brand/Logo';

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm text-center">
        <Marca tamanho={48} className="mx-auto opacity-60" />

        <h1 className="mt-6 text-title font-semibold text-ink">
          Essa página não existe.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Talvez o link esteja antigo, ou a coisa tenha sido apagada.
        </p>

        <Link
          href="/inicio"
          className="mt-7 inline-flex h-11 items-center justify-center rounded-md bg-ink px-6 text-sm font-medium text-bg transition-colors hover:bg-ink/90"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
