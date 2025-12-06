'use client';

import { useRouter } from 'next/navigation';
import { TemplateBuilder } from '@/components/email/template-builder';

export default function NewTemplatePage() {
  const router = useRouter();

  const handleSave = async (blocks: any[], name: string, subject: string) => {
    try {
      // Generate HTML from blocks
      const html = generateHTMLFromBlocks(blocks);

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'Νέο Template',
          subject: subject || name || 'Νέο Template',
          content: html,
          category: 'custom',
        }),
      });

      if (response.ok) {
        alert('Το template αποθηκεύτηκε επιτυχώς!');
        router.push('/email');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Σφάλμα αποθήκευσης template');
    }
  };

  return (
    <div className="h-[calc(100vh-120px)]">
      <TemplateBuilder onSave={handleSave} />
    </div>
  );
}

// Helper function to generate HTML from blocks
function generateHTMLFromBlocks(blocks: any[]): string {
  let html = '';

  for (const block of blocks) {
    const style = `
      text-align: ${block.styles?.align || 'left'};
      padding: ${block.styles?.padding || '16px'};
      background-color: ${block.styles?.backgroundColor || 'transparent'};
      color: ${block.styles?.textColor || '#333333'};
    `;

    switch (block.type) {
      case 'heading':
        html += `<h1 style="${style}; font-size: 24px; margin: 0;">${block.content?.text || ''}</h1>`;
        break;
      case 'text':
        html += `<p style="${style}; font-size: 16px; line-height: 1.5; margin: 0;">${block.content?.text || ''}</p>`;
        break;
      case 'image':
        html += `<div style="${style}"><img src="${block.content?.src || ''}" alt="${block.content?.alt || ''}" style="max-width: 100%; height: auto;"></div>`;
        break;
      case 'button':
        html += `<div style="${style}"><a href="${block.content?.url || '#'}" style="display: inline-block; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px;">${block.content?.text || 'Click'}</a></div>`;
        break;
      case 'divider':
        html += `<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">`;
        break;
      case 'spacer':
        html += `<div style="height: ${block.content?.height || '20px'};"></div>`;
        break;
    }
  }

  return html;
}

