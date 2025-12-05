'use client';

export function AuroraBackground() {
  return (
    <div className="aurora-background" aria-hidden="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Main aurora gradient */}
        <div 
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-[0.15] animate-[aurora-drift_20s_ease-in-out_infinite]"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, #0ea5e9 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, #8b5cf6 0%, transparent 50%),
              radial-gradient(ellipse at 40% 80%, #ec4899 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, #10b981 0%, transparent 50%)
            `,
            filter: 'blur(60px)',
          }}
        />
        
        {/* Secondary subtle particles */}
        <div 
          className="absolute top-0 left-0 w-full h-full opacity-[0.05]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, white 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px',
          }}
        />
      </div>
    </div>
  );
}

