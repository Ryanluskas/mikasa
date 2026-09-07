import { redirect } from 'next/navigation';
import { exigirUsuario } from '@/lib/auth/guard';
import { Onboarding } from '@/components/onboarding/Onboarding';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Começar' };

export default async function Comecar() {
  const user = await exigirUsuario();

  // Quem já respondeu não precisa responder de novo.
  if (user.onboardingDone) redirect('/inicio');

  return <Onboarding nomeInicial={user.displayName} />;
}
