'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Secao } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Input, Segmentado, Select, Switch } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { api, ErroApi } from '@/lib/http';
import { MODULOS } from '@/lib/modules';
import { minutosParaHora } from '@/lib/dates';
import { VOZ } from '@/lib/voice';

/**
 * Perfil, ajustes e privacidade.
 *
 * Tudo que é sobre "o Mikasa e você" está numa tela só, incluindo as partes
 * desconfortáveis: o que está guardado, como levar embora e como apagar.
 * Esconder a exclusão de conta em três níveis de menu seria uma escolha de
 * produto — e não é a que fazemos aqui.
 */

type Perfil = {
  displayName: string;
  theme: string;
  streaksEnabled: boolean;
  remindersEnabled: boolean;
  lifeLayerEnabled: boolean;
  reducedMotion: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
};

type Props = {
  email: string;
  perfil: Perfil;
  modulos: { key: string; enabled: boolean; order: number }[];
  dados: {
    tarefas: number;
    eventos: number;
    transacoes: number;
    treinos: number;
    checkins: number;
    metas: number;
  };
};

export function PainelDePerfil({ email, perfil, modulos, dados }: Props) {
  const router = useRouter();
  const { avisar } = useToast();

  const [estado, setEstado] = useState(perfil);
  const [areas, setAreas] = useState(modulos);
  const [excluirAberto, setExcluirAberto] = useState(false);
  const [senhaAberta, setSenhaAberta] = useState(false);

  async function salvarPerfil(mudanca: Partial<Perfil>) {
    const antes = estado;
    setEstado((a) => ({ ...a, ...mudanca }));

    // O tema é aplicado na hora e guardado localmente também: é assim que o
    // script no <head> evita o flash branco no próximo carregamento.
    if (mudanca.theme) {
      try {
        localStorage.setItem('mikasa-tema', mudanca.theme);
      } catch {
        // Navegador com armazenamento bloqueado: o tema ainda funciona nesta
        // sessão, só não é lembrado.
      }
      const escuro =
        mudanca.theme === 'dark' ||
        (mudanca.theme === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = escuro ? 'dark' : 'light';
    }

    try {
      await api('/api/profile', { metodo: 'PATCH', corpo: mudanca });
      router.refresh();
    } catch {
      setEstado(antes);
      avisar(VOZ.erro.generico, 'erro');
    }
  }

  async function alternarArea(key: string, enabled: boolean) {
    const antes = areas;
    const novos = areas.map((m) => (m.key === key ? { ...m, enabled } : m));
    setAreas(novos);

    try {
      await api('/api/profile/modules', {
        metodo: 'PUT',
        corpo: { modules: novos.map((m) => ({ key: m.key, enabled: m.enabled, order: m.order })) },
      });
      router.refresh();
    } catch {
      setAreas(antes);
      avisar(VOZ.erro.generico, 'erro');
    }
  }

  async function sair() {
    try {
      await api('/api/auth/logout', { metodo: 'POST' });
      router.push('/entrar');
      router.refresh();
    } catch {
      avisar(VOZ.erro.generico, 'erro');
    }
  }

  const totalRegistros =
    dados.tarefas + dados.eventos + dados.transacoes + dados.treinos + dados.checkins + dados.metas;

  return (
    <div className="space-y-9">
      <header>
        <h1 className="text-display font-semibold text-ink">{estado.displayName}</h1>
        <p className="mt-1.5 text-sm text-muted">{email}</p>
      </header>

      {/* ── Aparência ────────────────────────────────────────────────────── */}
      <section>
        <Secao titulo="Aparência" />
        <Card className="px-4 py-4">
          <Segmentado
            label="Tema"
            valor={estado.theme as 'system' | 'light' | 'dark'}
            onChange={(v) => salvarPerfil({ theme: v })}
            opcoes={[
              { valor: 'system', rotulo: 'Sistema' },
              { valor: 'light', rotulo: 'Claro' },
              { valor: 'dark', rotulo: 'Escuro' },
            ]}
          />
          <div className="mt-1 divide-y divide-line">
            <Switch
              label="Reduzir animações"
              descricao="Deixa as transições quase instantâneas."
              ativo={estado.reducedMotion}
              onChange={(v) => salvarPerfil({ reducedMotion: v })}
            />
          </div>
        </Card>
      </section>

      {/* ── Áreas ────────────────────────────────────────────────────────── */}
      <section>
        <Secao titulo="Suas áreas" />
        <Card className="divide-y divide-line px-4">
          {MODULOS.map((m) => {
            const atual = areas.find((a) => a.key === m.key);
            return (
              <Switch
                key={m.key}
                label={m.nome}
                descricao={m.descricao}
                ativo={atual?.enabled ?? false}
                onChange={(v) => alternarArea(m.key, v)}
              />
            );
          })}
        </Card>
      </section>

      {/* ── Como o Mikasa fala com você ──────────────────────────────────── */}
      <section>
        <Secao titulo="Como o Mikasa fala com você" />
        <Card className="divide-y divide-line px-4">
          <Switch
            label="Observações sobre sua vida"
            descricao="Os padrões que o Mikasa encontra entre suas áreas. Desligar esconde a aba Vida."
            ativo={estado.lifeLayerEnabled}
            onChange={(v) => salvarPerfil({ lifeLayerEnabled: v })}
          />
          <Switch
            label="Sequências"
            descricao="Mostrar quantos dias seguidos você manteve um hábito."
            ativo={estado.streaksEnabled}
            onChange={(v) => salvarPerfil({ streaksEnabled: v })}
          />
          <Switch
            label="Lembretes"
            descricao="Avisos que você mesmo configurou."
            ativo={estado.remindersEnabled}
            onChange={(v) => salvarPerfil({ remindersEnabled: v })}
          />
        </Card>

        {estado.remindersEnabled && (
          <Card className="mt-3 px-4 py-4">
            <p className="text-sm font-medium text-ink">Silêncio</p>
            <p className="mt-0.5 text-xs text-muted">
              Nenhum lembrete comum entre {minutosParaHora(estado.quietHoursStart * 60)} e{' '}
              {minutosParaHora(estado.quietHoursEnd * 60)}.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Select
                label="Começa"
                value={String(estado.quietHoursStart)}
                onChange={(e) => salvarPerfil({ quietHoursStart: Number(e.target.value) })}
                opcoes={Array.from({ length: 24 }, (_, h) => ({
                  valor: String(h),
                  rotulo: minutosParaHora(h * 60),
                }))}
              />
              <Select
                label="Termina"
                value={String(estado.quietHoursEnd)}
                onChange={(e) => salvarPerfil({ quietHoursEnd: Number(e.target.value) })}
                opcoes={Array.from({ length: 24 }, (_, h) => ({
                  valor: String(h),
                  rotulo: minutosParaHora(h * 60),
                }))}
              />
            </div>
          </Card>
        )}
      </section>

      {/* ── Privacidade ──────────────────────────────────────────────────── */}
      <section>
        <Secao titulo="Seus dados" />
        <Card className="px-4 py-4">
          <p className="text-sm leading-relaxed text-muted">
            O Mikasa guarda {totalRegistros}{' '}
            {totalRegistros === 1 ? 'registro' : 'registros'} seus: {dados.tarefas} tarefas,{' '}
            {dados.eventos} eventos, {dados.transacoes} lançamentos, {dados.treinos} treinos,{' '}
            {dados.checkins} check-ins e {dados.metas} metas. Nada disso é compartilhado com
            outras pessoas ou usado fora da sua conta.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href="/api/account/export"
              download
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-raised"
            >
              Exportar tudo
            </a>
            <Button variante="secundario" onClick={() => setSenhaAberta(true)} larguraTotal>
              Trocar senha
            </Button>
          </div>
        </Card>
      </section>

      {/* ── Conta ────────────────────────────────────────────────────────── */}
      <section>
        <Secao titulo="Conta" />
        <div className="space-y-2">
          <Button variante="secundario" onClick={sair} larguraTotal>
            Sair
          </Button>
          <button
            type="button"
            onClick={() => setExcluirAberto(true)}
            className="w-full rounded-md px-4 py-3 text-sm text-danger transition-colors hover:bg-danger/5"
          >
            Excluir minha conta
          </button>
        </div>
      </section>

      <TrocarSenha aberto={senhaAberta} aoFechar={() => setSenhaAberta(false)} />
      <ExcluirConta aberto={excluirAberto} aoFechar={() => setExcluirAberto(false)} />
    </div>
  );
}

function TrocarSenha({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { avisar } = useToast();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCampos({});
    setSalvando(true);
    try {
      const r = await api<{ mensagem: string }>('/api/profile/password', {
        metodo: 'POST',
        corpo: { atual, nova },
      });
      avisar(r.mensagem);
      setAtual('');
      setNova('');
      aoFechar();
    } catch (erro) {
      if (erro instanceof ErroApi) {
        setCampos(erro.fields ?? {});
        if (!erro.fields) avisar(erro.message, 'erro');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Trocar senha"
      descricao="As outras sessões abertas serão encerradas."
    >
      <form onSubmit={enviar} className="space-y-4 pt-1">
        <Input
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          erro={campos.atual}
          required
        />
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          erro={campos.nova}
          dica="Pelo menos 10 caracteres."
          required
        />
        <Button type="submit" carregando={salvando} larguraTotal>
          Trocar senha
        </Button>
      </form>
    </Sheet>
  );
}

function ExcluirConta({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const router = useRouter();
  const { avisar } = useToast();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCampos({});
    setExcluindo(true);
    try {
      await api('/api/account', {
        metodo: 'DELETE',
        corpo: { password: senha, confirmacao },
      });
      router.push('/');
      router.refresh();
    } catch (erro) {
      if (erro instanceof ErroApi) {
        setCampos(erro.fields ?? {});
        if (!erro.fields) avisar(erro.message, 'erro');
      }
      setExcluindo(false);
    }
  }

  return (
    <Sheet aberto={aberto} aoFechar={aoFechar} titulo="Excluir conta">
      <form onSubmit={enviar} className="space-y-4 pt-1">
        <p className="rounded-md bg-danger/10 px-3 py-3 text-sm leading-relaxed text-danger">
          Isso apaga tudo: tarefas, metas, lançamentos, treinos, check-ins e o histórico
          inteiro. A ação é permanente e não dá para desfazer.
        </p>

        <p className="text-sm text-muted">
          Se quiser guardar uma cópia antes, feche isto e use{' '}
          <span className="text-ink">Exportar tudo</span>.
        </p>

        <Input
          label="Sua senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={campos.password}
          required
        />

        <Input
          label="Escreva EXCLUIR para confirmar"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          erro={campos.confirmacao}
          required
        />

        <Button
          type="submit"
          variante="perigo"
          carregando={excluindo}
          disabled={confirmacao !== 'EXCLUIR'}
          larguraTotal
        >
          Excluir permanentemente
        </Button>
      </form>
    </Sheet>
  );
}
