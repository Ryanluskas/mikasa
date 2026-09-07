'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Tag, Vazio } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Input, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/http';
import { diffDays, formatDataCurta } from '@/lib/dates';
import { ROTULO_RELACAO } from '@/lib/modules';
import { TIPOS_RELACAO } from '@/lib/validation';
import { VOZ } from '@/lib/voice';

type Pessoa = {
  id: string;
  name: string;
  type: string;
  birthday: string | null;
  anniversary: string | null;
  contactEveryDays: number | null;
  lastContactAt: string | null;
};

/** Dias até a próxima ocorrência anual de uma data. */
function diasAteAniversario(iso: string): number {
  const data = new Date(iso);
  const hoje = new Date();
  const esteAno = new Date(hoje.getFullYear(), data.getMonth(), data.getDate());
  const alvo =
    esteAno.getTime() >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()
      ? esteAno
      : new Date(hoje.getFullYear() + 1, data.getMonth(), data.getDate());
  return diffDays(alvo, hoje);
}

export function PainelDePessoas({ pessoas }: { pessoas: Pessoa[] }) {
  const router = useRouter();
  const { avisar } = useToast();

  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('partner');
  const [nascimento, setNascimento] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api('/api/relationships', {
        metodo: 'POST',
        corpo: {
          name: nome.trim(),
          type: tipo,
          birthday: nascimento ? new Date(`${nascimento}T12:00:00`).toISOString() : undefined,
        },
      });
      setNome('');
      setNascimento('');
      setAberto(false);
      router.refresh();
    } catch {
      avisar(VOZ.erro.generico, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function registrarContato(p: Pessoa) {
    try {
      await api(`/api/relationships/${p.id}`, {
        metodo: 'PATCH',
        corpo: { lastContactAt: new Date().toISOString() },
      });
      avisar('Anotado.');
      router.refresh();
    } catch {
      avisar(VOZ.erro.generico, 'erro');
    }
  }

  return (
    <div className="space-y-6">
      {pessoas.length === 0 ? (
        <Vazio
          titulo={VOZ.vazio.pessoas.titulo}
          texto={VOZ.vazio.pessoas.texto}
          acao={<Button onClick={() => setAberto(true)}>Adicionar alguém</Button>}
        />
      ) : (
        <>
          <div className="space-y-3">
            {pessoas.map((p) => {
              const diasAniversario = p.birthday ? diasAteAniversario(p.birthday) : null;
              const semContato = p.lastContactAt
                ? diffDays(new Date(), new Date(p.lastContactAt))
                : null;
              const passouDaHora =
                p.contactEveryDays !== null &&
                semContato !== null &&
                semContato > p.contactEveryDays;

              return (
                <Card key={p.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-ink">{p.name}</p>
                      <p className="mt-0.5 text-xs text-faint">
                        {ROTULO_RELACAO[p.type] ?? p.type}
                        {p.birthday && ` · nasceu em ${formatDataCurta(p.birthday)}`}
                      </p>
                    </div>
                    {diasAniversario !== null && diasAniversario <= 14 && (
                      <Tag tom="atencao">
                        {diasAniversario === 0
                          ? 'aniversário hoje'
                          : `aniversário em ${diasAniversario} dias`}
                      </Tag>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="text-xs text-faint">
                      {semContato === null
                        ? 'Sem contato registrado'
                        : semContato === 0
                          ? 'Vocês se falaram hoje'
                          : `Faz ${semContato} ${semContato === 1 ? 'dia' : 'dias'}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => registrarContato(p)}
                      className="text-xs font-medium text-ink underline-offset-4 hover:underline"
                    >
                      Falei hoje
                    </button>
                  </div>

                  {passouDaHora && (
                    <p className="mt-2.5 text-xs leading-relaxed text-muted">
                      Que tal mandar uma mensagem? Faz mais tempo do que você combinou
                      com você mesmo.
                    </p>
                  )}
                </Card>
              );
            })}
          </div>

          <Button variante="secundario" onClick={() => setAberto(true)} larguraTotal>
            Adicionar alguém
          </Button>
        </>
      )}

      <Sheet aberto={aberto} aoFechar={() => setAberto(false)} titulo="Adicionar alguém">
        <form onSubmit={criar} className="space-y-4 pt-1">
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            required
          />
          <Select
            label="Quem é"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            opcoes={TIPOS_RELACAO.map((t) => ({ valor: t, rotulo: ROTULO_RELACAO[t] }))}
          />
          <Input
            label="Aniversário"
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            dica="Opcional"
          />
          <Button type="submit" carregando={salvando} larguraTotal>
            Salvar
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
