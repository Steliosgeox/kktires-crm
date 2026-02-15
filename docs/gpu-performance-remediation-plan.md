# GPU Performance Remediation Plan
## Triple Validation Protocol for Critical 99% GPU Usage Issue

**Document Version:** 1.0  
**Date:** February 2026  
**Status:** Ready for Implementation  
**Target:** <10% GPU usage at idle

---

## Executive Summary

### Root Cause Analysis

The investigation has identified **two primary categories** of GPU performance issues:

#### Category 1: CSS/Animation Issues (CRITICAL - P0)
| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| Double Aurora Animation | [`aurora-background.tsx`](src/components/layout/aurora-background.tsx:9) + [`globals.css`](src/app/globals.css:254) | 2 simultaneous infinite animations | CRITICAL |
| Extreme Blur Values | [`globals.css:268`](src/app/globals.css:268) | 80px blur on 200% viewport = millions of pixels/frame | CRITICAL |
| Missing Visibility Pause | Aurora component | Animation runs even when tab is hidden | HIGH |

#### Category 2: React Performance Issues (HIGH - P1)
| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| Google Maps Marker Recreation | [`map/page.tsx:254-304`](src/app/(dashboard)/map/page.tsx:254) | All markers destroyed/recreated on every fetch | CRITICAL |
| 177+ Inline Style Objects | Multiple files | Cascade re-renders on every parent update | HIGH |
| Zero React.memo Usage | All components | No memoization of expensive components | HIGH |

#### Category 3: CSS Performance Issues (MEDIUM - P2)
| Issue | Location | Count | Severity |
|-------|----------|-------|----------|
| backdrop-blur instances | Multiple components | 22+ | MEDIUM |
| Framer Motion + backdrop-blur | Modal overlays | 6+ | MEDIUM |

### Impact Assessment

```
┌─────────────────────────────────────────────────────────────────┐
│                    GPU USAGE BREAKDOWN                          │
├─────────────────────────────────────────────────────────────────┤
│  Double Aurora Animation (2x infinite)     ~40-50% GPU         │
│  Extreme Blur (80px on 200% viewport)      ~20-30% GPU         │
│  22+ backdrop-blur instances               ~10-15% GPU         │
│  Google Maps marker recreation             ~5-10% GPU          │
│  Inline style re-renders                   ~5-10% GPU          │
├─────────────────────────────────────────────────────────────────┤
│  TOTAL                                     ~80-99% GPU         │
└─────────────────────────────────────────────────────────────────┘
```

### Priority Matrix

```
         IMPACT
         HIGH │  P0: Double Aurora    P1: Maps Markers
              │  P0: Extreme Blur     P1: React.memo
              │  
         LOW  │  P2: Inline Styles    P2: backdrop-blur
              │  P2: reduced-motion   
              └────────────────────────────────────────
                   LOW                    HIGH
                        EFFORT
```

---

## Phase 1: Immediate Fixes (P0)

### Fix 1.1: Remove Double Aurora Animation

**Problem:** Two simultaneous infinite animations on the same background element.

**File:** [`src/components/layout/aurora-background.tsx`](src/components/layout/aurora-background.tsx)

**Current Code (Lines 8-19):**
```tsx
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
```

**CSS Animation (globals.css Lines 254-269):**
```css
.aurora-background::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: 
    radial-gradient(ellipse at 20% 20%, var(--aurora-1) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, var(--aurora-2) 0%, transparent 50%),
    radial-gradient(ellipse at 40% 80%, var(--aurora-3) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, var(--aurora-4) 0%, transparent 50%);
  opacity: 0.08;
  animation: aurora-drift 25s ease-in-out infinite;
  filter: blur(80px);
}
```

**Solution:** Remove the React animation, keep only CSS `::before` pseudo-element.

**Updated Code:**
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export function AuroraBackground() {
  const [isVisible, setIsVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Pause animation when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div 
      ref={ref}
      className="aurora-background" 
      aria-hidden="true"
      data-visible={isVisible}
    >
      {/* Secondary subtle particles - static, no animation */}
      <div 
        className="absolute top-0 left-0 w-full h-full opacity-[0.03]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, white 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />
    </div>
  );
}
```

**Updated CSS (globals.css):**
```css
.aurora-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
  background: var(--background);
}

