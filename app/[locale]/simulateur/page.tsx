import { Metadata } from 'next';
import SimulatorClient from './SimulatorClient';
import getCurrentUser from '@/app/actions/getCurrentUser';

export const metadata: Metadata = {
  title: 'Simulateur de Rendement Locatif Gratuit — Coridor',
  description:
    "Calculez gratuitement la rentabilité de votre investissement locatif : rendement net, cash-flow, TRI, comparaison fiscale, tableau d'amortissement. Outil complet et sans inscription.",
  keywords: [
    'simulateur rendement locatif',
    'calcul rentabilité locative',
    'investissement locatif simulation',
    'rendement net immobilier',
  ],
};

export default async function SimulateurPage() {
  const currentUser = await getCurrentUser();
  return <SimulatorClient user={currentUser} />;
}
