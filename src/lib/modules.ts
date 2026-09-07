import type { AreaModulo } from './validation';

/**
 * As áreas da vida que o Mikasa sabe organizar.
 *
 * Nada aqui é obrigatório. O usuário liga o que faz sentido para ele, e a
 * Home, a navegação e a camada de vida leem desta lista — em nenhum lugar do
 * app existe uma tela que pressuponha que todo mundo usa tudo.
 */

export type DefinicaoModulo = {
  key: AreaModulo;
  nome: string;
  href: string;
  /** Frase curta usada no onboarding e nas configurações. */
  descricao: string;
  /** Como o Mikasa se refere a esta área nas observações. */
  emUmaPalavra: string;
};

export const MODULOS: DefinicaoModulo[] = [
  {
    key: 'goals',
    nome: 'Metas',
    href: '/metas',
    descricao: 'O que você quer alcançar',
    emUmaPalavra: 'suas metas',
  },
  {
    key: 'finance',
    nome: 'Financeiro',
    href: '/financeiro',
    descricao: 'Entradas, gastos e reservas',
    emUmaPalavra: 'seu dinheiro',
  },
  {
    key: 'workouts',
    nome: 'Treinos',
    href: '/treinos',
    descricao: 'Academia, lutas e esportes',
    emUmaPalavra: 'seus treinos',
  },
  {
    key: 'study',
    nome: 'Estudos',
    href: '/estudos',
    descricao: 'Matérias, provas e sessões',
    emUmaPalavra: 'seus estudos',
  },
  {
    key: 'work',
    nome: 'Trabalho',
    href: '/trabalho',
    descricao: 'Projetos, prazos e entregas',
    emUmaPalavra: 'seu trabalho',
  },
  {
    key: 'habits',
    nome: 'Hábitos',
    href: '/habitos',
    descricao: 'As pequenas coisas do dia',
    emUmaPalavra: 'seus hábitos',
  },
  {
    key: 'relationships',
    nome: 'Pessoas',
    href: '/pessoas',
    descricao: 'Quem importa para você',
    emUmaPalavra: 'suas pessoas',
  },
];

export const MODULO_POR_CHAVE = new Map(MODULOS.map((m) => [m.key, m]));

export function modulosAtivos(
  prefs: { key: string; enabled: boolean; order: number }[],
): DefinicaoModulo[] {
  const ativos = new Map(prefs.filter((p) => p.enabled).map((p) => [p.key, p.order]));
  return MODULOS.filter((m) => ativos.has(m.key)).sort(
    (a, b) => (ativos.get(a.key) ?? 0) - (ativos.get(b.key) ?? 0),
  );
}

/** Sugestão de áreas a partir das respostas do onboarding. */
export function modulosSugeridos(tags: string[]): AreaModulo[] {
  const t = new Set(tags.map((x) => x.toLowerCase()));
  const sugestoes = new Set<AreaModulo>(['goals']);

  if (t.has('estudo') || t.has('escola') || t.has('faculdade')) sugestoes.add('study');
  if (t.has('trabalho') || t.has('negócios') || t.has('projetos')) sugestoes.add('work');
  if (t.has('academia') || t.has('lutas') || t.has('esportes')) sugestoes.add('workouts');
  if (t.has('relacionamento') || t.has('família')) sugestoes.add('relationships');
  if (t.has('negócios') || t.has('trabalho')) sugestoes.add('finance');

  // Dinheiro e hábitos servem a praticamente qualquer rotina.
  sugestoes.add('finance');
  sugestoes.add('habits');

  return [...sugestoes];
}

export const OPCOES_ROTINA = [
  'Estudo',
  'Trabalho',
  'Academia',
  'Lutas',
  'Esportes',
  'Projetos',
  'Negócios',
  'Relacionamento',
  'Família',
] as const;

// ── Rótulos compartilhados ───────────────────────────────────────────────────

export const ROTULO_CATEGORIA_EVENTO: Record<string, string> = {
  school: 'Escola',
  work: 'Trabalho',
  training: 'Treino',
  fight: 'Luta',
  personal: 'Pessoal',
  finance: 'Financeiro',
  goal: 'Meta',
};

export const ROTULO_CATEGORIA_FINANCEIRA: Record<string, string> = {
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  casa: 'Casa',
  lazer: 'Lazer',
  educacao: 'Educação',
  academia: 'Academia',
  assinaturas: 'Assinaturas',
  compras: 'Compras',
  saude: 'Saúde',
  salario: 'Salário',
  freelance: 'Freelance',
  outros: 'Outros',
};

export const ROTULO_TREINO: Record<string, string> = {
  gym: 'Academia',
  jiujitsu: 'Jiu-jitsu',
  muaythai: 'Muay Thai',
  boxing: 'Boxe',
  running: 'Corrida',
  football: 'Futebol',
  calisthenics: 'Calistenia',
  other: 'Outro',
};

export const ROTULO_AREA_META: Record<string, string> = {
  finance: 'Financeira',
  fitness: 'Corpo',
  study: 'Estudos',
  work: 'Trabalho',
  personal: 'Pessoal',
  relationship: 'Relacionamento',
};

export const ROTULO_AREA_TAREFA: Record<string, string> = {
  personal: 'Pessoal',
  work: 'Trabalho',
  study: 'Estudos',
  home: 'Casa',
  finance: 'Financeiro',
};

export const ROTULO_RELACAO: Record<string, string> = {
  partner: 'Relacionamento',
  family: 'Família',
  friend: 'Amizade',
};