.aurora-background::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: 
    radial-gradient(ellipse at 20% 20%, var(--aurora-1) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, var(--aurora-2) 0%, transparent 50%),
    radial-gradient(ellipse at 40% 80%, var(--aurora-3) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, var(--aurora-4) 0%, transparent 50%);
  opacity: 0.08;
  animation: aurora-drift 30s ease-in-out infinite;
  filter: blur(40px); /* Reduced from 80px */
  will-change: transform;
}

/* Pause animation when tab is hidden */
.aurora-background[data-visible="false"]::before {
  animation-play-state: paused;
}

/* Respect user preference for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .aurora-background::before {
    animation: none;
    transform: translate(0, 0) rotate(0deg);
  }
}

@keyframes aurora-drift {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(2%, 2%) rotate(1deg); /* Reduced from 3%, 3%, 2deg */
  }
  50% {
    transform: translate(-2%, 4%) rotate(-1deg); /* Reduced from -3%, 6%, -2deg */
  }
  75% {
    transform: translate(-4%, -2%) rotate(0.5deg); /* Reduced from -6%, -3%, 1deg */
  }
}
```

---

### Fix 1.2: Reduce Blur Values

**Problem:** 80px blur on 200% viewport element requires processing millions of pixels per frame.

**Files to Update:**

| File | Current Blur | Target Blur | Reduction |
|------|--------------|-------------|-----------|
| `globals.css:268` | 80px | 40px | 50% |
| `globals.css:292` | var(--glass-blur) = 16px | 12px | 25% |

**Updated CSS Variables (globals.css Lines 9-56):**
```css
:root {
  /* ... existing variables ... */
  
  /* Glass Effect Variables - Optimized for GPU */
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-bg-hover: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-border-hover: rgba(255, 255, 255, 0.20);
  --glass-blur: 12px; /* Reduced from 16px */
  
  /* ... rest of variables ... */
}
```

---

### Fix 1.3: Add Visibility-Based Animation Pause

**Problem:** Animation continues running when browser tab is hidden.

**Solution:** Already included in Fix 1.1 above with the `visibilitychange` event listener.

**Additional Optimization - Intersection Observer:**
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export function AuroraBackground() {
  const [isVisible, setIsVisible] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Pause when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Pause when element is out of viewport (for scrolled pages)
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const shouldAnimate = isVisible && isTabVisible;

  return (
    <div 
      ref={ref}
      className="aurora-background" 
      aria-hidden="true"
      data-animate={shouldAnimate}
    >
      {/* ... content ... */}
    </div>
  );
}
```

---

## Phase 2: High Priority Fixes (P1)

### Fix 2.1: Fix Google Maps Marker Recreation Loop

**Problem:** All markers are destroyed and recreated on every data fetch.

**File:** [`src/app/(dashboard)/map/page.tsx`](src/app/(dashboard)/map/page.tsx)

**Current Code (Lines 254-304):**
```tsx
// Update markers when customers change
useEffect(() => {
  if (!googleMapRef.current || !mapLoaded) return;

  // Clear existing markers
  markersRef.current.forEach(marker => marker.setMap(null));
  markersRef.current = [];

  // Add new markers
  customers.forEach(customer => {
    // ... marker creation code ...
  });
}, [customers, mapLoaded]);
```

**Solution:** Implement marker diffing algorithm.

