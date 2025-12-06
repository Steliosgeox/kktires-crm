'use client';

import { useState, useCallback } from 'react';
import {
  Type,
  Image,
  Columns,
  Square,
  Link as LinkIcon,
  Heading1,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  MoveUp,
  MoveDown,
  Copy,
  Eye,
  Save,
  Smartphone,
  Monitor,
  Plus,
  Settings,
  Palette,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassModal } from '@/components/ui/glass-modal';
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/glass-tabs';

interface BlockData {
  id: string;
  type: 'heading' | 'text' | 'image' | 'button' | 'divider' | 'columns' | 'spacer';
  content: any;
  styles: {
    align?: 'left' | 'center' | 'right';
    padding?: string;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
  };
}

// Block components
const blockTypes = [
  { type: 'heading', label: 'Τίτλος', icon: Heading1, defaultContent: { text: 'Τίτλος Email' } },
  { type: 'text', label: 'Κείμενο', icon: Type, defaultContent: { text: 'Γράψτε το κείμενό σας εδώ...' } },
  { type: 'image', label: 'Εικόνα', icon: Image, defaultContent: { src: '', alt: '' } },
  { type: 'button', label: 'Κουμπί', icon: Square, defaultContent: { text: 'Κλικ εδώ', url: '#' } },
  { type: 'divider', label: 'Διαχωριστικό', icon: Columns, defaultContent: {} },
  { type: 'spacer', label: 'Κενό', icon: Plus, defaultContent: { height: '20px' } },
];

interface TemplateBuilderProps {
  initialBlocks?: BlockData[];
  templateName?: string;
  onSave?: (blocks: BlockData[], name: string, subject: string) => void;
}

