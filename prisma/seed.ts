import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Dados de exemplo para desenvolvimento.
 *
 * Gera cerca de seis semanas de rotina de uma pessoa plausível: alguém que
 * treina, estuda, gasta e às vezes some por uns dias. A intenção é que a
 * camada de vida tenha material real para encontrar padrões — inclusive os
 * padrões que ela deve encontrar (sono e energia caminham juntos; dias de
 * treino têm check-in mais alto).
 *
 * Rodar com: npm run db:seed
 * NUNCA rodar em produção: apaga a conta de exemplo e recria.
 */

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt) as (
  senha: string,
  salt: Buffer,
  keylen: number,
  opcoes: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const EMAIL = 'exemplo@mikasa.app';
const SENHA = 'exemplo-mikasa-2026';

const N = 2 ** 15;

async function hash(senha: string) {
  const salt = randomBytes(16);
  const derivado = await scryptAsync(senha, salt, 64, {
    N,
    r: 8,
    p: 1,
    maxmem: 128 * N * 8 * 2,
  });
  return `scrypt$${N}$8$1$${salt.toString('base64url')}$${derivado.toString('base64url')}`;
}

const dia = (atras: number, hora = 0, minuto = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - atras);
  d.setHours(hora, minuto, 0, 0);
  return d;
};

const meiaNoite = (atras: number) => dia(atras, 0, 0);

/** Sorteio determinístico: o seed gera sempre a mesma história. */
let semente = 42;
function aleatorio() {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
}
const entre = (min: number, max: number) => Math.floor(aleatorio() * (max - min + 1)) + min;

