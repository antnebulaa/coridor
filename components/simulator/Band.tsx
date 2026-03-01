interface BandProps {
  id?: string;
  bg: 'hero' | 'white' | 'offwhite' | 'dark' | 'cta';
  children: React.ReactNode;
  className?: string;
  py?: string;
}

const bgStyles: Record<BandProps['bg'], React.CSSProperties> = {
  hero: {
    background: 'linear-gradient(to bottom, var(--sim-band-hero-from), var(--sim-band-white))',
  },
  white: {
    backgroundColor: 'var(--sim-band-white)',
  },
  offwhite: {
    backgroundColor: 'var(--sim-band-offwhite)',
  },
  dark: {
    backgroundColor: 'var(--sim-band-dark)',
  },
  cta: {
    background: 'linear-gradient(135deg, var(--sim-band-cta-from), var(--sim-band-cta-to))',
  },
};

export function Band({ id, bg, children, className = '', py = 'py-12 md:py-20' }: BandProps) {
  return (
    <section
      id={id}
      className={`w-full ${py} ${bg === 'dark' ? 'text-white' : ''} ${className}`}
      style={bgStyles[bg]}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {children}
      </div>
    </section>
  );
}
