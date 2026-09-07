import { z } from 'zod';
import { MAX_CENTS } from './money';

/**
 * Toda entrada que chega ao servidor passa por aqui.
 *
 * Os schemas são a fronteira: depois deles, o resto do código pode confiar
 * nos dados. Antes deles, nada é confiável — nem tipo, nem tamanho, nem sinal.
 */

// ── Blocos reutilizáveis ─────────────────────────────────────────────────────

/** Texto de usuário: sem espaços nas pontas, com teto de tamanho. */
const texto = (max: number, campo = 'Este campo') =>
  z
    .string()
    .trim()
    .min(1, `${campo} não pode ficar vazio.`)
    .max(max, `${campo} ficou longo demais.`);

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'Texto longo demais.')
    .optional()
    .transform((v) => (v === '' ? undefined : v));

/** Data vinda do cliente como string ISO. Rejeita "Invalid Date" e anos absurdos. */
const dataISO = z
  .union([z.string(), z.date()])
  .transform((v, ctx) => {
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data inválida.' });
      return z.NEVER;
    }
    const ano = d.getFullYear();
    if (ano < 1900 || ano > 2200) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data fora do intervalo.' });
      return z.NEVER;
    }
    return d;
  });

const dataOpcional = dataISO.optional().nullable();

/** Valor monetário: inteiro, em centavos, positivo e com teto. */
const centavos = z
  .number()
  .int('Use um valor válido.')
  .min(1, 'O valor precisa ser maior que zero.')
  .max(MAX_CENTS, 'Esse valor é grande demais.');

const centavosMeta = z
  .number()
  .int()
  .min(0)
  .max(MAX_CENTS);

const idCuid = z.string().trim().min(1).max(64);

// ── Listas fechadas ──────────────────────────────────────────────────────────

export const AREAS_MODULO = [
  'finance',
  'workouts',
  'study',
  'work',
  'goals',
  'habits',
  'relationships',
] as const;

export const CATEGORIAS_EVENTO = [
  'school',
  'work',
  'training',
  'fight',
  'personal',
  'finance',
  'goal',
] as const;

export const CATEGORIAS_FINANCEIRAS = [
  'alimentacao',
  'transporte',
  'casa',
  'lazer',
  'educacao',
  'academia',
  'assinaturas',
  'compras',
  'saude',
  'salario',
  'freelance',
  'outros',
] as const;

export const TIPOS_TREINO = [
  'gym',
  'jiujitsu',
  'muaythai',
  'boxing',
  'running',
  'football',
  'calisthenics',
  'other',
] as const;

export const AREAS_META = [
  'finance',
  'fitness',
  'study',
  'work',
  'personal',
  'relationship',
] as const;

export const AREAS_TAREFA = ['personal', 'work', 'study', 'home', 'finance'] as const;

export const TIPOS_RELACAO = ['partner', 'family', 'friend'] as const;

export const CATEGORIAS_LEMBRETE = [
  'general',
  'training',
  'study',
  'finance',
  'relationship',
  'selfcare',
] as const;

export const REPETICOES = ['none', 'daily', 'weekly', 'biweekly', 'monthly'] as const;

// ── Autenticação ─────────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Confira o e-mail.')
  .max(254);

/**
 * Senha: comprimento acima de complexidade.
 *
 * Exigir maiúscula + número + símbolo produz "Senha1!" — pior do que uma
 * frase longa. Pedimos 10 caracteres e bloqueamos as escolhas óbvias.
 */
export const senhaSchema = z
  .string()
  .min(10, 'Use pelo menos 10 caracteres.')
  .max(200, 'Senha longa demais.')
  .refine(
    (s) =>
      !['senha12345', '1234567890', 'password12', 'mikasa1234'].includes(
        s.toLowerCase(),
      ),
    'Essa senha é fácil de adivinhar. Tente outra.',
  );

export const registroSchema = z.object({
  name: texto(60, 'Seu nome'),
  email: emailSchema,
  password: senhaSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Digite sua senha.').max(200),
});

export const trocarSenhaSchema = z.object({
  atual: z.string().min(1).max(200),
  nova: senhaSchema,
});

// ── Perfil e onboarding ──────────────────────────────────────────────────────

export const perfilSchema = z.object({
  displayName: texto(60, 'Seu nome').optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  weekStart: z.union([z.literal(0), z.literal(1)]).optional(),
  streaksEnabled: z.boolean().optional(),
  remindersEnabled: z.boolean().optional(),
  lifeLayerEnabled: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  quietHoursStart: z.number().int().min(0).max(23).optional(),
  quietHoursEnd: z.number().int().min(0).max(23).optional(),
  mainGoal: textoOpcional(160),
});

export const onboardingSchema = z.object({
  displayName: texto(60, 'Seu nome'),
  routineTags: z.array(z.string().trim().max(40)).max(12).default([]),
  modules: z.array(z.enum(AREAS_MODULO)).max(AREAS_MODULO.length).default([]),
  mainGoal: textoOpcional(160),
  weekShape: z.enum(['leve', 'equilibrada', 'cheia']).optional(),
});