async function main() {
  console.log('Limpando a conta de exemplo...');
  await prisma.user.deleteMany({ where: { email: EMAIL } });

  console.log('Criando usuário...');
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash: await hash(SENHA),
      profile: {
        create: {
          displayName: 'Rafael',
          onboardingDone: true,
          routineTags: JSON.stringify(['Estudo', 'Academia', 'Lutas', 'Trabalho']),
          mainGoal: 'Guardar R$ 2.000 até dezembro',
          weekShape: 'cheia',
        },
      },
      modules: {
        create: [
          { key: 'goals', enabled: true, order: 0 },
          { key: 'finance', enabled: true, order: 1 },
          { key: 'workouts', enabled: true, order: 2 },
          { key: 'study', enabled: true, order: 3 },
          { key: 'work', enabled: true, order: 4 },
          { key: 'habits', enabled: true, order: 5 },
          { key: 'relationships', enabled: true, order: 6 },
        ],
      },
    },
  });

  const userId = user.id;

  // ── A rotina de 42 dias ────────────────────────────────────────────────────
  console.log('Gerando 6 semanas de rotina...');

  const checkins: { date: Date; mood: number; energy: number; sleepHours: number }[] = [];
  const treinos: { kind: string; startedAt: Date; durationMin: number; intensity: number }[] = [];
  const estudos: { minutes: number; startedAt: Date }[] = [];

  for (let atras = 41; atras >= 0; atras--) {
    const data = meiaNoite(atras);
    const diaSemana = data.getDay();

    // Uma pausa de 4 dias no meio, para a camada de vida ter o que observar.
    const sumiu = atras >= 20 && atras <= 23;
    if (sumiu) continue;

    // Treina segunda, quarta e sexta; luta terça e quinta.
    const treinaHoje = [1, 3, 5].includes(diaSemana);
    const lutaHoje = [2, 4].includes(diaSemana);

    if (treinaHoje) {
      treinos.push({
        kind: 'gym',
        startedAt: dia(atras, 18, 30),
        durationMin: entre(50, 75),
        intensity: entre(2, 3),
      });
    }
    if (lutaHoje && aleatorio() > 0.25) {
      treinos.push({
        kind: 'jiujitsu',
        startedAt: dia(atras, 20, 0),
        durationMin: 90,
        intensity: 3,
      });
    }

    const treinou = treinaHoje || lutaHoje;

    // Sono: quem treina dorme um pouco melhor nesta história.
    const sono = treinou ? 7 + aleatorio() * 1.5 : 5.5 + aleatorio() * 1.5;
    // Energia acompanha o sono — é o padrão que o Mikasa deve encontrar.
    const energia = sono >= 7.5 ? 3 : sono >= 6.5 ? 2 : 1;
    // Humor acompanha treino e energia, com ruído.
    const humorBase = (treinou ? 4 : 3) + (energia === 3 ? 0.5 : energia === 1 ? -1 : 0);
    const humor = Math.max(1, Math.min(5, Math.round(humorBase + (aleatorio() - 0.5))));

    checkins.push({
      date: data,
      mood: humor,
      energy: energia,
      sleepHours: Math.round(sono * 10) / 10,
    });

    if (diaSemana !== 0 && aleatorio() > 0.35) {
      estudos.push({ minutes: entre(30, 90), startedAt: dia(atras, 21, 30) });
    }
  }

  await prisma.checkin.createMany({ data: checkins.map((c) => ({ ...c, userId })) });
  await prisma.studySession.createMany({ data: estudos.map((e) => ({ ...e, userId })) });

  for (const t of treinos) {
    await prisma.workout.create({
      data: {
        userId,
        ...t,
        exercises:
          t.kind === 'gym'
            ? {
                create: [
                  {
                    userId,
                    name: 'Supino',
                    sets: 4,
                    reps: 8,
                    // Carga subindo devagar ao longo das semanas.
                    weightG: 20_000 + Math.floor((41 - (Date.now() - t.startedAt.getTime()) / 86_400_000) * 200),
                    order: 0,
                  },
                  { userId, name: 'Agachamento', sets: 4, reps: 10, weightG: 40_000, order: 1 },
                  { userId, name: 'Remada', sets: 3, reps: 12, weightG: 30_000, order: 2 },
                ],
              }
            : undefined,
      },
    });
  }

  // ── Financeiro ─────────────────────────────────────────────────────────────
  console.log('Gerando lançamentos...');

  const gastos: { type: string; amountCents: number; category: string; description: string; occurredAt: Date }[] =
    [];

  for (let atras = 41; atras >= 0; atras--) {
    if (aleatorio() > 0.55) {
      gastos.push({
        type: 'expense',
        amountCents: entre(1200, 4800),
        category: 'alimentacao',
        description: 'Almoço',
        occurredAt: dia(atras, 12, 30),
      });
    }
    if (aleatorio() > 0.8) {
      gastos.push({
        type: 'expense',
        amountCents: entre(2000, 15000),
        category: aleatorio() > 0.5 ? 'lazer' : 'compras',
        description: aleatorio() > 0.5 ? 'Saída' : 'Compra',
        occurredAt: dia(atras, 20, 0),
      });
    }
  }

  gastos.push(
    {
      type: 'income',
      amountCents: 320_000,
      category: 'salario',
      description: 'Salário',
      occurredAt: dia(35, 9, 0),
    },
    {
      type: 'income',
      amountCents: 320_000,
      category: 'salario',
      description: 'Salário',
      occurredAt: dia(5, 9, 0),
    },
    {
      type: 'expense',
      amountCents: 12_990,
      category: 'assinaturas',
      description: 'Streaming',
      occurredAt: dia(12, 8, 0),
    },
    {
      type: 'expense',
      amountCents: 9_900,
      category: 'academia',
      description: 'Mensalidade',
      occurredAt: dia(10, 8, 0),
    },
  );

  await prisma.transaction.createMany({ data: gastos.map((g) => ({ ...g, userId })) });

  await prisma.budget.createMany({
    data: [
      { userId, category: 'alimentacao', limitCents: 80_000 },
      { userId, category: 'lazer', limitCents: 30_000 },
    ],
  });

  // ── Metas ──────────────────────────────────────────────────────────────────
  console.log('Criando metas...');

  await prisma.goal.create({
    data: {
      userId,
      title: 'Guardar R$ 2.000',
      description: 'Reserva para emergências.',
      area: 'finance',
      targetCents: 200_000,
      currentCents: 124_000,
      deadline: dia(-90),
      steps: {
        create: [
          { userId, title: 'Abrir conta separada', done: true, order: 0 },
          { userId, title: 'Guardar os primeiros R$ 500', done: true, order: 1 },
          { userId, title: 'Guardar R$ 1.000', done: true, order: 2 },
          { userId, title: 'Chegar aos R$ 2.000', done: false, order: 3 },
        ],
      },
    },
  });

  await prisma.goal.create({
    data: {
      userId,
      title: 'Faixa azul no jiu-jitsu',
      area: 'fitness',
      targetValue: 150,
      currentValue: 88,
      unit: 'treinos',
      steps: {
        create: [
          { userId, title: 'Treinar 3x por semana', done: true, order: 0 },
          { userId, title: 'Competir uma vez', done: false, order: 1 },
        ],
      },
    },
  });

  // ── Hábitos ────────────────────────────────────────────────────────────────
  console.log('Criando hábitos...');

  const habitos = await Promise.all(
    ['Beber água', 'Ler 20 minutos', 'Dormir antes da meia-noite'].map((name) =>
      prisma.habit.create({ data: { userId, name } }),
    ),
  );

  for (const h of habitos) {
    const entradas: { userId: string; habitId: string; date: Date; done: boolean }[] = [];
    for (let atras = 34; atras >= 0; atras--) {
      if (atras >= 20 && atras <= 23) continue;
      if (aleatorio() > 0.3) {
        entradas.push({ userId, habitId: h.id, date: meiaNoite(atras), done: true });
      }
    }
    await prisma.habitEntry.createMany({ data: entradas });
  }

  // ── Estudos, trabalho e agenda ─────────────────────────────────────────────
  console.log('Criando matérias, projetos e eventos...');

  const materia = await prisma.subject.create({ data: { userId, name: 'Cálculo I' } });
  await prisma.subject.create({ data: { userId, name: 'Física' } });

  await prisma.exam.create({
    data: {
      userId,
      subjectId: materia.id,
      title: 'Prova bimestral',
      date: dia(-11, 8, 0),
      status: 'preparing',
    },
  });

  const projeto = await prisma.project.create({
    data: { userId, name: 'Site do cliente', deadline: dia(-20) },
  });

  await prisma.task.createMany({
    data: [
      { userId, title: 'Revisar proposta', area: 'work', projectId: projeto.id, dueAt: dia(0, 17, 0) },
      { userId, title: 'Responder e-mails', area: 'work', dueAt: dia(0, 10, 0) },
      { userId, title: 'Comprar material da academia', area: 'personal', dueAt: dia(-2, 12, 0) },
      { userId, title: 'Organizar o quarto', area: 'home' },
      {
        userId,
        title: 'Estudar limites',
        area: 'study',
        subjectId: materia.id,
        dueAt: dia(-1, 21, 0),
      },
    ],
  });

  // Algumas tarefas já concluídas nos últimos dias, para a Home ter história.
  for (let atras = 14; atras >= 1; atras--) {
    if (atras >= 20 && atras <= 23) continue;
    const quantas = entre(0, 3);
    for (let i = 0; i < quantas; i++) {
      await prisma.task.create({
        data: {
          userId,
          title: `Tarefa concluída ${atras}-${i}`,
          area: 'personal',
          done: true,
          doneAt: dia(atras, entre(9, 21), 0),
        },
      });
    }
  }

  await prisma.event.createMany({
    data: [
      {
        userId,
        title: 'Aula de Cálculo',
        category: 'school',
        startAt: dia(0, 8, 0),
        endAt: dia(0, 10, 0),
        repeat: 'weekly',
      },
      {
        userId,
        title: 'Trabalho',
        category: 'work',
        startAt: dia(0, 13, 0),
        endAt: dia(0, 18, 0),
        repeat: 'daily',
      },
      {
        userId,
        title: 'Jiu-jitsu',
        category: 'fight',
        startAt: dia(0, 20, 0),
        endAt: dia(0, 21, 30),
        repeat: 'weekly',
      },
    ],
  });

  await prisma.relationship.create({
    data: {
      userId,
      name: 'Marina',
      type: 'partner',
      birthday: new Date(2001, 4, 12),
      contactEveryDays: 2,
      lastContactAt: dia(1),
    },
  });

  console.log('');
  console.log('Pronto. Entre com:');
  console.log(`  e-mail: ${EMAIL}`);
  console.log(`  senha:  ${SENHA}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
