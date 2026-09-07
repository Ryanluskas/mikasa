import { z } from 'zod';

/**
 * Validação das variáveis de ambiente.
 *
 * A aplicação falha no boot se algo essencial estiver faltando — é melhor
 * quebrar no deploy do que descobrir em produção que o AUTH_SECRET era
 * `undefined` e todas as sessões estavam assinadas com string vazia.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET precisa de pelo menos 32 caracteres'),
  SESSION_DAYS: z.coerce.number().int().positive().max(365).default(30),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Configuração de ambiente inválida.\n${detalhes}\n\n` +
        'Copie .env.example para .env e preencha os valores.',
    );
  }
  return parsed.data;
}

let cache: z.infer<typeof schema> | null = null;

export function env() {
  if (!cache) cache = load();
  return cache;
}

export const isProd = () => env().NODE_ENV === 'production';
