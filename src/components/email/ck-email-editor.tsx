'use client';
/**
 * CKEditor 5 wrapper for the email body editor.
 * Replaces contentEditable + document.execCommand.
 * Uses the new ckeditor5 unified package (v47+) with @ckeditor/ckeditor5-react v11.
 *
 * NOTE: This file must only be rendered client-side. Use next/dynamic with ssr:false
 * in the parent component (outlook-editor.tsx).
 */

import { useEffect, useRef, type MutableRefObject } from 'react';
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

// CKEditor 5 base styles — must be imported once globally.
import 'ckeditor5/dist/ckeditor5.css';

export type CKEditorInstance = Editor;

export interface CKEmailEditorProps {
  /** Current HTML content */
  value: string;
  /** Called whenever the content changes */
  onChange: (html: string) => void;
  /**
   * Ref populated with the live CKEditor instance.
   * Allows the parent to call editor.execute('bold'), insert images, etc.
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

/**
 * Plugins configured for the email editor.
 * We intentionally keep the plugin set minimal to produce clean, email-friendly HTML.
 * No MediaEmbed, no Table, no Heading (produces <h2> tags that email clients strip).
 * PasteFromOffice handles Word/Outlook paste automatically.
 */
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

export function CKEmailEditor({
  value,
  onChange,
  editorInstanceRef,
  className,
  readOnly = false,
  placeholder = 'Γράψτε το μήνυμά σας εδώ...',
  onImageClick,
}: CKEmailEditorProps) {
  const localEditorRef = useRef<CKEditorInstance | null>(null);
  const onImageClickRef = useRef(onImageClick);

  // Keep the callback ref in sync with the latest prop value without re-subscribing to the view event.
  useEffect(() => {
    onImageClickRef.current = onImageClick;
  });

  // Sync readOnly state after initial mount.
  useEffect(() => {
    const editor = localEditorRef.current;
    if (!editor) return;
    if (readOnly) {
      editor.enableReadOnlyMode('ck-email-editor');
    } else {
      editor.disableReadOnlyMode('ck-email-editor');
    }
  }, [readOnly]);

  return (
    <div className={`ck-email-editor-wrapper${className ? ` ${className}` : ''}`}>
      <CKEditor
        editor={ClassicEditor}
        config={{
          // Cast needed because ckeditor5 plugin array typing is strict about exact plugin types
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
          localEditorRef.current = editor;
          if (editorInstanceRef) {
            editorInstanceRef.current = editor;
          }
          // Apply initial readOnly if needed
          if (readOnly) {
            editor.enableReadOnlyMode('ck-email-editor');
          }

          // Wire up image-click detection via the editing view
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
          const html = editor.getData();
          onChange(html);
        }}
        onError={(error, { phase }) => {
          console.error(`CKEditor error (${phase}):`, error);
        }}
        onAfterDestroy={() => {
          localEditorRef.current = null;
          if (editorInstanceRef) {
            editorInstanceRef.current = null;
          }
        }}
      />
    </div>
  );
}