export const modulosSchema = z.object({
  modules: z
    .array(
      z.object({
        key: z.enum(AREAS_MODULO),
        enabled: z.boolean(),
        order: z.number().int().min(0).max(99),
      }),
    )
    .max(AREAS_MODULO.length),
});

// ── Tarefas ──────────────────────────────────────────────────────────────────

export const tarefaCriarSchema = z.object({
  title: texto(140, 'O título'),
  notes: textoOpcional(2000),
  dueAt: dataOpcional,
  priority: z.number().int().min(0).max(2).default(1),
  area: z.enum(AREAS_TAREFA).default('personal'),
  projectId: idCuid.optional().nullable(),
  subjectId: idCuid.optional().nullable(),
});

export const tarefaAtualizarSchema = tarefaCriarSchema.partial().extend({
  done: z.boolean().optional(),
});

// ── Eventos ──────────────────────────────────────────────────────────────────

export const eventoCriarSchema = z
  .object({
    title: texto(140, 'O título'),
    notes: textoOpcional(2000),
    location: textoOpcional(140),
    category: z.enum(CATEGORIAS_EVENTO).default('personal'),
    startAt: dataISO,
    endAt: dataISO,
    allDay: z.boolean().default(false),
    repeat: z.enum(REPETICOES).default('none'),
    repeatUntil: dataOpcional,
  })
  // As checagens cruzadas rodam MESMO quando um campo individual já falhou.
  // Se `startAt` não virou Date, ele não é um Date aqui — e chamar
  // `.getTime()` nele derrubaria a rota com 500 em vez de devolver 422.
  // Por isso cada refinamento confirma o tipo antes de comparar; o erro do
  // campo em si já foi registrado pelo schema de data.
  .refine(
    (v) =>
      !(v.startAt instanceof Date) ||
      !(v.endAt instanceof Date) ||
      v.endAt.getTime() >= v.startAt.getTime(),
    { message: 'O fim precisa vir depois do começo.', path: ['endAt'] },
  )
  .refine(
    (v) =>
      v.repeat === 'none' ||
      !(v.repeatUntil instanceof Date) ||
      !(v.startAt instanceof Date) ||
      v.repeatUntil.getTime() >= v.startAt.getTime(),
    { message: 'A repetição precisa terminar depois do começo.', path: ['repeatUntil'] },
  );

export const eventoAtualizarSchema = z.object({
  title: texto(140, 'O título').optional(),
  notes: textoOpcional(2000),
  location: textoOpcional(140),
  category: z.enum(CATEGORIAS_EVENTO).optional(),
  startAt: dataISO.optional(),
  endAt: dataISO.optional(),
  allDay: z.boolean().optional(),
  repeat: z.enum(REPETICOES).optional(),
  repeatUntil: dataOpcional,
});

// ── Hábitos ──────────────────────────────────────────────────────────────────

export const habitoCriarSchema = z.object({
  name: texto(60, 'O hábito'),
  targetPerWeek: z.number().int().min(1).max(7).default(7),
});

export const habitoAtualizarSchema = habitoCriarSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const habitoMarcarSchema = z.object({
  date: dataISO,
  done: z.boolean().default(true),
});

// ── Metas ────────────────────────────────────────────────────────────────────

export const metaCriarSchema = z
  .object({
    title: texto(140, 'O título'),
    description: textoOpcional(2000),
    area: z.enum(AREAS_META).default('personal'),
    targetCents: centavosMeta.optional().nullable(),
    currentCents: centavosMeta.optional().nullable(),
    targetValue: z.number().min(0).max(1_000_000_000).optional().nullable(),
    currentValue: z.number().min(0).max(1_000_000_000).optional().nullable(),
    unit: textoOpcional(20),
    deadline: dataOpcional,
    steps: z.array(texto(140)).max(20).optional(),
  })
  .refine(
    (v) => v.area !== 'finance' || (v.targetCents ?? 0) > 0,
    { message: 'Defina quanto você quer juntar.', path: ['targetCents'] },
  );

export const metaAtualizarSchema = z.object({
  title: texto(140, 'O título').optional(),
  description: textoOpcional(2000),
  area: z.enum(AREAS_META).optional(),
  targetCents: centavosMeta.optional().nullable(),
  currentCents: centavosMeta.optional().nullable(),
  targetValue: z.number().min(0).max(1_000_000_000).optional().nullable(),
  currentValue: z.number().min(0).max(1_000_000_000).optional().nullable(),
  unit: textoOpcional(20),
  deadline: dataOpcional,
  status: z.enum(['active', 'done', 'paused']).optional(),
});

export const etapaCriarSchema = z.object({
  goalId: idCuid,
  title: texto(140, 'A etapa'),
});

export const etapaAtualizarSchema = z.object({
  title: texto(140, 'A etapa').optional(),
  done: z.boolean().optional(),
});

