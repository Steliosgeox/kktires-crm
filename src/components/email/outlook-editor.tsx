'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  Send,
  Clock,
  ChevronDown,
  Sparkles,
  FileText,
  Plus,
  Monitor,
  Smartphone,
  Moon,
  Eye,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image as ImageIcon,
  AlignLeft,
  Variable,
  Save,
} from 'lucide-react';
import { toast } from '@/lib/stores/ui-store';
import { sanitizeHtml } from '@/lib/html-sanitize';

interface Template {
  id: string;
  name: string;
  subject: string;
  content?: string;
  category: string;
}

interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

interface RecipientFilters {
  cities: string[];
  tags: string[];
  segments: string[];
  categories: string[];
}

interface OutlookEditorProps {
  campaignId?: string | null;
  campaignName: string;
  setCampaignName: (name: string) => void;
  subject: string;
  setSubject: (subject: string) => void;
  content: string;
  setContent: (content: string) => void;
  recipientFilters: RecipientFilters;
  setRecipientFilters: (filters: RecipientFilters) => void;
  templates: Template[];
  signatures: Signature[];
  selectedSignature: string | null;
  setSelectedSignature: (id: string | null) => void;
  onSave: (sendNow: boolean) => void;
  onSchedule: (runAtIso: string) => void;
  onCancel: () => void;
  onOpenRecipients: () => void;
  saving: boolean;
  sending: boolean;
  isNew: boolean;
  recipientCount?: number;
}

const variableTags = [
  { tag: '{{firstName}}', label: 'Όνομα', icon: 'Ο' },
  { tag: '{{lastName}}', label: 'Επώνυμο', icon: 'Ε' },
  { tag: '{{company}}', label: 'Εταιρεία', icon: 'Ε' },
  { tag: '{{email}}', label: 'Email', icon: '@' },
  { tag: '{{city}}', label: 'Πόλη', icon: 'Π' },
  { tag: '{{phone}}', label: 'Τηλέφωνο', icon: 'Τ' },
];

