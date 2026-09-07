'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Secao } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Input, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/http';
import { toDateInput } from '@/lib/dates';
import { VOZ } from '@/lib/voice';

/**
 * Matérias e provas.
 *
 * A sessão de estudo em si é registrada pelo botão "+" global — aqui ficam as
 * coisas que duram: o que você estuda e quando é a prova.
 */

type Materia = { id: string; name: string };

export function PainelDeEstudos({ materias }: { materias: Materia[] }) {
  const router = useRouter();
  const { avisar } = useToast();

  const [lista, setLista] = useState(materias);
  const [aberto, setAberto] = useState<'materia' | 'prova' | null>(null);
  const [nome, setNome] = useState('');
  const [tituloProva, setTituloProva] = useState('');
  const [materiaProva, setMateriaProva] = useState(materias[0]?.id ?? '');
  const [dataProva, setDataProva] = useState(toDateInput(new Date()));
  const [salvando, setSalvando] = useState(false);

  async function criarMateria(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const nova = await api<Materia>('/api/subjects', {
        metodo: 'POST',
        corpo: { name: nome.trim() },
      });
      setLista((atual) => [...atual, nova].sort((a, b) => a.name.localeCompare(b.name)));
      if (!materiaProva) setMateriaProva(nova.id);
      setNome('');
      setAberto(null);
      router.refresh();
    } catch {
      avisar(VOZ.erro.generico, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function criarProva(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api('/api/exams', {
        metodo: 'POST',
        corpo: {
          subjectId: materiaProva,
          title: tituloProva.trim(),
          // `T12:00` evita que o fuso jogue a prova para o dia anterior.
          date: new Date(`${dataProva}T12:00:00`).toISOString(),
        },
      });
      setTituloProva('');
      setAberto(null);
      router.refresh();
    } catch {
      avisar(VOZ.erro.generico, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      {lista.length > 0 && (
        <section>
          <Secao titulo="Suas matérias" />
          <Card className="divide-y divide-line">
            {lista.map((m) => (
              <div key={m.id} className="px-4 py-3.5">
                <p className="text-sm text-ink">{m.name}</p>
              </div>
            ))}
          </Card>
        </section>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variante="secundario" onClick={() => setAberto('materia')} larguraTotal>
          Nova matéria
        </Button>
        {lista.length > 0 && (
          <Button variante="secundario" onClick={() => setAberto('prova')} larguraTotal>
            Nova prova
          </Button>
        )}
      </div>

      <Sheet
        aberto={aberto === 'materia'}
        aoFechar={() => setAberto(null)}
        titulo="Nova matéria"
      >
        <form onSubmit={criarMateria} className="space-y-4 pt-1">
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Matemática"
            autoFocus
            required
          />
          <Button type="submit" carregando={salvando} larguraTotal>
            Criar
          </Button>
        </form>
      </Sheet>

      <Sheet
        aberto={aberto === 'prova'}
        aoFechar={() => setAberto(null)}
        titulo="Nova prova"
      >
        <form onSubmit={criarProva} className="space-y-4 pt-1">
          <Input
            label="Título"
            value={tituloProva}
            onChange={(e) => setTituloProva(e.target.value)}
            placeholder="Prova bimestral"
            autoFocus
            required
          />
          <Select
            label="Matéria"
            value={materiaProva}
            onChange={(e) => setMateriaProva(e.target.value)}
            opcoes={lista.map((m) => ({ valor: m.id, rotulo: m.name }))}
          />
          <Input
            label="Data"
            type="date"
            value={dataProva}
            onChange={(e) => setDataProva(e.target.value)}
            required
          />
          <Button type="submit" carregando={salvando} larguraTotal>
            Criar
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