// ── Financeiro ───────────────────────────────────────────────────────────────

export const transacaoCriarSchema = z.object({
  type: z.enum(['income', 'expense']),
  amountCents: centavos,
  category: z.enum(CATEGORIAS_FINANCEIRAS),
  description: textoOpcional(140),
  occurredAt: dataISO,
  recurring: z.boolean().default(false),
});

export const transacaoAtualizarSchema = transacaoCriarSchema.partial();

export const orcamentoSchema = z.object({
  category: z.enum(CATEGORIAS_FINANCEIRAS),
  limitCents: z.number().int().min(0).max(MAX_CENTS),
});

// ── Treinos ──────────────────────────────────────────────────────────────────

export const exercicioSchema = z.object({
  name: texto(80, 'O exercício'),
  sets: z.number().int().min(1).max(50).default(3),
  reps: z.number().int().min(1).max(1000).default(10),
  /** Carga em gramas — inteiro para não perder precisão. */
  weightG: z.number().int().min(0).max(1_000_000).default(0),
  restSec: z.number().int().min(0).max(3600).default(60),
});

export const treinoCriarSchema = z.object({
  kind: z.enum(TIPOS_TREINO),
  title: textoOpcional(80),
  startedAt: dataISO,
  durationMin: z.number().int().min(1).max(600).default(60),
  intensity: z.number().int().min(1).max(3).default(2),
  notes: textoOpcional(2000),
  exercises: z.array(exercicioSchema).max(40).default([]),
});

export const treinoAtualizarSchema = z.object({
  kind: z.enum(TIPOS_TREINO).optional(),
  title: textoOpcional(80),
  startedAt: dataISO.optional(),
  durationMin: z.number().int().min(1).max(600).optional(),
  intensity: z.number().int().min(1).max(3).optional(),
  notes: textoOpcional(2000),
  exercises: z.array(exercicioSchema).max(40).optional(),
});

// ── Estudos ──────────────────────────────────────────────────────────────────

export const materiaSchema = z.object({ name: texto(60, 'A matéria') });

export const provaCriarSchema = z.object({
  subjectId: idCuid,
  title: texto(140, 'O título'),
  date: dataISO,
  status: z.enum(['preparing', 'ready', 'done']).default('preparing'),
});

export const provaAtualizarSchema = provaCriarSchema.partial().omit({ subjectId: true });

export const sessaoEstudoSchema = z.object({
  subjectId: idCuid.optional().nullable(),
  minutes: z.number().int().min(1).max(1440),
  startedAt: dataISO,
  notes: textoOpcional(500),
});

// ── Trabalho ─────────────────────────────────────────────────────────────────

export const projetoCriarSchema = z.object({
  name: texto(80, 'O projeto'),
  notes: textoOpcional(2000),
  deadline: dataOpcional,
});

export const projetoAtualizarSchema = projetoCriarSchema.partial().extend({
  status: z.enum(['active', 'done', 'paused']).optional(),
});

// ── Lembretes ────────────────────────────────────────────────────────────────

export const lembreteCriarSchema = z.object({
  title: texto(120, 'O lembrete'),
  message: textoOpcional(240),
  category: z.enum(CATEGORIAS_LEMBRETE).default('general'),
  timeMin: z.number().int().min(0).max(1439).default(540),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([0, 1, 2, 3, 4, 5, 6]),
  enabled: z.boolean().default(true),
});

export const lembreteAtualizarSchema = lembreteCriarSchema.partial();

// ── Relacionamentos ──────────────────────────────────────────────────────────

export const relacaoCriarSchema = z.object({
  name: texto(60, 'O nome'),
  type: z.enum(TIPOS_RELACAO).default('partner'),
  birthday: dataOpcional,
  anniversary: dataOpcional,
  notes: textoOpcional(1000),
  contactEveryDays: z.number().int().min(1).max(365).optional().nullable(),
});

export const relacaoAtualizarSchema = relacaoCriarSchema.partial().extend({
  lastContactAt: dataOpcional,
});

// ── Check-in ─────────────────────────────────────────────────────────────────

export const checkinSchema = z.object({
  date: dataISO,
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(3),
  sleepHours: z.number().min(0).max(24).optional().nullable(),
  note: textoOpcional(500),
});

// ── Conta ────────────────────────────────────────────────────────────────────

export const excluirContaSchema = z.object({
  password: z.string().min(1, 'Confirme sua senha.').max(200),
  confirmacao: z.literal('EXCLUIR', {
    errorMap: () => ({ message: 'Escreva EXCLUIR para confirmar.' }),
  }),
});

export type Onboarding = z.infer<typeof onboardingSchema>;
export type CategoriaFinanceira = (typeof CATEGORIAS_FINANCEIRAS)[number];
export type TipoTreino = (typeof TIPOS_TREINO)[number];
export type AreaModulo = (typeof AREAS_MODULO)[number];
