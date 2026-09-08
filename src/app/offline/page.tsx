import { TentarNovamente } from '@/components/offline/TentarNovamente';

/**
 * A tela que aparece quando não há conexão.
 *
 * Ela é estática de propósito — nenhum dado do usuário, nenhuma consulta ao
 * banco. É a única página do app que o service worker guarda, e uma página
 * guardada no aparelho não pode conter nada de pessoal.
 *
 * O tom segue o resto do produto: não é uma tela de erro, é um aviso de que
 * o Mikasa está esperando. Nada que a pessoa registrou se perdeu.
 */
export const metadata = { title: 'Sem conexão' };

export default function Offline() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm text-center">
        {/*
          `<img>` puro, e não `next/image`, de propósito: o componente do Next
          serve por `/_next/image?url=...`, uma URL que o service worker não
          tem como pré-carregar. Este caminho aponta direto para o arquivo que
          está no cache do casco, então a marca aparece mesmo sem rede.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/mikasa.png"
          alt=""
          width={48}
          height={48}
          className="mx-auto rounded-full opacity-60"
        />

        <h1 className="mt-6 text-title font-semibold text-ink">
          Você está sem conexão.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          O Mikasa precisa de internet para carregar seu dia. Nada do que você
          registrou se perdeu — está tudo salvo, esperando você voltar.
        </p>

        <TentarNovamente />
      </div>
    </div>
  );
}
