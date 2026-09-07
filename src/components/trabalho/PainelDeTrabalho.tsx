'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Input, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/http';
import { VOZ } from '@/lib/voice';

export function PainelDeTrabalho() {
  const router = useRouter();
  const { avisar } = useToast();

  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [notas, setNotas] = useState('');
  const [prazo, setPrazo] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api('/api/projects', {
        metodo: 'POST',
        corpo: {
          name: nome.trim(),
          notes: notas.trim() || undefined,
          deadline: prazo ? new Date(`${prazo}T12:00:00`).toISOString() : undefined,
        },
      });
      setNome('');
      setNotas('');
      setPrazo('');
      setAberto(false);
      router.refresh();
    } catch {
      avisar(VOZ.erro.generico, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Button variante="secundario" onClick={() => setAberto(true)} larguraTotal>
        Novo projeto
      </Button>

      <Sheet aberto={aberto} aoFechar={() => setAberto(false)} titulo="Novo projeto">
        <form onSubmit={criar} className="space-y-4 pt-1">
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            required
          />
          <Input
            label="Prazo"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            dica="Opcional"
          />
          <Textarea
            label="Observações"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Opcional"
          />
          <Button type="submit" carregando={salvando} larguraTotal>
            Criar
          </Button>
        </form>
      </Sheet>
    </>
  );
}
