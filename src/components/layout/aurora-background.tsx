'use client';

/**
 * Single-layer aurora background.
 * Kept static to avoid continuous GPU compositing in glass-heavy screens.
 */
export function AuroraBackground() {
  return <div className="aurora-background" aria-hidden="true" />;
}
