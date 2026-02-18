'use client';

import { useEffect, useState } from 'react';

/**
 * Single-layer aurora background.
 * The animation itself lives in CSS ::before for lower repaint cost.
 */
export function AuroraBackground() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return <div className="aurora-background" aria-hidden="true" data-visible={isVisible} />;
}
