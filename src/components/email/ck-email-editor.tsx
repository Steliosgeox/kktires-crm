'use client';
/**
 * Lightweight rich-text editor for the email composer.
 *
 * Uses contentEditable + document.execCommand to provide basic formatting.
 * Exposes the same API surface that the parent (outlook-editor.tsx) relies on,
 * so it is a drop-in replacement for the previous CKEditor 5 wrapper.
 *
 * NOTE: This file must only be rendered client-side. Use next/dynamic with ssr:false
 * in the parent component (outlook-editor.tsx).
 */

import { useEffect, useRef, useCallback, type MutableRefObject } from 'react';

// ---------------------------------------------------------------------------
// Editor instance interface — mirrors the CKEditor API surface used by the
// parent component so that zero changes are required upstream.
// ---------------------------------------------------------------------------

export interface CKEditorInstance {
  getData(): string;
  setData(html: string): void;
  execute(command: string, options?: string | Record<string, unknown>): void;
  enableReadOnlyMode(lockId: string): void;
  disableReadOnlyMode(lockId: string): void;
  data: {
    processor: {
      toView(html: string): string;
    };
    toModel(fragment: string): string;
  };
  model: {
    change(callback: (writer: ModelWriter) => void): void;
    insertContent(fragment: string): void;
    document: {
      selection: {
        getFirstPosition(): unknown;
      };
    };
  };
  editing: {
    view: {
      document: {
        on(event: string, handler: (evt: unknown, data: { domEvent: Event }) => void): void;
      };
    };
  };
}

interface ModelWriter {
  insertText(text: string, position: unknown): void;
}

export interface CKEmailEditorProps {
  /** Current HTML content */
  value: string;
  /** Called whenever the content changes */
  onChange: (html: string) => void;
  /**
   * Ref populated with the live editor instance.
   * Allows the parent to call editor.execute('bold'), insert text, etc.
   */
  editorInstanceRef?: MutableRefObject<CKEditorInstance | null>;
  className?: string;
  readOnly?: boolean;
  /** Placeholder text shown when editor is empty */
  placeholder?: string;
  /**
   * Called when the user clicks on an <img> element inside the editor.
   * Receives the data-email-asset-id attribute value (or null if not an asset image).
   */
  onImageClick?: (assetId: string | null) => void;
}

// ---------------------------------------------------------------------------
// Command map: CKEditor 5 command names → document.execCommand equivalents
// ---------------------------------------------------------------------------

const EXEC_COMMAND_MAP: Record<string, string> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  bulletedList: 'insertUnorderedList',
  numberedList: 'insertOrderedList',
  // Legacy execCommand names (passed through from outlook-editor's applyEditorCommand)
  insertUnorderedList: 'insertUnorderedList',
  insertOrderedList: 'insertOrderedList',
};

const ALIGNMENT_MAP: Record<string, string> = {
  left: 'justifyLeft',
  center: 'justifyCenter',
  right: 'justifyRight',
  justify: 'justifyFull',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CKEmailEditor({
  value,
  onChange,
  editorInstanceRef,
  className,
  readOnly = false,
  placeholder = 'Γράψτε το μήνυμά σας εδώ...',
  onImageClick,
}: CKEmailEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onImageClickRef = useRef(onImageClick);
  const isReadOnly = useRef(readOnly);

  // Keep callback refs current without re-subscribing events.
  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => { onImageClickRef.current = onImageClick; });

  // Emit changes on input.
  const handleInput = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    onChangeRef.current(el.innerHTML);
  }, []);

  // Build the editor-instance facade and expose it via ref.
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;

    const instance: CKEditorInstance = {
      getData() {
        return el.innerHTML;
      },
      setData(html: string) {
        el.innerHTML = html;
        onChangeRef.current(html);
      },
      execute(command: string, options?: string | Record<string, unknown>) {
        el.focus();

        if (command === 'alignment') {
          const opts = typeof options === 'object' ? options : {};
          const alignment = (opts?.value as string) ?? 'left';
          const execCmd = ALIGNMENT_MAP[alignment] ?? 'justifyLeft';
          document.execCommand(execCmd, false);
        } else if (command === 'link' && typeof options === 'string') {
          document.execCommand('createLink', false, options);
        } else {
          const execCmd = EXEC_COMMAND_MAP[command] ?? command;
          document.execCommand(execCmd, false);
        }

        onChangeRef.current(el.innerHTML);
      },
      enableReadOnlyMode(_lockId: string) {
        el.contentEditable = 'false';
        isReadOnly.current = true;
      },
      disableReadOnlyMode(_lockId: string) {
        el.contentEditable = 'true';
        isReadOnly.current = false;
      },
      data: {
        processor: {
          toView(html: string) { return html; },
        },
        toModel(fragment: string) { return fragment; },
      },
      model: {
        change(callback: (writer: ModelWriter) => void) {
          const writer: ModelWriter = {
            insertText(text: string, _position: unknown) {
              el.focus();
              document.execCommand('insertText', false, text);
              onChangeRef.current(el.innerHTML);
            },
          };
          callback(writer);
        },
        insertContent(fragment: string) {
          el.focus();
          document.execCommand('insertHTML', false, fragment);
          onChangeRef.current(el.innerHTML);
        },
        document: {
          selection: {
            getFirstPosition() {
              return window.getSelection()?.getRangeAt?.(0)?.startContainer ?? null;
            },
          },
        },
      },
      editing: {
        view: {
          document: {
            on(event: string, handler: (evt: unknown, data: { domEvent: Event }) => void) {
              if (event === 'click') {
                el.addEventListener('click', (e) => {
                  handler(null, { domEvent: e });
                });
              }
            },
          },
        },
      },
    };

    if (editorInstanceRef) {
      editorInstanceRef.current = instance;
    }

    // Wire up image-click detection.
    el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const img = target.closest('img');
      const assetId =
        img instanceof HTMLImageElement
          ? (img.dataset.emailAssetId ?? null)
          : null;
      onImageClickRef.current?.(assetId);
    });

    return () => {
      if (editorInstanceRef) {
        editorInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set initial content.
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    // Only set if actually different to avoid clobbering the cursor.
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync readOnly prop.
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    el.contentEditable = readOnly ? 'false' : 'true';
    isReadOnly.current = readOnly;
  }, [readOnly]);

  return (
    <div className={`ck-email-editor-wrapper${className ? ` ${className}` : ''}`}>
      <div
        ref={editableRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        style={{
          minHeight: '300px',
          padding: '16px',
          outline: 'none',
          color: 'inherit',
          fontSize: '14px',
          lineHeight: '1.6',
          wordBreak: 'break-word',
        }}
      />
      <style jsx>{`
        .ck-email-editor-wrapper [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: rgba(255, 255, 255, 0.35);
          pointer-events: none;
          position: absolute;
        }
        .ck-email-editor-wrapper [contenteditable] {
          position: relative;
        }
        .ck-email-editor-wrapper [contenteditable] img {
          max-width: 100%;
          height: auto;
          cursor: pointer;
        }
        .ck-email-editor-wrapper [contenteditable] a {
          color: #0ea5e9;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