**Updated Code:**
```tsx
// Marker management with diffing
useEffect(() => {
  if (!googleMapRef.current || !mapLoaded) return;

  const map = googleMapRef.current;
  const existingMarkers = new Map(
    markersRef.current.map(m => [m.get('customerId'), m])
  );
  const newMarkerIds = new Set(customers.map(c => c.id));
  const markersToKeep: google.maps.Marker[] = [];

  // Remove markers that no longer exist in data
  existingMarkers.forEach((marker, id) => {
    if (!newMarkerIds.has(id as string)) {
      marker.setMap(null);
    } else {
      markersToKeep.push(marker);
    }
  });

  // Add only new markers
  customers.forEach(customer => {
    if (!existingMarkers.has(customer.id)) {
      const color = customer.isVip
        ? categoryColors.vip
        : categoryColors[customer.category || 'retail'] || categoryColors.retail;

      const marker = new google.maps.Marker({
        position: { lat: customer.latitude, lng: customer.longitude },
        map: map,
        title: customer.displayName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: customer.isVip ? 10 : 8,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      // Store customer ID on marker for diffing
      marker.set('customerId', customer.id);

      marker.addListener('click', () => {
        setSelectedCustomer(customer);
        if (infoWindowRef.current && map) {
          infoWindowRef.current.setContent(`
            <div style="color: #1a1a2e; padding: 8px; min-width: 200px;">
              <h3 style="font-weight: 600; margin-bottom: 4px;">${customer.displayName}</h3>
              ${customer.city ? `<p style="font-size: 12px; color: #6b7280;">${customer.city}</p>` : ''}
              ${customer.phone ? `<p style="font-size: 12px; margin-top: 4px;">📞 ${customer.phone}</p>` : ''}
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersToKeep.push(marker);
    }
  });

  markersRef.current = markersToKeep;

  // Fit bounds only if we have new markers and no existing ones
  if (customers.length > 0 && existingMarkers.size === 0 && map) {
    const bounds = new google.maps.LatLngBounds();
    customers.forEach(c => bounds.extend({ lat: c.latitude, lng: c.longitude }));
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }
}, [customers, mapLoaded]);
```

---

### Fix 2.2: Add React.memo to Key Components

**Problem:** No components use React.memo, causing unnecessary re-renders.

**Files to Update:**

#### 1. GlassCard Component
**File:** [`src/components/ui/glass-card.tsx`](src/components/ui/glass-card.tsx)

```tsx
import { memo } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const GlassCard = memo(function GlassCard({
  children,
  className,
  padding = 'md',
  hover = true,
}: GlassCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.10] bg-white/[0.04] backdrop-blur-xl shadow-sm transition-all duration-200',
        paddingClasses[padding],
        hover && 'hover:border-white/[0.15] hover:bg-white/[0.06]',
        className
      )}
    >
      {children}
    </div>
  );
});
```

#### 2. GlassButton Component
**File:** [`src/components/ui/glass-button.tsx`](src/components/ui/glass-button.tsx)

```tsx
import { memo } from 'react';
// ... existing imports ...

interface GlassButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const GlassButton = memo(function GlassButton({
  children,
  variant = 'default',
  size = 'md',
  className,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
}: GlassButtonProps) {
  // ... component implementation ...
});
```

#### 3. GlassBadge Component
**File:** [`src/components/ui/glass-badge.tsx`](src/components/ui/glass-badge.tsx)

```tsx
import { memo } from 'react';
// ... existing imports ...

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

export const GlassBadge = memo(function GlassBadge({
  children,
  variant = 'default',
  size = 'md',
  className,
  style,
}: GlassBadgeProps) {
  // ... component implementation ...
});
```

#### 4. GlassInput Component
**File:** [`src/components/ui/glass-input.tsx`](src/components/ui/glass-input.tsx)

```tsx
import { memo, useCallback } from 'react';
// ... existing imports ...

interface GlassInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'search';
  className?: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const GlassInput = memo(function GlassInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
  disabled = false,
  leftIcon,
  rightIcon,
}: GlassInputProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      {/* ... input implementation with handleChange ... */}
    </div>
  );
});
```

---

### Fix 2.3: Extract Inline Styles to CSS

**Problem:** 177+ inline style objects cause cascade re-renders.

**High-Impact Files to Refactor:**

#### 1. Outlook Components (Highest Impact)
**Files:**
- [`src/components/email/outlook-editor.tsx`](src/components/email/outlook-editor.tsx) - ~80 inline styles
- [`src/components/email/outlook-list.tsx`](src/components/email/outlook-list.tsx) - ~35 inline styles
- [`src/components/email/outlook-sidebar.tsx`](src/components/email/outlook-sidebar.tsx) - ~20 inline styles
- [`src/components/email/outlook-recipient-drawer.tsx`](src/components/email/outlook-recipient-drawer.tsx) - ~30 inline styles

**Solution Pattern:**

**Before (Inline Styles):**
```tsx
<div style={{
  background: 'var(--outlook-bg-panel)',
  borderColor: 'var(--outlook-border)',
}}>
```

**After (CSS Classes):**
```tsx
<div className="outlook-panel outlook-border">
```

**Create new CSS file:** `src/styles/outlook-classes.css`

```css
/* Outlook Component Classes */
.outlook-panel {
  background: var(--outlook-bg-panel);
}