export function TemplateBuilder({ initialBlocks = [], templateName = '', onSave }: TemplateBuilderProps) {
  const [blocks, setBlocks] = useState<BlockData[]>(initialBlocks);
  const [name, setName] = useState(templateName);
  const [subject, setSubject] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const addBlock = (type: string, defaultContent: any) => {
    const newBlock: BlockData = {
      id: `block-${Date.now()}`,
      type: type as BlockData['type'],
      content: { ...defaultContent },
      styles: {
        align: 'left',
        padding: '16px',
        backgroundColor: 'transparent',
        textColor: '#ffffff',
      },
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const updateBlock = (id: string, updates: Partial<BlockData>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (block) {
      const newBlock = {
        ...block,
        id: `block-${Date.now()}`,
        content: { ...block.content },
        styles: { ...block.styles },
      };
      const index = blocks.findIndex((b) => b.id === id);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
    }
  };

  const generateHTML = () => {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          .email-container { max-width: 600px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="email-container">
    `;

    for (const block of blocks) {
      const style = `
        text-align: ${block.styles.align || 'left'};
        padding: ${block.styles.padding || '16px'};
        background-color: ${block.styles.backgroundColor || 'transparent'};
        color: ${block.styles.textColor || '#333333'};
      `;

      switch (block.type) {
        case 'heading':
          html += `<h1 style="${style}; font-size: 24px; margin: 0;">${block.content.text}</h1>`;
          break;
        case 'text':
          html += `<p style="${style}; font-size: 16px; line-height: 1.5; margin: 0;">${block.content.text}</p>`;
          break;
        case 'image':
          html += `<div style="${style}"><img src="${block.content.src}" alt="${block.content.alt}" style="max-width: 100%; height: auto;"></div>`;
          break;
        case 'button':
          html += `<div style="${style}"><a href="${block.content.url}" style="display: inline-block; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px;">${block.content.text}</a></div>`;
          break;
        case 'divider':
          html += `<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">`;
          break;
        case 'spacer':
          html += `<div style="height: ${block.content.height};"></div>`;
          break;
      }
    }

    html += `
        </div>
      </body>
      </html>
    `;

    return html;
  };

  const handleSave = () => {
    onSave?.(blocks, name, subject);
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Block Palette */}
      <div className="w-64 border-r border-white/[0.08] bg-zinc-900/50 p-4 overflow-y-auto">
        <h3 className="text-sm font-medium text-white mb-4">Στοιχεία</h3>
        <div className="space-y-2">
          {blockTypes.map((blockType) => {
            const Icon = blockType.icon;
            return (
              <button
                key={blockType.type}
                onClick={() => addBlock(blockType.type, blockType.defaultContent)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] transition-colors text-left"
              >
                <Icon className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-white">{blockType.label}</span>
              </button>
            );
          })}
        </div>

        {/* Template Settings */}
        <div className="mt-6 pt-6 border-t border-white/[0.08]">
          <h3 className="text-sm font-medium text-white mb-4">Ρυθμίσεις Template</h3>
          <div className="space-y-3">
            <GlassInput
              label="Όνομα Template"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="π.χ. Newsletter Ιανουαρίου"
            />
            <GlassInput
              label="Θέμα Email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="π.χ. Οι νέες προσφορές μας"
            />
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <GlassButton
              variant={previewMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </GlassButton>
            <GlassButton
              variant={previewMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </GlassButton>
          </div>
          <div className="flex items-center gap-2">
            <GlassButton variant="default" size="sm" onClick={() => setPreviewOpen(true)} leftIcon={<Eye className="h-4 w-4" />}>
              Προεπισκόπηση
            </GlassButton>
            <GlassButton variant="primary" size="sm" onClick={handleSave} leftIcon={<Save className="h-4 w-4" />}>
              Αποθήκευση
            </GlassButton>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/30">
          <div
            className={`mx-auto bg-white rounded-lg shadow-xl overflow-hidden transition-all ${
              previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
            }`}
          >
            {blocks.length === 0 ? (
              <div className="p-12 text-center text-zinc-400">
                <Plus className="h-12 w-12 mx-auto mb-4" />
                <p>Προσθέστε στοιχεία από το sidebar</p>
              </div>
            ) : (
              blocks.map((block) => (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`relative group cursor-pointer ${
                    selectedBlockId === block.id ? 'ring-2 ring-cyan-500' : ''
                  }`}
                  style={{
                    textAlign: block.styles.align,
                    padding: block.styles.padding,
                    backgroundColor: block.styles.backgroundColor,
                    color: block.styles.textColor,
                  }}
                >
                  {/* Block Content */}
                  {block.type === 'heading' && (
                    <h1 className="text-2xl font-bold m-0 text-zinc-800">{block.content.text}</h1>
                  )}
                  {block.type === 'text' && (
                    <p className="text-base leading-relaxed m-0 text-zinc-600">{block.content.text}</p>
                  )}
                  {block.type === 'image' && (
                    block.content.src ? (
                      <img src={block.content.src} alt={block.content.alt} className="max-w-full h-auto" />
                    ) : (
                      <div className="h-32 bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <Image className="h-8 w-8" />
                      </div>
                    )
                  )}
                  {block.type === 'button' && (
                    <button className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium">
                      {block.content.text}
                    </button>
                  )}
                  {block.type === 'divider' && <hr className="border-t border-zinc-200 my-0" />}
                  {block.type === 'spacer' && <div style={{ height: block.content.height }} />}

                  {/* Block Actions (visible on hover) */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                      className="p-1 rounded bg-zinc-800/80 text-white hover:bg-zinc-700"
                    >
                      <MoveUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                      className="p-1 rounded bg-zinc-800/80 text-white hover:bg-zinc-700"
                    >
                      <MoveDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                      className="p-1 rounded bg-zinc-800/80 text-white hover:bg-zinc-700"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                      className="p-1 rounded bg-red-600/80 text-white hover:bg-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Block Settings */}
      {selectedBlock && (
        <div className="w-72 border-l border-white/[0.08] bg-zinc-900/50 p-4 overflow-y-auto">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Ρυθμίσεις Block
          </h3>

          <GlassTabs defaultValue="content">
            <GlassTabsList className="mb-4">
              <GlassTabsTrigger value="content">Περιεχόμενο</GlassTabsTrigger>
              <GlassTabsTrigger value="style">Στυλ</GlassTabsTrigger>
            </GlassTabsList>

            <GlassTabsContent value="content">
              {(selectedBlock.type === 'heading' || selectedBlock.type === 'text') && (
                <textarea
                  value={selectedBlock.content.text}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, {
                      content: { ...selectedBlock.content, text: e.target.value },
                    })
                  }
                  className="w-full h-32 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Εισάγετε κείμενο..."
                />
              )}

              {selectedBlock.type === 'image' && (
                <div className="space-y-3">
                  <GlassInput
                    label="URL Εικόνας"
                    value={selectedBlock.content.src}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, src: e.target.value },
                      })
                    }
                    placeholder="https://..."
                  />
                  <GlassInput
                    label="Alt Text"
                    value={selectedBlock.content.alt}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, alt: e.target.value },
                      })
                    }
                    placeholder="Περιγραφή εικόνας"
                  />
                </div>
              )}

              {selectedBlock.type === 'button' && (
                <div className="space-y-3">
                  <GlassInput
                    label="Κείμενο Κουμπιού"
                    value={selectedBlock.content.text}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, text: e.target.value },
                      })
                    }
                  />
                  <GlassInput
                    label="URL"
                    value={selectedBlock.content.url}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, url: e.target.value },
                      })
                    }
                    placeholder="https://..."
                  />
                </div>
              )}

              {selectedBlock.type === 'spacer' && (
                <GlassInput
                  label="Ύψος"
                  value={selectedBlock.content.height}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, {
                      content: { ...selectedBlock.content, height: e.target.value },
                    })
                  }
                  placeholder="π.χ. 20px"
                />
              )}
            </GlassTabsContent>

            <GlassTabsContent value="style">
              <div className="space-y-4">
                {/* Alignment */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Στοίχιση</label>
                  <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() =>
                          updateBlock(selectedBlock.id, {
                            styles: { ...selectedBlock.styles, align },
                          })
                        }
                        className={`flex-1 py-2 flex justify-center ${
                          selectedBlock.styles.align === align
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'text-white/60 hover:bg-white/[0.05]'
                        }`}
                      >
                        {align === 'left' && <AlignLeft className="h-4 w-4" />}
                        {align === 'center' && <AlignCenter className="h-4 w-4" />}
                        {align === 'right' && <AlignRight className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Padding */}
                <GlassInput
                  label="Padding"
                  value={selectedBlock.styles.padding || '16px'}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, {
                      styles: { ...selectedBlock.styles, padding: e.target.value },
                    })
                  }
                  placeholder="π.χ. 16px"
                />

                {/* Background Color */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Φόντο</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedBlock.styles.backgroundColor || '#ffffff'}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, {
                          styles: { ...selectedBlock.styles, backgroundColor: e.target.value },
                        })
                      }
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedBlock.styles.backgroundColor || 'transparent'}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, {
                          styles: { ...selectedBlock.styles, backgroundColor: e.target.value },
                        })
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm"
                    />
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Χρώμα Κειμένου</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedBlock.styles.textColor || '#333333'}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, {
                          styles: { ...selectedBlock.styles, textColor: e.target.value },
                        })
                      }
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedBlock.styles.textColor || '#333333'}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, {
                          styles: { ...selectedBlock.styles, textColor: e.target.value },
                        })
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </GlassTabsContent>
          </GlassTabs>
        </div>
      )}

      {/* Preview Modal */}
      <GlassModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Προεπισκόπηση Template"
        size="lg"
      >
        <div className="p-4">
          <iframe
            srcDoc={generateHTML()}
            className="w-full h-[500px] border-0 rounded-lg bg-white"
            title="Email Preview"
          />
        </div>
      </GlassModal>
    </div>
  );
}

