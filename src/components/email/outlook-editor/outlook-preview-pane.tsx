'use client';

import { sanitizeHtml } from '@/lib/html-sanitize';

import type { PreviewMode } from './types';

type OutlookPreviewPaneProps = {
  content: string;
  previewMode: PreviewMode;
};

function buildPreviewDocument(content: string, previewMode: PreviewMode): string {
  const sanitizedContent = sanitizeHtml(
    content || '<p style="color: #999;">Δεν υπάρχει περιεχόμενο...</p>'
  );
  const background = previewMode === 'dark' ? '#2a2a2a' : '#ffffff';
  const color = previewMode === 'dark' ? '#ffffff' : '#000000';

  return `<!doctype html>
<html lang="el">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:20px;background:${background};color:${color};font-family:Arial,sans-serif;">
    ${sanitizedContent}
  </body>
</html>`;
}

export function OutlookPreviewPane({
  content,
  previewMode,
}: OutlookPreviewPaneProps) {
  return (
    <iframe
      title="Email preview"
      data-testid="outlook-preview-pane"
      className={`mx-auto w-full transition-all ${previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`}
      style={{
        minHeight: '320px',
        border: 'none',
        borderRadius: '8px',
        boxShadow: 'var(--outlook-shadow-md)',
        background: previewMode === 'dark' ? '#2a2a2a' : 'white',
      }}
      srcDoc={buildPreviewDocument(content, previewMode)}
    />
  );
}
