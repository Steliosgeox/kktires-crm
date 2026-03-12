'use client';

import {
  AlignLeft,
  Bold,
  ChevronDown,
  Eye,
  FileText,
  Image as ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  Paperclip,
  Sparkles,
  Underline,
  Variable,
} from 'lucide-react';

import { messagesEl } from '@/lib/i18n/ui/messages-el';

import type { EmailAiAction, OutlookEditorPopover, Template } from './types';

const VARIABLE_TAGS = [
  { tag: '{{firstName}}', label: 'First Name', icon: 'F' },
  { tag: '{{lastName}}', label: 'Last Name', icon: 'L' },
  { tag: '{{company}}', label: 'Company', icon: 'C' },
  { tag: '{{email}}', label: 'Email', icon: '@' },
  { tag: '{{city}}', label: 'City', icon: 'C' },
  { tag: '{{phone}}', label: 'Phone', icon: 'P' },
];

type OutlookEditorToolbarProps = {
  templates: Template[];
  activePopover: OutlookEditorPopover;
  showPreview: boolean;
  actionsLocked: boolean;
  aiLoading: boolean;
  linkUrl: string;
  content: string;
  uploadingImages: boolean;
  uploadingAttachments: boolean;
  onApplyEditorCommand: (command: string, value?: string) => void;
  onLinkUrlChange: (value: string) => void;
  onSubmitLink: () => void;
  onInsertImage: () => void;
  onInsertAttachment: () => void;
  onTogglePopover: (popover: Exclude<OutlookEditorPopover, 'none'>) => void;
  onApplyTemplate: (template: Template) => void;
  onInsertVariable: (tag: string) => void;
  onAiAction: (action: EmailAiAction) => void;
  onTogglePreview: () => void;
};

