'use client';
/**
 * CKEditor 5 wrapper for the email body editor.
 * Uses the unified ckeditor5 package with a minimal email-safe plugin set.
 *
 * NOTE: This file must only be rendered client-side. Use next/dynamic with ssr:false
 * in the parent component (outlook-editor.tsx).
 */

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Bold,
  Italic,
  Underline,
  Essentials,
  Paragraph,
  List,
  Alignment,
  Link,
  AutoLink,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  PasteFromOffice,
  Autoformat,
  type Editor,
  type EditorConfig,
  type EventInfo,
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

export type CKEditorInstance = Editor;

type EditorWithEditableElement = {
  ui?: {
    view?: {
      editable?: {
        element?: HTMLElement | null;
      };
    };
  };
};

export interface CKEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  editorInstanceRef?: MutableRefObject<CKEditorInstance | null>;
  editableElementRef?: MutableRefObject<HTMLElement | null>;
  className?: string;
  readOnly?: boolean;
  placeholder?: string;
  onImageClick?: (assetId: string | null) => void;
}

const EMAIL_EDITOR_PLUGINS = [
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  List,
  Alignment,
  Link,
  AutoLink,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  PasteFromOffice,
  Autoformat,
] as const;

const EMAIL_EDITOR_TOOLBAR_ITEMS = [
  'bold',
  'italic',
  'underline',
  '|',
  'bulletedList',
  'numberedList',
  '|',
  'alignment',
  '|',
  'link',
  '|',
  'undo',
  'redo',
] as const;

function getEditableElement(editor: Editor): HTMLElement | null {
  return (editor as EditorWithEditableElement).ui?.view?.editable?.element ?? null;
}

export function CKEmailEditor({
  value,
  onChange,
  editorInstanceRef,
  editableElementRef,
  className,
  readOnly = false,
  placeholder = 'Γράψτε το μήνυμά σας εδώ...',
  onImageClick,
}: CKEmailEditorProps) {
  const localEditorRef = useRef<CKEditorInstance | null>(null);
  const onImageClickRef = useRef(onImageClick);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    onImageClickRef.current = onImageClick;
  });

  useEffect(() => {
    const editor = localEditorRef.current;
    if (!editor) return;

    if (readOnly) {
      editor.enableReadOnlyMode('ck-email-editor');
      return;
    }

    editor.disableReadOnlyMode('ck-email-editor');
  }, [readOnly]);

  if (loadError) {
    return (
      <div className={`ck-email-editor-wrapper${className ? ` ${className}` : ''}`}>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          aria-label="Email body"
          data-testid="fallback-email-editor"
          className="min-h-[300px] w-full resize-y rounded-sm border p-3 outline-none"
          style={{
            background: 'var(--outlook-bg-panel)',
            borderColor: 'var(--outlook-border)',
            color: 'var(--outlook-text-primary)',
          }}
        />
      </div>
    );
  }

  return (
    <div className={`ck-email-editor-wrapper${className ? ` ${className}` : ''}`}>
      <CKEditor
        editor={ClassicEditor}
        config={{
          licenseKey: 'GPL',
          plugins: EMAIL_EDITOR_PLUGINS as unknown as EditorConfig['plugins'],
          toolbar: {
            items: EMAIL_EDITOR_TOOLBAR_ITEMS as unknown as string[],
            shouldNotGroupWhenFull: true,
          },
          image: {
            toolbar: [
              'imageStyle:inline',
              'imageStyle:block',
              'imageStyle:side',
              '|',
              'imageTextAlternative',
            ],
          },
          link: {
            defaultProtocol: 'https://',
            addTargetToExternalLinks: true,
          },
          placeholder,
        }}
        data={value}
        onReady={(editor) => {
          setLoadError(null);
          localEditorRef.current = editor;
          if (editorInstanceRef) {
            editorInstanceRef.current = editor;
          }
          if (editableElementRef) {
            editableElementRef.current = getEditableElement(editor);
          }
          if (readOnly) {
            editor.enableReadOnlyMode('ck-email-editor');
          }

          editor.editing.view.document.on('click', (_evt, data) => {
            const domEvent = data.domEvent as MouseEvent;
            const target = domEvent.target as HTMLElement | null;
            if (!target) return;

            const img = target.closest('img');
            const assetId =
              img instanceof HTMLImageElement
                ? (img.dataset.emailAssetId ?? null)
                : null;
            onImageClickRef.current?.(assetId);
          });
        }}
        onChange={(_event: EventInfo, editor: Editor) => {
          onChange(editor.getData());
        }}
        onError={(error, { phase }) => {
          console.error(`CKEditor error (${phase}):`, error);
          setLoadError(
            phase === 'initialization'
              ? 'CKEditor failed to initialize'
              : 'CKEditor encountered an error'
          );
        }}
        onAfterDestroy={() => {
          localEditorRef.current = null;
          if (editorInstanceRef) {
            editorInstanceRef.current = null;
          }
          if (editableElementRef) {
            editableElementRef.current = null;
          }
        }}
      />
    </div>
  );
}