export function OutlookEditor({
  campaignId,
  campaignName,
  setCampaignName,
  subject,
  setSubject,
  content,
  setContent,
  recipientFilters,
  setRecipientFilters,
  templates,
  signatures,
  selectedSignature,
  setSelectedSignature,
  onSave,
  onSchedule,
  onCancel,
  onOpenRecipients,
  saving,
  sending,
  isNew,
  recipientCount,
}: OutlookEditorProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'dark'>('desktop');
  const [showPreview, setShowPreview] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastAppliedRef = useRef<{ key: string; content: string } | null>(null);

  const totalRecipients = recipientCount ?? 0;
  const hasRecipients = totalRecipients > 0;

  // Keep the contentEditable in sync when switching campaigns (without clobbering user typing).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const key = `${campaignId ?? 'new'}:${isNew ? 'new' : 'existing'}`;
    const isFocused = editor.contains(document.activeElement);

    // When changing campaigns/new state, clear immediately to avoid showing stale content.
    if (!lastAppliedRef.current || lastAppliedRef.current.key !== key) {
      lastAppliedRef.current = { key, content: '' };
      if (!isFocused) editor.innerHTML = '';
      return;
    }

    // Apply new content only if we're not actively editing.
    const next = sanitizeHtml(content || '');
    if (isFocused) return;
    if (lastAppliedRef.current.content === next) return;

    editor.innerHTML = next;
    lastAppliedRef.current.content = next;
  }, [campaignId, isNew, content]);

  const applyEditorCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setContent(editorRef.current.innerHTML);
  };

  const handleInsertLink = () => {
    const raw = window.prompt('Εισάγετε URL');
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    applyEditorCommand('createLink', url);
  };

  const handleInsertImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(
        'Μη έγκυρος τύπος αρχείου',
        'Επιλέξτε εικόνα (PNG, JPG, WEBP ή GIF).'
      );
      return;
    }

    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxBytes) {
      toast.warning(
        'Η εικόνα είναι πολύ μεγάλη',
        'Χρησιμοποιήστε εικόνα έως 2MB για σταθερή αποθήκευση campaign.'
      );
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });

      if (!editorRef.current) return;
      editorRef.current.focus();
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${dataUrl}" alt="" style="max-width:100%;height:auto;" />`
      );
      setContent(editorRef.current.innerHTML);
    } catch (error) {
      console.error('Image insert error:', error);
      toast.error(
        'Αποτυχία εισαγωγής εικόνας',
        'Η εικόνα δεν μπόρεσε να προστεθεί στο email.'
      );
    }
  };

  const handleApplyTemplate = (template: Template) => {
    setCampaignName(template.name);
    setSubject(template.subject);
    if (template.content) {
      const sanitized = sanitizeHtml(template.content);
      setContent(sanitized);
      if (editorRef.current) {
        editorRef.current.innerHTML = sanitized;
      }
    }
    setShowTemplates(false);
  };

  const handleInsertVariable = (tag: string) => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(tag);
        range.insertNode(textNode);
        range.collapse(false);
        // Update content state
        setContent(editorRef.current.innerHTML);
      }
    }
    setShowVariables(false);
  };

  const handleAiAssist = async (action: 'improve' | 'expand' | 'subjects') => {
    setAiLoading(true);
    try {
      const currentContent = editorRef.current?.innerHTML || content;

      if (action === 'expand') {
        const response = await fetch('/api/ai/email-expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ briefNote: currentContent, customer: { firstName: 'Πελάτη' } }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.generatedText) {
            const sanitized = sanitizeHtml(String(data.generatedText));
            setContent(sanitized);
            if (editorRef.current) {
              editorRef.current.innerHTML = sanitized;
            }
          }
        }
      } else if (action === 'improve') {
        const response = await fetch('/api/ai/email-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: currentContent, language: 'el', tone: 'professional' }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.improved) {
            const sanitized = sanitizeHtml(String(data.improved));
            setContent(sanitized);
            if (editorRef.current) {
              editorRef.current.innerHTML = sanitized;
            }
          }
        }
      } else if (action === 'subjects') {
        const response = await fetch('/api/ai/email-subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailContent: currentContent, count: 5 }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.suggestions?.length > 0) {
            setSubject(data.suggestions[0]);
          }
        }
      }
    } catch (error) {
      console.error('AI assist error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: 'var(--outlook-bg-surface)' }}
    >
      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: 'var(--outlook-bg-panel)',
          borderColor: 'var(--outlook-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--outlook-text-primary)' }}
          >
            {isNew ? 'Νέο Campaign' : 'Επεξεργασία'}
          </h2>
          {!isNew && campaignId && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--outlook-bg-hover)',
                color: 'var(--outlook-text-tertiary)',
              }}
            >
              ID: {campaignId.slice(0, 8)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md transition-all"
            style={{
              color: 'var(--outlook-text-secondary)',
              background: 'var(--outlook-bg-hover)',
            }}
          >
            Ακύρωση
          </button>
          <button
            onClick={() => onSave(false)}
            disabled={saving || sending}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all"
            style={{
              background: 'var(--outlook-bg-hover)',
              color: 'var(--outlook-text-primary)',
            }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all"
            style={{
              background: 'var(--outlook-accent-light)',
              color: 'var(--outlook-accent)',
            }}
          >
            <Clock className="w-4 h-4" />
            Προγραμματισμός
          </button>
          <button
            onClick={() => onSave(true)}
            disabled={saving || sending || !hasRecipients}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all"
            style={{
              background: hasRecipients ? 'var(--outlook-accent)' : 'var(--outlook-text-tertiary)',
              color: 'white',
              opacity: (saving || sending || !hasRecipients) ? 0.6 : 1,
            }}
          >
            <Send className="w-4 h-4" />
            {sending ? 'Αποστολή...' : 'Αποστολή Τώρα'}
          </button>
        </div>
      </div>

      {/* Schedule Dropdown */}
      {showSchedule && (
        <div
          className="p-4 border-b outlook-animate-fade"
          style={{
            background: 'var(--outlook-bg-panel)',
            borderColor: 'var(--outlook-border)',
          }}
        >
          <div className="flex items-end gap-4">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--outlook-text-secondary)' }}
              >
                Ημερομηνία
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-md"
                style={{
                  background: 'var(--outlook-bg-surface)',
                  border: '1px solid var(--outlook-border)',
                  color: 'var(--outlook-text-primary)',
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--outlook-text-secondary)' }}
              >
                Ώρα
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="px-3 py-2 text-sm rounded-md"
                style={{
                  background: 'var(--outlook-bg-surface)',
                  border: '1px solid var(--outlook-border)',
                  color: 'var(--outlook-text-primary)',
                }}
              />
            </div>
            <button
              onClick={() => {
                if (!scheduleDate || !scheduleTime) {
                  toast.warning('Χρειάζεται ημερομηνία/ώρα', 'Επιλέξτε ημερομηνία και ώρα');
                  return;
                }

                const dt = new Date(`${scheduleDate}T${scheduleTime}:00`);
                if (isNaN(dt.getTime())) {
                  toast.error('Μη έγκυρη ημερομηνία/ώρα', 'Ελέγξτε την ημερομηνία και την ώρα και δοκιμάστε ξανά.');
                  return;
                }

                onSchedule(dt.toISOString());
                setShowSchedule(false);
              }}
              disabled={saving || sending || !hasRecipients}
              className="px-4 py-2 text-sm rounded-md"
              style={{
                background: 'var(--outlook-accent)',
                color: 'white',
                opacity: (saving || sending || !hasRecipients) ? 0.6 : 1,
              }}
            >
              Προγραμματισμός
            </button>
          </div>
        </div>
      )}

      {/* Composer Content */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar p-4">
        <div
          className="max-w-4xl mx-auto rounded-lg overflow-hidden"
          style={{
            background: 'var(--outlook-bg-panel)',
            border: '1px solid var(--outlook-border)',
            boxShadow: 'var(--outlook-shadow-md)',
          }}
        >
          {/* Campaign Name */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--outlook-border)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium w-20"
                style={{ color: 'var(--outlook-text-secondary)' }}
              >
                Όνομα:
              </span>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Όνομα campaign..."
                className="flex-1 text-sm bg-transparent border-none outline-none"
                style={{ color: 'var(--outlook-text-primary)' }}
              />
            </div>
          </div>

          {/* Recipients Bar */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--outlook-border)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium w-20"
                style={{ color: 'var(--outlook-text-secondary)' }}
              >
                Προς:
              </span>
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                {recipientFilters.cities.map((city) => (
                  <span
                    key={city}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{
                      background: 'var(--outlook-accent-light)',
                      color: 'var(--outlook-accent)',
                    }}
                  >
                    📍 {city}
                    <button
                      onClick={() => setRecipientFilters({
                        ...recipientFilters,
                        cities: recipientFilters.cities.filter((c) => c !== city),
                      })}
                      className="hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {recipientFilters.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{
                      background: 'var(--outlook-success-bg)',
                      color: 'var(--outlook-success)',
                    }}
                  >
                    🏷️ {tag}
                    <button
                      onClick={() => setRecipientFilters({
                        ...recipientFilters,
                        tags: recipientFilters.tags.filter((t) => t !== tag),
                      })}
                      className="hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {recipientFilters.segments.map((segment) => (
                  <span
                    key={segment}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{
                      background: 'var(--outlook-warning-bg)',
                      color: 'var(--outlook-warning)',
                    }}
                  >
                    👥 {segment}
                    <button
                      onClick={() => setRecipientFilters({
                        ...recipientFilters,
                        segments: recipientFilters.segments.filter((s) => s !== segment),
                      })}
                      className="hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  onClick={onOpenRecipients}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
                  style={{
                    background: 'var(--outlook-bg-hover)',
                    color: 'var(--outlook-text-secondary)',
                  }}
                >
                  <Plus className="w-3 h-3" />
                  Προσθήκη παραληπτών
                </button>
              </div>
              {totalRecipients > 0 && (
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    background: 'var(--outlook-accent)',
                    color: 'white',
                  }}
                >
                  {totalRecipients} παραλήπτες
                </span>
              )}
            </div>
          </div>

          {/* Subject Line */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--outlook-border)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium w-20"
                style={{ color: 'var(--outlook-text-secondary)' }}
              >
                Θέμα:
              </span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Θέμα email..."
                className="flex-1 text-sm bg-transparent border-none outline-none"
                style={{ color: 'var(--outlook-text-primary)' }}
              />
              <button
                onClick={() => handleAiAssist('subjects')}
                disabled={aiLoading || !content}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
                style={{
                  background: 'var(--outlook-accent-light)',
                  color: 'var(--outlook-accent)',
                  opacity: (aiLoading || !content) ? 0.5 : 1,
                }}
              >
                <Sparkles className="w-3 h-3" />
                AI Θέμα
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div
            className="px-4 py-2 border-b flex items-center gap-1 flex-wrap"
            style={{
              borderColor: 'var(--outlook-border)',
              background: 'var(--outlook-bg-surface)',
            }}
          >
            {/* Format Buttons */}
            <div className="flex items-center gap-0.5 pr-2 mr-2 border-r" style={{ borderColor: 'var(--outlook-border)' }}>
              <button
                type="button"
                onClick={() => applyEditorCommand('bold')}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
                title="Bold"
              >
                <Bold className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
              </button>
              <button
                type="button"
                onClick={() => applyEditorCommand('italic')}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
                title="Italic"
              >
                <Italic className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
              </button>
              <button
                type="button"
                onClick={() => applyEditorCommand('underline')}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
                title="Underline"
              >
                <Underline className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
              </button>
            </div>

            <div className="flex items-center gap-0.5 pr-2 mr-2 border-r" style={{ borderColor: 'var(--outlook-border)' }}>
              <button
                type="button"
                onClick={() => applyEditorCommand('insertUnorderedList')}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
                title="Bullets"
              >
                <List className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
              </button>
              <button
                type="button"
                onClick={() => applyEditorCommand('insertOrderedList')}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
                title="Numbered list"
              >
                <ListOrdered className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
              </button>
              <button
                type="button"
                onClick={() => applyEditorCommand('justifyLeft')}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
                title="Align left"
              >
                <AlignLeft className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
              </button>
            </div>

            <div className="flex items-center gap-0.5 pr-2 mr-2 border-r" style={{ borderColor: 'var(--outlook-border)' }}>
              <button
                type="button"
                onClick={handleInsertLink}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
                title="Insert link"
              >
                <Link className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
              </button>
              <button
                type="button"
                onClick={handleInsertImageClick}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
                title="Insert image"
              >
                <ImageIcon className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleImageSelected}
              />
            </div>

            {/* Templates Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
                style={{
                  background: showTemplates ? 'var(--outlook-accent-light)' : 'var(--outlook-bg-hover)',
                  color: showTemplates ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)',
                }}
              >
                <FileText className="w-3 h-3" />
                Templates
                <ChevronDown className="w-3 h-3" />
              </button>
              {showTemplates && (
                <div
                  className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto rounded-md shadow-lg z-20 outlook-animate-scale"
                  style={{
                    background: 'var(--outlook-bg-panel)',
                    border: '1px solid var(--outlook-border)',
                  }}
                >
                  {templates.length === 0 ? (
                    <div className="p-3 text-sm" style={{ color: 'var(--outlook-text-tertiary)' }}>
                      Δεν υπάρχουν templates
                    </div>
                  ) : (
                    templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleApplyTemplate(template)}
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

            {/* Variables Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowVariables(!showVariables)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
                style={{
                  background: showVariables ? 'var(--outlook-accent-light)' : 'var(--outlook-bg-hover)',
                  color: showVariables ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)',
                }}
              >
                <Variable className="w-3 h-3" />
                Μεταβλητές
                <ChevronDown className="w-3 h-3" />
              </button>
              {showVariables && (
                <div
                  className="absolute top-full left-0 mt-1 w-48 rounded-md shadow-lg z-20 outlook-animate-scale"
                  style={{
                    background: 'var(--outlook-bg-panel)',
                    border: '1px solid var(--outlook-border)',
                  }}
                >
                  {variableTags.map((variable) => (
                    <button
                      key={variable.tag}
                      onClick={() => handleInsertVariable(variable.tag)}
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

            {/* AI Assistant */}
            <button
              onClick={() => handleAiAssist('improve')}
              disabled={aiLoading || !content}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all ml-auto"
              style={{
                background: 'linear-gradient(135deg, var(--outlook-accent) 0%, #8b5cf6 100%)',
                color: 'white',
                opacity: (aiLoading || !content) ? 0.5 : 1,
              }}
            >
              <Sparkles className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
              {aiLoading ? 'AI...' : 'AI Βελτίωση'}
            </button>

            {/* Preview Toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
              style={{
                background: showPreview ? 'var(--outlook-accent-light)' : 'var(--outlook-bg-hover)',
                color: showPreview ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)',
              }}
            >
              <Eye className="w-3 h-3" />
              Προεπισκόπηση
            </button>
          </div>

          {/* Preview Mode Selector */}
          {showPreview && (
            <div
              className="px-4 py-2 border-b flex items-center gap-2"
              style={{
                borderColor: 'var(--outlook-border)',
                background: 'var(--outlook-bg-surface)',
              }}
            >
              <span className="text-xs" style={{ color: 'var(--outlook-text-tertiary)' }}>
                Προβολή:
              </span>
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded-md transition-all ${previewMode === 'desktop' ? 'bg-[var(--outlook-accent-light)]' : ''}`}
                style={{ color: previewMode === 'desktop' ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)' }}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded-md transition-all ${previewMode === 'mobile' ? 'bg-[var(--outlook-accent-light)]' : ''}`}
                style={{ color: previewMode === 'mobile' ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)' }}
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('dark')}
                className={`p-1.5 rounded-md transition-all ${previewMode === 'dark' ? 'bg-[var(--outlook-accent-light)]' : ''}`}
                style={{ color: previewMode === 'dark' ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)' }}
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Content Editor */}
          <div
            className="min-h-[400px] p-4"
            style={{
              background: showPreview && previewMode === 'dark' ? '#1a1a1a' : 'var(--outlook-bg-panel)',
            }}
          >
            {showPreview ? (
              <div
                className={`mx-auto transition-all ${previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`}
                style={{
                  background: previewMode === 'dark' ? '#2a2a2a' : 'white',
                  color: previewMode === 'dark' ? 'white' : 'black',
                  padding: '20px',
                  borderRadius: '8px',
                  boxShadow: 'var(--outlook-shadow-md)',
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      content || '<p style="color: #999;">Δεν υπάρχει περιεχόμενο...</p>'
                    ),
                  }}
                />
              </div>
            ) : (
              <div
                ref={editorRef}
                contentEditable
                dir="ltr"
                className="min-h-[300px] outline-none prose prose-sm max-w-none"
                style={{
                  color: 'var(--outlook-text-primary)',
                  direction: 'ltr',
                  textAlign: 'left',
                }}
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                data-placeholder="Γράψτε το μήνυμά σας εδώ..."
                suppressContentEditableWarning
              />
            )}
          </div>

          {/* Signatures */}
          <div
            className="px-4 py-3 border-t"
            style={{ borderColor: 'var(--outlook-border)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-xs"
                style={{ color: 'var(--outlook-text-tertiary)' }}
              >
                Υπογραφή:
              </span>
              <select
                value={selectedSignature || ''}
                onChange={(e) => setSelectedSignature(e.target.value || null)}
                className="text-sm px-2 py-1 rounded-md"
                style={{
                  background: 'var(--outlook-bg-surface)',
                  border: '1px solid var(--outlook-border)',
                  color: 'var(--outlook-text-primary)',
                }}
              >
                <option value="">Χωρίς υπογραφή</option>
                {signatures.map((sig) => (
                  <option key={sig.id} value={sig.id}>
                    {sig.name} {sig.isDefault ? '(Προεπιλογή)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
