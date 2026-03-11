'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';
import { useLocale } from 'next-intl';

const PowensCTAWidget = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const locale = useLocale();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get('/api/powens/status');
        if (!res.data?.connected) setShow(true);
      } catch {
        // No connection — show CTA
        setShow(true);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  if (loading || !show) return null;

  const handleConnect = async () => {
    try {
      const res = await axios.get(`/api/powens/init?mode=landlord&locale=${locale}`);
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      }
    } catch (err) {
      console.error('Powens init error:', err);
    }
  };

  return (
    <button
      onClick={handleConnect}
      className="w-full relative overflow-hidden rounded-2xl p-5 flex items-center gap-4 text-left group transition-transform active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
      }}
    >
      <div className="flex-1 min-w-0 py-2">
        <p className="text-xs font-medium uppercase text-white">
          Paiement des loyers
        </p>
        <p className="text-base font-medium text-white/90 mt-2 leading-tight">
          Connectez votre banque pour être alerté automatiquement
        </p>
      </div>
      <div className="shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
        <ArrowRight className="w-4 h-4 text-white" />
      </div>
    </button>
  );
};

export default PowensCTAWidget;
