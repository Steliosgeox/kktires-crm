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
  Paperclip,
  X,
} from 'lucide-react';
import { toast } from '@/lib/stores/ui-store';
import { sanitizeHtml } from '@/lib/html-sanitize';
import { type RecipientFilters } from '@/lib/email/recipient-filters';
import { messagesEl } from '@/lib/i18n/ui/messages-el';

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

type ImageAlign = 'left' | 'center' | 'right';

interface CampaignAttachment {
  assetId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobUrl: string;
}

interface InlineImageConfig {
  assetId: string;
  embedInline: boolean;
  widthPx: number | null;
  align: ImageAlign | null;
  alt: string | null;
  sortOrder: number;
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
  attachments: CampaignAttachment[];
  setAttachments: (attachments: CampaignAttachment[]) => void;
  inlineImages: InlineImageConfig[];
  setInlineImages: (images: InlineImageConfig[]) => void;
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
  { tag: '{{firstName}}', label: 'First Name', icon: 'F' },
  { tag: '{{lastName}}', label: 'Last Name', icon: 'L' },
  { tag: '{{company}}', label: 'Company', icon: 'C' },
  { tag: '{{email}}', label: 'Email', icon: '@' },
  { tag: '{{city}}', label: 'City', icon: 'C' },
  { tag: '{{phone}}', label: 'Phone', icon: 'P' },
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
  attachments,
  setAttachments,
  inlineImages,
  setInlineImages,
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
  const [selectedImageAssetId, setSelectedImageAssetId] = useState<string | null>(null);
  const [pendingReplaceAssetId, setPendingReplaceAssetId] = useState<string | null>(null);
  const [customWidth, setCustomWidth] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
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
    for (const image of inlineImages) {
      const element = Array.from(editor.querySelectorAll<HTMLImageElement>('img')).find(
        (img) => img.dataset.emailAssetId === image.assetId
      );
      if (!element) continue;
      element.style.height = 'auto';
      element.style.maxWidth = '100%';
      element.style.display = image.align ? 'block' : '';
      if (image.widthPx) {
        element.style.width = `${image.widthPx}px`;
        element.width = image.widthPx;
      }
      if (image.align === 'left') {
        element.style.marginLeft = '0';
        element.style.marginRight = 'auto';
      } else if (image.align === 'center') {
        element.style.marginLeft = 'auto';
        element.style.marginRight = 'auto';
      } else if (image.align === 'right') {
        element.style.marginLeft = 'auto';
        element.style.marginRight = '0';
      }
      if (image.alt != null) {
        element.alt = image.alt;
      }
    }
    lastAppliedRef.current.content = next;
  }, [campaignId, isNew, content, inlineImages]);

  const applyEditorCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    updateContentAndInlineRefs(editorRef.current.innerHTML);
  };

  const selectedImageConfig = selectedImageAssetId
    ? inlineImages.find((image) => image.assetId === selectedImageAssetId) || null
    : null;

  useEffect(() => {
    setCustomWidth(selectedImageConfig?.widthPx ? String(selectedImageConfig.widthPx) : '');
  }, [selectedImageConfig?.assetId, selectedImageConfig?.widthPx]);

  const updateContentAndInlineRefs = (html: string) => {
    setContent(html);
    const ids = new Set<string>();
    const regex = /<img\b[^>]*data-email-asset-id=(['"])([^'"]+)\1[^>]*>/gi;
    for (const match of html.matchAll(regex)) {
      const id = (match[2] || '').trim();
      if (id) ids.add(id);
    }

    const nextInline = inlineImages
      .filter((image) => ids.has(image.assetId))
      .map((image, index) => ({ ...image, sortOrder: index }));

    if (nextInline.length !== inlineImages.length) {
      setInlineImages(nextInline);
      if (selectedImageAssetId && !ids.has(selectedImageAssetId)) {
        setSelectedImageAssetId(null);
      }
    }
  };

  const uploadAsset = async (
    file: File,
    kind: 'image' | 'file',
    extra?: { width?: number; height?: number }
  ) => {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    if (extra?.width) form.append('width', String(extra.width));
    if (extra?.height) form.append('height', String(extra.height));

    const response = await fetch('/api/email/assets/upload', {
      method: 'POST',
      body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof payload?.error === 'string'
          ? payload.error
          : `Upload failed (${response.status} ${response.statusText})`;
      const code = typeof payload?.code === 'string' ? payload.code : null;
      const requestId = typeof payload?.requestId === 'string' ? payload.requestId : null;
      throw new Error([message, code ? `[${code}]` : null, requestId ? `requestId: ${requestId}` : null].filter(Boolean).join(' | '));
    }

    const asset = payload?.asset as {
      id: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      blobUrl: string;
      width?: number | null;
      height?: number | null;
    };

    if (!asset?.id || !asset?.blobUrl) {
      throw new Error('Upload response was invalid');
    }

    return asset;
  };

  const optimizeImageFile = async (
    file: File
  ): Promise<{ file: File; width: number | null; height: number | null }> => {
    if (file.type === 'image/gif') return { file, width: null, height: null };

    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return { file, width: bitmap.width, height: bitmap.height };
    }

    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const preferPng = file.type === 'image/png' && !/\.jpe?g$/i.test(file.name);
    const exportType = preferPng ? 'image/png' : 'image/webp';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, exportType, preferPng ? undefined : 0.82)
    );

    if (!blob) return { file, width: targetWidth, height: targetHeight };

    const ext = exportType === 'image/png' ? 'png' : 'webp';
    const base = file.name.replace(/\.[a-zA-Z0-9]+$/, '') || 'image';
    return {
      file: new File([blob], `${base}.${ext}`, { type: exportType }),
      width: targetWidth,
      height: targetHeight,
    };
  };

  const upsertInlineImageConfig = (config: InlineImageConfig) => {
    const exists = inlineImages.some((item) => item.assetId === config.assetId);
    if (!exists) {
      setInlineImages([...inlineImages, { ...config, sortOrder: inlineImages.length }]);
      return;
    }
    setInlineImages(
      inlineImages.map((item, index) =>
        item.assetId === config.assetId
          ? { ...item, ...config, sortOrder: index }
          : { ...item, sortOrder: index }
      )
    );
  };

  const handleInsertLink = () => {
    const raw = window.prompt('Enter URL');
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    applyEditorCommand('createLink', url);
  };

  const handleInsertImageClick = () => {
    setPendingReplaceAssetId(null);
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = '';
      return;
    }

    // Clear value after we have the file
    event.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error(
        'Invalid file type',
        'Please select an image (PNG, JPG, WEBP, GIF).'
      );
      return;
    }

    try {
      setUploadingImages(true);
      const optimized = await optimizeImageFile(file);
      const asset = await uploadAsset(optimized.file, 'image', {
        width: optimized.width ?? undefined,
        height: optimized.height ?? undefined,
      });

      if (!editorRef.current) return;
      editorRef.current.focus();

      if (pendingReplaceAssetId) {
        const existing = Array.from(editorRef.current.querySelectorAll<HTMLImageElement>('img')).find(
          (img) => img.dataset.emailAssetId === pendingReplaceAssetId
        );
        if (existing) {
          const currentConfig = inlineImages.find((item) => item.assetId === pendingReplaceAssetId);
          existing.src = asset.blobUrl;
          existing.dataset.emailAssetId = asset.id;
          const withoutOld = inlineImages
            .filter((item) => item.assetId !== pendingReplaceAssetId)
            .map((item, index) => ({ ...item, sortOrder: index }));
          const replacement: InlineImageConfig = {
            assetId: asset.id,
            embedInline: currentConfig?.embedInline ?? false,
            widthPx: currentConfig?.widthPx ?? null,
            align: currentConfig?.align ?? null,
            alt: currentConfig?.alt ?? (existing.alt || null),
            sortOrder: withoutOld.length,
          };
          setInlineImages([...withoutOld, replacement]);

          setSelectedImageAssetId(asset.id);
          updateContentAndInlineRefs(editorRef.current.innerHTML);
          return;
        }
      }

      document.execCommand(
        'insertHTML',
        false,
        `<img src="${asset.blobUrl}" data-email-asset-id="${asset.id}" alt="" style="max-width:100%;height:auto;" />`
      );
      upsertInlineImageConfig({
        assetId: asset.id,
        embedInline: false,
        widthPx: null,
        align: null,
        alt: null,
        sortOrder: inlineImages.length,
      });
      setSelectedImageAssetId(asset.id);
      updateContentAndInlineRefs(editorRef.current.innerHTML);
    } catch (error) {
      console.error('Image insert error:', error);
      toast.error(
        'Image insert failed',
        error instanceof Error ? error.message : 'Could not add image to email body.'
      );
    } finally {
      setUploadingImages(false);
      setPendingReplaceAssetId(null);
    }
  };

  const handleInsertAttachmentClick = () => {
    attachmentInputRef.current?.click();
  };

  const handleAttachmentSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    // Convert to array immediately to preserve file references
    const files = Array.from(fileList);

    // Clear input value to allow re-selecting same file
    event.target.value = '';

    try {
      setUploadingAttachments(true);
      const next = [...attachments];
      for (const file of files) {
        const asset = await uploadAsset(file, 'file');
        if (!next.some((item) => item.assetId === asset.id)) {
          next.push({
            assetId: asset.id,
            fileName: asset.fileName,
            mimeType: asset.mimeType,
            sizeBytes: Number(asset.sizeBytes || 0),
            blobUrl: asset.blobUrl,
          });
        }
      }
      setAttachments(next);
    } catch (error) {
      toast.error(
        'Attachment upload failed',
        error instanceof Error ? error.message : 'Could not attach file.'
      );
    } finally {
      setUploadingAttachments(false);
    }
  };

  const handleApplyTemplate = (template: Template) => {
    setCampaignName(template.name);
    setSubject(template.subject);
    if (template.content) {
      const sanitized = sanitizeHtml(template.content);
      updateContentAndInlineRefs(sanitized);
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
        updateContentAndInlineRefs(editorRef.current.innerHTML);
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
          body: JSON.stringify({ briefNote: currentContent, customer: { firstName: 'Customer' } }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.generatedText) {
            const sanitized = sanitizeHtml(String(data.generatedText));
            updateContentAndInlineRefs(sanitized);
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
            updateContentAndInlineRefs(sanitized);
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

  useEffect(() => {
    if (!selectedImageAssetId || !editorRef.current) return;
    const config = inlineImages.find((image) => image.assetId === selectedImageAssetId);
    if (!config) return;

    const element = Array.from(editorRef.current.querySelectorAll<HTMLImageElement>('img')).find(
      (img) => img.dataset.emailAssetId === selectedImageAssetId
    );
    if (!element) return;

    element.style.height = 'auto';
    element.style.maxWidth = '100%';
    element.style.display = config.align ? 'block' : '';

    if (config.widthPx) {
      element.style.width = `${config.widthPx}px`;
      element.width = config.widthPx;
    } else {
      element.style.removeProperty('width');
      element.removeAttribute('width');
    }

    if (config.align === 'left') {
      element.style.marginLeft = '0';
      element.style.marginRight = 'auto';
    } else if (config.align === 'center') {
      element.style.marginLeft = 'auto';
      element.style.marginRight = 'auto';
    } else if (config.align === 'right') {
      element.style.marginLeft = 'auto';
      element.style.marginRight = '0';
    } else {
      element.style.marginLeft = '';
      element.style.marginRight = '';
    }

    element.alt = config.alt || '';
    updateContentAndInlineRefs(editorRef.current.innerHTML);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImageConfig?.widthPx, selectedImageConfig?.align, selectedImageConfig?.alt]);

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
            {isNew ? messagesEl.email.newCampaign : messagesEl.email.editCampaign}
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
            {messagesEl.common.cancel}
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
            {saving ? 'Αποθήκευση...' : messagesEl.common.save}
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
            {messagesEl.email.schedule}
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
            {sending ? messagesEl.email.sending : messagesEl.email.sendNow}
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
                  toast.warning('Απαιτείται ημερομηνία/ώρα', 'Επιλέξτε ημερομηνία και ώρα.');
                  return;
                }

                const dt = new Date(`${scheduleDate}T${scheduleTime}:00`);
                if (isNaN(dt.getTime())) {
                  toast.error('Μη έγκυρη ημερομηνία/ώρα', 'Ελέγξτε τα πεδία και δοκιμάστε ξανά.');
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
              Επιβεβαίωση Προγραμματισμού
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
                {messagesEl.email.name}:
              </span>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Όνομα καμπάνιας..."
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
                {messagesEl.email.to}:
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
                    {messagesEl.common.cities}: {city}
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
                    {messagesEl.common.tags}: {tag}
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
                    {messagesEl.common.segments}: {segment}
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
                {recipientFilters.customerIds.length > 0 && (
                  <span
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{
                      background: 'var(--outlook-info-bg)',
                      color: 'var(--outlook-info)',
                    }}
                  >
                    {messagesEl.common.customers}: {recipientFilters.customerIds.length}
                    <button
                      onClick={() =>
                        setRecipientFilters({
                          ...recipientFilters,
                          customerIds: [],
                        })
                      }
                      className="hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                )}
                {recipientFilters.rawEmails.map((email) => (
                  <span
                    key={email}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{
                      background: 'var(--outlook-bg-hover)',
                      color: 'var(--outlook-text-secondary)',
                    }}
                  >
                    {email}
                    <button
                      onClick={() =>
                        setRecipientFilters({
                          ...recipientFilters,
                          rawEmails: recipientFilters.rawEmails.filter((entry) => entry !== email),
                        })
                      }
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
                  {messagesEl.email.addRecipients}
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
                {messagesEl.email.subject}:
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
                AI Subject
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
                disabled={uploadingImages}
              >
                <ImageIcon className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
              </button>
              <button
                type="button"
                onClick={handleInsertAttachmentClick}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
                title="Add attachment"
                disabled={uploadingAttachments}
              >
                <Paperclip className="w-4 h-4" style={{ color: 'var(--outlook-text-secondary)' }} />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleImageSelected}
              />
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachmentSelected}
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
                {messagesEl.email.templates}
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
                {messagesEl.email.variables}
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
              {aiLoading ? 'AI...' : 'AI Improve'}
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
              {messagesEl.email.preview}
            </button>
          </div>

          {selectedImageConfig && (
            <div
              className="px-4 py-2 border-b flex flex-wrap items-center gap-2"
              style={{ borderColor: 'var(--outlook-border)' }}
            >
              <span className="text-xs" style={{ color: 'var(--outlook-text-secondary)' }}>
                Εικόνα:
              </span>
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    const editorWidth = Math.max(320, editorRef.current?.clientWidth || 800);
                    const width = Math.round((editorWidth * pct) / 100);
                    setInlineImages(
                      inlineImages.map((item, index) =>
                        item.assetId === selectedImageConfig.assetId
                          ? { ...item, widthPx: width, sortOrder: index }
                          : { ...item, sortOrder: index }
                      )
                    );
                  }}
                  className="px-2 py-1 text-xs rounded-md"
                  style={{ background: 'var(--outlook-bg-hover)', color: 'var(--outlook-text-primary)' }}
                >
                  {pct}%
                </button>
              ))}
              <input
                type="number"
                min={32}
                max={2400}
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                onBlur={() => {
                  if (!selectedImageConfig) return;
                  const parsed = Number.parseInt(customWidth, 10);
                  const width = Number.isFinite(parsed) ? Math.max(32, Math.min(2400, parsed)) : null;
                  setInlineImages(
                    inlineImages.map((item, index) =>
                      item.assetId === selectedImageConfig.assetId
                        ? { ...item, widthPx: width, sortOrder: index }
                        : { ...item, sortOrder: index }
                    )
                  );
                }}
                placeholder="px"
                className="w-20 px-2 py-1 text-xs rounded-md"
                style={{ background: 'var(--outlook-bg-surface)', border: '1px solid var(--outlook-border)' }}
              />
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => {
                    if (!selectedImageConfig) return;
                    setInlineImages(
                      inlineImages.map((item, index) =>
                        item.assetId === selectedImageConfig.assetId
                          ? { ...item, align, sortOrder: index }
                          : { ...item, sortOrder: index }
                      )
                    );
                  }}
                  className="px-2 py-1 text-xs rounded-md"
                  style={{
                    background:
                      selectedImageConfig.align === align
                        ? 'var(--outlook-accent-light)'
                        : 'var(--outlook-bg-hover)',
                    color:
                      selectedImageConfig.align === align
                        ? 'var(--outlook-accent)'
                        : 'var(--outlook-text-primary)',
                  }}
                >
                  {align}
                </button>
              ))}
              <input
                type="text"
                value={selectedImageConfig.alt || ''}
                onChange={(e) => {
                  if (!selectedImageConfig) return;
                  const alt = e.target.value.trim();
                  setInlineImages(
                    inlineImages.map((item, index) =>
                      item.assetId === selectedImageConfig.assetId
                        ? { ...item, alt: alt || null, sortOrder: index }
                        : { ...item, sortOrder: index }
                    )
                  );
                }}
                placeholder="Εναλλακτικό κείμενο"
                className="px-2 py-1 text-xs rounded-md"
                style={{ background: 'var(--outlook-bg-surface)', border: '1px solid var(--outlook-border)' }}
              />
              <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--outlook-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={selectedImageConfig.embedInline}
                  onChange={(e) => {
                    if (!selectedImageConfig) return;
                    const checked = e.target.checked;
                    setInlineImages(
                      inlineImages.map((item, index) =>
                        item.assetId === selectedImageConfig.assetId
                          ? { ...item, embedInline: checked, sortOrder: index }
                          : { ...item, sortOrder: index }
                      )
                    );
                  }}
                />
                Ενσωμάτωση inline (CID)
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!selectedImageAssetId) return;
                  setPendingReplaceAssetId(selectedImageAssetId);
                  imageInputRef.current?.click();
                }}
                className="px-2 py-1 text-xs rounded-md"
                style={{ background: 'var(--outlook-bg-hover)', color: 'var(--outlook-text-primary)' }}
              >
                Αντικατάσταση
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedImageAssetId || !editorRef.current) return;
                  const editor = editorRef.current;
                  const element = Array.from(editor.querySelectorAll<HTMLImageElement>('img')).find(
                    (img) => img.dataset.emailAssetId === selectedImageAssetId
                  );
                  element?.remove();
                  setInlineImages(
                    inlineImages
                      .filter((item) => item.assetId !== selectedImageAssetId)
                      .map((item, index) => ({ ...item, sortOrder: index }))
                  );
                  setSelectedImageAssetId(null);
                  updateContentAndInlineRefs(editor.innerHTML);
                }}
                className="px-2 py-1 text-xs rounded-md"
                style={{ background: 'var(--outlook-error-bg)', color: 'var(--outlook-error)' }}
              >
                Αφαίρεση
              </button>
            </div>
          )}

          {attachments.length > 0 && (
            <div
              className="px-4 py-2 border-b flex flex-wrap gap-2"
              style={{ borderColor: 'var(--outlook-border)' }}
            >
              {attachments.map((attachment) => (
                <span
                  key={attachment.assetId}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs"
                  style={{ background: 'var(--outlook-bg-hover)', color: 'var(--outlook-text-primary)' }}
                >
                  <Paperclip className="w-3 h-3" />
                  {attachment.fileName}
                  <span style={{ color: 'var(--outlook-text-tertiary)' }}>
                    {attachment.sizeBytes < 1024
                      ? `${attachment.sizeBytes} B`
                      : attachment.sizeBytes < 1024 * 1024
                        ? `${(attachment.sizeBytes / 1024).toFixed(1)} KB`
                        : `${(attachment.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments(attachments.filter((item) => item.assetId !== attachment.assetId))
                    }
                    className="hover:opacity-70"
                    aria-label={`Remove ${attachment.fileName}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

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
                onInput={(e) => updateContentAndInlineRefs(e.currentTarget.innerHTML)}
                onClick={(e) => {
                  const target = e.target as HTMLElement | null;
                  if (!target) return;
                  const img = target.closest('img');
                  const assetId = img instanceof HTMLImageElement ? img.dataset.emailAssetId || null : null;
                  setSelectedImageAssetId(assetId);
                }}
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
                {messagesEl.email.signature}:
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
                <option value="">{messagesEl.email.noSignature}</option>
                {signatures.map((sig) => (
                  <option key={sig.id} value={sig.id}>
                    {sig.name} {sig.isDefault ? '(Default)' : ''}
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

