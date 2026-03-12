'use client';

import { useMemo, useState } from 'react';
import Dashboard from '@/app/components/Dashboard';
import LandingPage from '@/app/components/LandingPage';

export default function AppShell() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const links = useMemo(
    () => ({
      website: process.env.NEXT_PUBLIC_MUSHEE_WEBSITE || 'https://mushee.xyz/',
      twitter: process.env.NEXT_PUBLIC_MUSHEE_TWITTER || 'https://x.com/mushee_io',
      promptCost: process.env.NEXT_PUBLIC_PROMPT_COST_XLM || '0.01'
    }),
    []
  );

  if (view === 'dashboard') {
    return <Dashboard onBack={() => setView('landing')} links={links} />;
  }

  return <LandingPage onOpen={() => setView('dashboard')} links={links} />;
}