export function OutlookEditorToolbar({
  templates,
  activePopover,
  showPreview,
  actionsLocked,
  aiLoading,
  linkUrl,
  content,
  uploadingImages,
  uploadingAttachments,
  onApplyEditorCommand,
  onLinkUrlChange,
  onSubmitLink,
  onInsertImage,
  onInsertAttachment,
  onTogglePopover,
  onApplyTemplate,
  onInsertVariable,
  onAiAction,
  onTogglePreview,
}: OutlookEditorToolbarProps) {
  return (
    <div
      className="px-4 py-2 border-b flex items-center gap-1 flex-wrap"
      style={{
        borderColor: 'var(--outlook-border)',
        background: 'var(--outlook-bg-surface)',
      }}
    >
      <div
        className="flex items-center gap-0.5 pr-2 mr-2 border-r"
        style={{ borderColor: 'var(--outlook-border)' }}
      >
        <button
          type="button"
          onClick={() => onApplyEditorCommand('bold')}
          disabled={actionsLocked}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
          title="Bold"
          aria-label="Bold"
        >
          <Bold className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
        </button>
        <button
          type="button"
          onClick={() => onApplyEditorCommand('italic')}
          disabled={actionsLocked}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
          title="Italic"
          aria-label="Italic"
        >
          <Italic className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
        </button>
        <button
          type="button"
          onClick={() => onApplyEditorCommand('underline')}
          disabled={actionsLocked}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
          title="Underline"
          aria-label="Underline"
        >
          <Underline className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
        </button>
      </div>

      <div
        className="flex items-center gap-0.5 pr-2 mr-2 border-r"
        style={{ borderColor: 'var(--outlook-border)' }}
      >
        <button
          type="button"
          onClick={() => onApplyEditorCommand('insertUnorderedList')}
          disabled={actionsLocked}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
          title="Bullets"
          aria-label="Bullets"
        >
          <List className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
        </button>
        <button
          type="button"
          onClick={() => onApplyEditorCommand('insertOrderedList')}
          disabled={actionsLocked}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
          title="Numbered list"
          aria-label="Numbered list"
        >
          <ListOrdered className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
        </button>
        <button
          type="button"
          onClick={() => onApplyEditorCommand('justifyLeft')}
          disabled={actionsLocked}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
          title="Align left"
          aria-label="Align left"
        >
          <AlignLeft className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
        </button>
      </div>

      <div
        className="flex items-center gap-0.5 pr-2 mr-2 border-r"
        style={{ borderColor: 'var(--outlook-border)' }}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => onTogglePopover('link')}
            disabled={actionsLocked}
            className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
            title="Insert link"
            aria-label="Insert link"
          >
            <Link className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
          </button>
          {activePopover === 'link' && (
            <form
              className="absolute top-full left-0 mt-1 w-72 rounded-md shadow-lg z-20 outlook-animate-scale p-3 space-y-2"
              style={{
                background: 'var(--outlook-bg-panel)',
                border: '1px solid var(--outlook-border)',
              }}
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitLink();
              }}
            >
              <label
                htmlFor="outlook-link-url"
                className="block text-xs font-medium"
                style={{ color: 'var(--outlook-text-secondary)' }}
              >
                Insert link
              </label>
              <input
                id="outlook-link-url"
                type="url"
                value={linkUrl}
                onChange={(event) => onLinkUrlChange(event.target.value)}
                placeholder="https://example.com"
                className="w-full px-2 py-1.5 text-sm rounded-md outline-none"
                style={{
                  background: 'var(--outlook-bg-surface)',
                  border: '1px solid var(--outlook-border)',
                  color: 'var(--outlook-text-primary)',
                }}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onLinkUrlChange('');
                    onTogglePopover('link');
                  }}
                  className="px-2 py-1 text-xs rounded-md transition-all"
                  style={{
                    background: 'var(--outlook-bg-hover)',
                    color: 'var(--outlook-text-secondary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2 py-1 text-xs rounded-md transition-all"
                  style={{
                    background: 'var(--outlook-accent)',
                    color: 'white',
                  }}
                >
                  Apply
                </button>
              </div>
            </form>
          )}
        </div>
        <button
          type="button"
          onClick={onInsertImage}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
          title="Insert image"
          aria-label="Insert image"
          disabled={actionsLocked || uploadingImages}
        >
          <ImageIcon className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
        </button>
        <button
          type="button"
          onClick={onInsertAttachment}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
          title="Add attachment"
          aria-label="Add attachment"
          disabled={actionsLocked || uploadingAttachments}
        >
          <Paperclip className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
        </button>
      </div>

      <div className="relative">
        <button
          type="button"
          data-testid="templates-popover-button"
          onClick={() => onTogglePopover('templates')}
          disabled={actionsLocked}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
          style={{
            background:
              activePopover === 'templates'
                ? 'var(--outlook-accent-light)'
                : 'var(--outlook-bg-hover)',
            color:
              activePopover === 'templates'
                ? 'var(--outlook-accent)'
                : 'var(--outlook-text-secondary)',
            opacity: actionsLocked ? 0.6 : 1,
          }}
        >
          <FileText className="w-3 h-3" />
          {messagesEl.email.templates}
          <ChevronDown className="w-3 h-3" />
        </button>
        {activePopover === 'templates' && (
          <div
            className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto rounded-md shadow-lg z-20 outlook-animate-scale"
            style={{
              background: 'var(--outlook-bg-panel)',
              border: '1px solid var(--outlook-border)',
            }}
          >
            {templates.length === 0 ? (
              <div className="p-3 text-sm" style={{ color: 'var(--outlook-text-tertiary)' }}>
                No templates available
              </div>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  data-testid={`template-option-${template.id}`}
                  onClick={() => onApplyTemplate(template)}
                  className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--outlook-bg-hover)]"
                  style={{ color: 'var(--outlook-text-primary)' }}
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs" style={{ color: 'var(--outlook-text-tertiary)' }}>
                    {template.subject}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          data-testid="variables-popover-button"
          onClick={() => onTogglePopover('variables')}
          disabled={actionsLocked}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
          style={{
            background:
              activePopover === 'variables'
                ? 'var(--outlook-accent-light)'
                : 'var(--outlook-bg-hover)',
            color:
              activePopover === 'variables'
                ? 'var(--outlook-accent)'
                : 'var(--outlook-text-secondary)',
            opacity: actionsLocked ? 0.6 : 1,
          }}
        >
          <Variable className="w-3 h-3" />
          {messagesEl.email.variables}
          <ChevronDown className="w-3 h-3" />
        </button>
        {activePopover === 'variables' && (
          <div
            className="absolute top-full left-0 mt-1 w-48 rounded-md shadow-lg z-20 outlook-animate-scale"
            style={{
              background: 'var(--outlook-bg-panel)',
              border: '1px solid var(--outlook-border)',
            }}
          >
            {VARIABLE_TAGS.map((variable) => (
              <button
                key={variable.tag}
                type="button"
                data-testid={`variable-option-${variable.tag.replace(/[^a-zA-Z0-9]/g, '-')}`}
                onClick={() => onInsertVariable(variable.tag)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--outlook-bg-hover)]"
                style={{ color: 'var(--outlook-text-primary)' }}
              >
                <span
                  className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold"
                  style={{
                    background: 'var(--outlook-accent-light)',
                    color: 'var(--outlook-accent)',
                  }}
                >
                  {variable.icon}
                </span>
                {variable.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        data-testid="ai-improve-button"
        onClick={() => onAiAction('improve')}
        disabled={actionsLocked || aiLoading || !content}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all ml-auto"
        style={{
          background: 'linear-gradient(135deg, var(--outlook-accent) 0%, #8b5cf6 100%)',
          color: 'white',
          opacity: actionsLocked || aiLoading || !content ? 0.5 : 1,
        }}
      >
        <Sparkles className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
        {aiLoading ? 'AI...' : 'AI Improve'}
      </button>

      <button
        type="button"
        data-testid="preview-toggle-button"
        onClick={onTogglePreview}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
        style={{
          background: showPreview ? 'var(--outlook-accent-light)' : 'var(--outlook-bg-hover)',
          color: showPreview ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)',
        }}
      >
        <Eye className="w-3 h-3" />
        {messagesEl.email.preview}
      </button>
    </div>
  );
}