.outlook-surface {
  background: var(--outlook-bg-surface);
}

.outlook-border {
  border-color: var(--outlook-border);
}

.outlook-text-primary {
  color: var(--outlook-text-primary);
}

.outlook-text-secondary {
  color: var(--outlook-text-secondary);
}

.outlook-text-tertiary {
  color: var(--outlook-text-tertiary);
}

.outlook-accent-bg {
  background: var(--outlook-accent);
}

.outlook-accent-text {
  color: var(--outlook-accent);
}

.outlook-hover-bg {
  background: var(--outlook-bg-hover);
}

.outlook-selected-bg {
  background: var(--outlook-bg-selected);
}
```

---

## Phase 3: Medium Priority Fixes (P2)

### Fix 3.1: Optimize backdrop-blur Usage

**Problem:** 22+ instances of backdrop-blur cause GPU strain.

**Strategy:**
1. Reduce blur radius where possible
2. Use `backdrop-filter: none` for elements that don't need it
3. Consider static backgrounds for non-interactive elements

**Files to Update:**

| File | Current | Optimized |
|------|---------|-----------|
| `glass-card.tsx` | backdrop-blur-xl (24px) | backdrop-blur-md (12px) |
| `glass-input.tsx` | backdrop-blur-xl | backdrop-blur-sm (4px) |
| `glass-modal.tsx` | backdrop-blur-xl | backdrop-blur-lg (16px) |
| `sidebar.tsx` | backdrop-blur-xl | backdrop-blur-md |
| `header.tsx` | backdrop-blur-xl | backdrop-blur-md |

**CSS Update:**
```css
/* Add to globals.css */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.backdrop-blur-md {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.backdrop-blur-lg {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
```

---

### Fix 3.2: Add prefers-reduced-motion Support

**Problem:** Animations run even for users who prefer reduced motion.

**Add to globals.css:**
```css
/* Respect user preference for reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .aurora-background::before {
    animation: none;
  }

  .skeleton {
    animation: none;
    background: var(--glass-bg);
  }
}
```

---

### Fix 3.3: Optimize Framer Motion + backdrop-blur Combinations

**Problem:** Framer Motion animations combined with backdrop-blur cause heavy GPU load.

**Files:**
- [`src/components/ui/glass-modal.tsx`](src/components/ui/glass-modal.tsx)
- [`src/components/layout/command-palette.tsx`](src/components/layout/command-palette.tsx)
- [`src/components/layout/dashboard-shell.tsx`](src/components/layout/dashboard-shell.tsx)

**Solution:** Use `layoutId` for shared layouts and reduce backdrop-blur during animation.

```tsx
// Before
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="backdrop-blur-xl"
>

// After - animate blur separately
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="backdrop-blur-sm"
  transition={{ duration: 0.15 }}
>
  {/* Apply full blur after animation completes */}
  <div className="backdrop-blur-xl">
    {children}
  </div>
</motion.div>
```

---

## Triple Validation Protocol

### For Each Fix, Complete All Three Validations:

---

### Validation 1: Code Review Checklist

#### Fix 1.1 - Double Aurora Animation
- [ ] React animation removed from `aurora-background.tsx`
- [ ] CSS `::before` animation retained and optimized
- [ ] Visibility change listener added
- [ ] `data-visible` attribute toggles correctly
- [ ] No console errors in browser
- [ ] TypeScript compilation passes
- [ ] ESLint passes

#### Fix 1.2 - Blur Values
- [ ] `--glass-blur` variable updated to 12px
- [ ] Aurora blur reduced to 40px
- [ ] All glass components still render correctly
- [ ] No visual regression in glass effects

#### Fix 1.3 - Visibility Pause
- [ ] `visibilitychange` event listener added
- [ ] Animation pauses when tab is hidden
- [ ] Animation resumes when tab is visible
- [ ] No memory leaks (listener removed on unmount)

#### Fix 2.1 - Google Maps Markers
- [ ] Marker diffing algorithm implemented
- [ ] Existing markers are reused, not recreated
- [ ] New markers are added correctly
- [ ] Removed markers are cleaned up
- [ ] Map bounds only calculated on initial load
- [ ] No marker flickering on data refresh

#### Fix 2.2 - React.memo
- [ ] All glass UI components wrapped with `memo`
- [ ] Props are properly typed
- [ ] No unnecessary re-renders detected
- [ ] Component behavior unchanged

#### Fix 3.1 - backdrop-blur Optimization
- [ ] Blur values reduced where appropriate
- [ ] Visual quality maintained
- [ ] No layout shifts

#### Fix 3.2 - prefers-reduced-motion
- [ ] Media query added to CSS
- [ ] Animations disabled for users who prefer reduced motion
- [ ] Skeleton loading still works (static)

---

### Validation 2: Manual Testing Procedure

#### Pre-Test Setup
1. Open Chrome DevTools > Performance Monitor (Ctrl+Shift+P > "Show Performance Monitor")
2. Enable "GPU memory" and "GPU usage" metrics
3. Close all other browser tabs and applications

#### Test Procedure for Each Fix:

**Fix 1.1 & 1.2 - Aurora Animation:**
```
1. Load the application dashboard
2. Record baseline GPU usage for 30 seconds
3. Switch to another browser tab for 10 seconds
4. Switch back and verify animation resumed
5. Check GPU usage - should be <20% at idle
6. Verify visual appearance of aurora effect
```

**Fix 2.1 - Google Maps:**
```
1. Navigate to /map page
2. Open Chrome DevTools > Performance
3. Click "Refresh" button on map
4. Verify no marker flickering
5. Check Performance profile for long tasks
6. GPU should not spike during refresh
```

**Fix 2.2 - React.memo:**
```
1. Open React DevTools > Profiler
2. Interact with glass components (buttons, cards, inputs)
3. Check profiler for unnecessary re-renders
4. Verify components only render when props change
```

**Fix 3.2 - Reduced Motion:**
```
1. Open OS accessibility settings
2. Enable "Reduce motion" / "Minimize animations"
3. Refresh the application
4. Verify no animations are playing
5. Aurora should be static
6. Disable "Reduce motion" and verify animations resume
```

---

### Validation 3: Performance Testing with Metrics

#### Benchmark Targets

| Metric | Before | Target | Acceptable |
|--------|--------|--------|------------|
| GPU Usage (idle) | 99% | <10% | <20% |
| GPU Usage (interacting) | 100% | <30% | <50% |
| Frame Rate | 15-30 fps | 60 fps | 55+ fps |
| Main Thread Long Tasks | 10+ | 0-2 | <5 |
| Memory Usage | High | Stable | No leaks |

#### Performance Test Script

```javascript
// Run in browser console after each fix
// Performance Monitor Script

const metrics = {
  gpuUsage: [],
  frameRate: [],
  memoryUsage: [],
};

// Monitor for 30 seconds
const duration = 30000;
const interval = 1000;
let elapsed = 0;

const monitor = setInterval(() => {
  elapsed += interval;
  
  // Get performance metrics
  const perfData = performance.getEntriesByType('navigation')[0];
  const memory = performance.memory;
  
  metrics.memoryUsage.push(memory?.usedJSHeapSize || 0);
  
  // Calculate frame rate
  let frameCount = 0;
  const countFrames = () => frameCount++;
  requestAnimationFrame(function loop() {
    frameCount++;
    if (elapsed < duration) requestAnimationFrame(loop);
  });
  
  setTimeout(() => {
    metrics.frameRate.push(frameCount);
  }, 1000);
  
  if (elapsed >= duration) {
    clearInterval(monitor);
    console.log('Performance Metrics:', metrics);
    console.log('Average Frame Rate:', 
      metrics.frameRate.reduce((a, b) => a + b, 0) / metrics.frameRate.length);
    console.log('Memory Trend:', 
      metrics.memoryUsage[0] > metrics.memoryUsage[metrics.memoryUsage.length - 1] 
        ? 'Decreasing (Good)' 
        : 'Increasing (Potential Leak)');
  }
}, interval);
```

#### Chrome DevTools Performance Profile

1. Open DevTools > Performance
2. Click "Record" (Ctrl+E)
3. Interact with the application for 30 seconds:
   - Navigate between pages
   - Click buttons
   - Open/close modals
   - Scroll lists
4. Stop recording
5. Analyze:
   - Check for long tasks (>50ms)
   - Look for layout thrashing
   - Verify GPU compositing is efficient
   - Check for forced reflows

---

## Test Plan

### Unit Tests Needed

#### Aurora Background Component
```typescript
// tests/components/aurora-background.test.tsx
import { render, screen } from '@testing-library/react';
import { AuroraBackground } from '@/components/layout/aurora-background';

describe('AuroraBackground', () => {
  it('should render without crashing', () => {
    render(<AuroraBackground />);
    expect(screen.getByRole('presentation', { hidden: true })).toBeInTheDocument();
  });

  it('should pause animation when tab is hidden', () => {
    const { container } = render(<AuroraBackground />);
    const element = container.firstChild;
    
    // Simulate tab hidden
    Object.defineProperty(document, 'hidden', { value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    
    expect(element).toHaveAttribute('data-visible', 'false');
  });

  it('should respect prefers-reduced-motion', () => {
    // Mock matchMedia
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    render(<AuroraBackground />);
    // Verify animation is disabled
  });
});
```

#### Google Maps Marker Management
```typescript
// tests/map/markers.test.tsx
import { render, waitFor } from '@testing-library/react';
import MapPage from '@/app/(dashboard)/map/page';

// Mock Google Maps
jest.mock('@/lib/google-maps', () => ({
  loadGoogleMaps: jest.fn(),
}));

describe('Map Marker Management', () => {
  it('should reuse existing markers on data refresh', async () => {
    const { rerender } = render(<MapPage />);
    
    // Get initial marker count
    const initialMarkers = document.querySelectorAll('[data-marker]');
    
    // Refresh with same data
    rerender(<MapPage />);
    
    // Verify markers were not recreated
    const newMarkers = document.querySelectorAll('[data-marker]');
    expect(newMarkers.length).toBe(initialMarkers.length);
  });

  it('should only add new markers for new data', async () => {
    // Test marker diffing
  });

  it('should remove markers for deleted customers', async () => {
    // Test marker cleanup
  });
});
```

### E2E Tests Needed

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('GPU Performance', () => {
  test('aurora animation should pause when tab is hidden', async ({ page, context }) => {
    await page.goto('/dashboard');
    
    // Wait for animation to start
    await page.waitForSelector('.aurora-background');
    
    // Check animation is running
    const animationState = await page.evaluate(() => {
      const el = document.querySelector('.aurora-background');
      return el?.getAttribute('data-animate');
    });
    expect(animationState).toBe('true');
    
    // Open new tab (this hides current tab)
    const newPage = await context.newPage();
    await newPage.goto('about:blank');
    
    // Check animation paused
    const pausedState = await page.evaluate(() => {
      const el = document.querySelector('.aurora-background');
      return el?.getAttribute('data-animate');
    });
    expect(pausedState).toBe('false');
    
    await newPage.close();
  });

  test('map markers should not flicker on refresh', async ({ page }) => {
    await page.goto('/map');
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="map-container"]');
    
    // Start tracing
    await page.context().tracing.start({ screenshots: true });
    
    // Click refresh button
    await page.click('button:has-text("Ανανέωση")');
    
    // Wait for refresh to complete
    await page.waitForResponse('**/api/customers/locations');
    
    // Stop tracing
    const trace = await page.context().tracing.stop();
    
    // Verify no long tasks during refresh
    const metrics = await page.evaluate(() => performance.getEntriesByType('measure'));
    // Assert no long tasks
  });

  test('should respect prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/dashboard');
    
    // Check that animations are disabled
    const animationRunning = await page.evaluate(() => {
      const el = document.querySelector('.aurora-background::before');
      const styles = window.getComputedStyle(el);
      return styles.animationPlayState !== 'paused';
    });
    
    expect(animationRunning).toBe(false);
  });
});
```

### Performance Benchmarks

```yaml
# performance-budget.yaml
budgets:
  - resourceType: script
    budget: 500kb
    
  - resourceType: stylesheet
    budget: 100kb
    
  - resourceType: total
    budget: 1mb
    
  - metric: first-contentful-paint
    budget: 2000ms
    
  - metric: largest-contentful-paint
    budget: 3000ms
    
  - metric: cumulative-layout-shift
    budget: 0.1
    
  - metric: total-blocking-time
    budget: 300ms
    
  # Custom GPU metrics
  - metric: gpu-usage-idle
    budget: 20%
    
  - metric: frame-rate
    budget: 55fps
```

---

## Rollback Plan

### Rollback Strategy

Each fix should be deployed independently with the ability to quickly rollback.

#### Fix 1.1 - Aurora Animation

**Rollback Method:** Git revert

```bash
# If issues detected, revert the commit
git revert <commit-hash>

# Or restore specific files
git checkout HEAD~1 -- src/components/layout/aurora-background.tsx
git checkout HEAD~1 -- src/app/globals.css
```

**Risk Assessment:**
- **Risk Level:** Low
- **Impact:** Visual only, no functionality affected
- **Rollback Time:** < 5 minutes

#### Fix 2.1 - Google Maps Markers

**Rollback Method:** Feature flag

```typescript
// Add feature flag for marker optimization
const USE_MARKER_DIFFING = process.env.NEXT_PUBLIC_MARKER_DIFFING !== 'false';

// In marker effect
if (USE_MARKER_DIFFING) {
  // New diffing algorithm
} else {
  // Old recreation method
}
```

**Risk Assessment:**
- **Risk Level:** Medium
- **Impact:** Map functionality could break
- **Rollback Time:** < 2 minutes (feature flag)

#### Fix 2.2 - React.memo

**Rollback Method:** Remove memo wrappers

```bash
# Revert memo changes
git checkout HEAD~1 -- src/components/ui/glass-*.tsx
```

**Risk Assessment:**
- **Risk Level:** Low
- **Impact:** Performance regression only
- **Rollback Time:** < 5 minutes

### Rollback Decision Matrix

| Issue Severity | Action | Timeframe |
|----------------|--------|-----------|
| Critical (app broken) | Immediate rollback | < 5 minutes |
| High (major feature broken) | Rollback specific fix | < 15 minutes |
| Medium (visual issues) | Deploy hotfix | < 1 hour |
| Low (minor issues) | Fix in next release | Next sprint |

---

## Monitoring

### Metrics to Track

#### Real User Monitoring (RUM)

```typescript
// lib/performance-monitoring.ts
export function initPerformanceMonitoring() {
  // Track GPU metrics
  if ('getGPU' in navigator) {
    (navigator as any).getGPU().then((gpu: any) => {
      gpu.requestAdapter().then((adapter: any) => {
        console.log('GPU Adapter:', adapter.name);
      });
    });
  }

  // Track frame rate
  let frameCount = 0;
  let lastTime = performance.now();
  
  const measureFPS = () => {
    frameCount++;
    const now = performance.now();
    
    if (now - lastTime >= 1000) {
      const fps = Math.round(frameCount * 1000 / (now - lastTime));
      
      // Send to analytics
      if (fps < 30) {
        console.warn('Low FPS detected:', fps);
        // sendToAnalytics('low_fps', { fps });
      }
      
      frameCount = 0;
      lastTime = now;
    }
    
    requestAnimationFrame(measureFPS);
  };
  
  requestAnimationFrame(measureFPS);

  // Track long tasks
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) {
        console.warn('Long task detected:', entry.duration, 'ms');
        // sendToAnalytics('long_task', { duration: entry.duration });
      }
    }
  });
  
  observer.observe({ entryTypes: ['longtask'] });
}
```

#### Dashboard Metrics

Create a monitoring dashboard with:

1. **GPU Usage Over Time**
   - Real-time graph
   - Alert when >30% at idle

2. **Frame Rate Distribution**
   - Histogram of FPS
   - Alert when <30fps for >10% of sessions

3. **Long Task Frequency**
   - Count per session
   - Alert when >5 per minute

4. **Memory Usage Trend**
   - Heap size over time
   - Alert on memory leak pattern

### Verification Checklist

After deploying each fix:

- [ ] GPU usage at idle <20%
- [ ] Frame rate stable at 55+ fps
- [ ] No long tasks during normal interaction
- [ ] Memory usage stable (no leaks)
- [ ] No visual regressions reported
- [ ] No console errors in production logs
- [ ] User feedback positive

### Alerting Rules

```yaml
# alerting-rules.yaml
alerts:
  - name: high-gpu-usage
    condition: gpu_usage > 30%
    duration: 5m
    severity: warning
    action: notify-team
    
  - name: critical-gpu-usage
    condition: gpu_usage > 50%
    duration: 2m
    severity: critical
    action: 
      - notify-team
      - auto-rollback
      
  - name: low-frame-rate
    condition: fps < 30
    duration: 1m
    severity: warning
    action: notify-team
    
  - name: memory-leak
    condition: memory_trend == 'increasing'
    duration: 10m
    severity: warning
    action: notify-team
```

---

## Implementation Order

### Recommended Deployment Sequence

```
Week 1: Phase 1 (P0)
├── Fix 1.1: Remove double aurora animation
├── Fix 1.2: Reduce blur values
└── Fix 1.3: Add visibility pause

Week 2: Phase 2 (P1) 
├── Fix 2.1: Google Maps marker diffing
└── Fix 2.2: React.memo for glass components

Week 3: Phase 3 (P2)
├── Fix 3.1: Optimize backdrop-blur
├── Fix 3.2: prefers-reduced-motion
└── Fix 3.3: Framer Motion optimization
```

### Success Criteria

| Phase | Metric Target | Validation |
|-------|---------------|------------|
| Phase 1 Complete | GPU <40% at idle | Manual + Performance test |
| Phase 2 Complete | GPU <25% at idle | Manual + Performance test |
| Phase 3 Complete | GPU <10% at idle | Full test suite + RUM |

---

## Appendix

### A. File Change Summary

| File | Changes | Lines Modified |
|------|---------|----------------|
| `src/components/layout/aurora-background.tsx` | Remove animation, add visibility | ~30 |
| `src/app/globals.css` | Reduce blur, add reduced-motion | ~50 |
| `src/app/(dashboard)/map/page.tsx` | Marker diffing algorithm | ~60 |
| `src/components/ui/glass-card.tsx` | Add React.memo | ~5 |
| `src/components/ui/glass-button.tsx` | Add React.memo | ~5 |
| `src/components/ui/glass-badge.tsx` | Add React.memo | ~5 |
| `src/components/ui/glass-input.tsx` | Add React.memo | ~5 |
| `src/styles/outlook-classes.css` | New file for extracted styles | ~100 |

### B. Performance Testing Tools

1. **Chrome DevTools Performance Monitor**
   - Built-in, no setup required
   - Real-time GPU usage

2. **Lighthouse**
   - Automated performance audits
   - CI/CD integration

3. **WebPageTest**
   - Real device testing
   - Network throttling

4. **React DevTools Profiler**
   - Component render analysis
   - Identify unnecessary re-renders

### C. References

- [CSS Performance Optimization](https://web.dev/css-performance/)
- [React Performance Best Practices](https://react.dev/learn/render-and-commit)
- [Google Maps JavaScript API Performance](https://developers.google.com/maps/documentation/javascript/performance)
- [prefers-reduced-motion Media Query](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
