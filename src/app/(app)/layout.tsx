import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { BarraInferior, BarraLateral } from '@/components/shell/Navegacao';
import { AdicaoRapida } from '@/components/shell/AdicaoRapida';
import type { AreaModulo } from '@/lib/validation';

/**
 * O shell do aplicativo.
 *
 * Este layout é o que garante que nenhuma tela interna seja acessível sem
 * sessão válida: `exigirUsuarioPronto` roda no servidor, antes de qualquer
 * conteúdo ser renderizado, e consulta o banco de verdade.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const user = await exigirUsuarioPronto();
  const modulos = user.modules
    .filter((m) => m.enabled)
    .map((m) => m.key as AreaModulo);

  return (
    <div
      className="min-h-dvh bg-bg"
      data-motion={user.reducedMotion ? 'reduzido' : undefined}
    >
      <BarraLateral modulos={modulos} />

      {/* A coluna lateral ocupa 15rem; o conteúdo começa depois dela e
          continua centralizado dentro do espaço que sobra. */}
      <div className="lg:pl-60">
        <main
          id="conteudo"
          // O respiro embaixo no celular é intencional: a barra inferior e o
          // botão "+" não podem cobrir o último item da lista.
          className="mx-auto w-full max-w-2xl px-4 pb-36 pt-6 lg:px-8 lg:pb-16 lg:pt-10"
        >
          {children}
        </main>
      </div>

      <BarraInferior />
      <AdicaoRapida modulos={modulos} />
    </div>
  );
}
