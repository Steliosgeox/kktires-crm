'use client';

import { useEffect, useCallback } from 'react';

type KeyboardModifier = 'ctrl' | 'meta' | 'alt' | 'shift';

interface ShortcutConfig {
  key: string;
  modifiers?: KeyboardModifier[];
  callback: () => void;
  preventDefault?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 */
export function useKeyboardShortcut(config: ShortcutConfig | ShortcutConfig[]) {
  const configs = Array.isArray(config) ? config : [config];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const { key, modifiers = [], callback, preventDefault = true } of configs) {
        const keyMatch = event.key.toLowerCase() === key.toLowerCase();
        
        const ctrlMatch = modifiers.includes('ctrl') ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = modifiers.includes('meta') ? event.metaKey : !event.metaKey;
        const altMatch = modifiers.includes('alt') ? event.altKey : !event.altKey;
        const shiftMatch = modifiers.includes('shift') ? event.shiftKey : !event.shiftKey;

        // Handle Cmd on Mac / Ctrl on Windows
        const cmdOrCtrl = modifiers.includes('ctrl') || modifiers.includes('meta');
        const cmdOrCtrlMatch = cmdOrCtrl 
          ? (event.ctrlKey || event.metaKey) 
          : (!event.ctrlKey && !event.metaKey);

        const modifiersMatch = cmdOrCtrl 
          ? cmdOrCtrlMatch && altMatch && shiftMatch
          : ctrlMatch && metaMatch && altMatch && shiftMatch;

        if (keyMatch && modifiersMatch) {
          if (preventDefault) {
            event.preventDefault();
          }
          callback();
          break;
        }
      }
    },
    [configs]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for Cmd+K / Ctrl+K command palette
 */
export function useCommandPalette(onOpen: () => void) {
  useKeyboardShortcut({
    key: 'k',
    modifiers: ['meta'],
    callback: onOpen,
  });
}

/**
 * Hook for Escape key
 */
export function useEscapeKey(onEscape: () => void) {
  useKeyboardShortcut({
    key: 'Escape',
    callback: onEscape,
    preventDefault: false,
  });
}

