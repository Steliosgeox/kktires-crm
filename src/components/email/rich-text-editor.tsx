'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Wand2, ListChecks, Loader2, Bold, Italic, List, Link as LinkIcon } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassDropdown } from '@/components/ui/glass-dropdown';
import { toast } from '@/lib/stores/ui-store';

interface RichTextEmailEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  customerContext?: {
    firstName: string;
    lastName?: string;
    company?: string;
    email?: string;
  };
  onSubjectSuggestions?: (suggestions: string[]) => void;
}

export function RichTextEmailEditor({
  value,
  onChange,
  placeholder = 'Γράψτε το μήνυμά σας εδώ...',
  minHeight = '400px',
  customerContext,
  onSubjectSuggestions,
}: RichTextEmailEditorProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize editor content only once
  useEffect(() => {
    if (editorRef.current && value && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Merge tags available for insertion
  const mergeTags = [
    { tag: '{{firstName}}', label: 'Όνομα' },
    { tag: '{{lastName}}', label: 'Επώνυμο' },
    { tag: '{{company}}', label: 'Εταιρεία' },
    { tag: '{{email}}', label: 'Email' },
    { tag: '{{city}}', label: 'Πόλη' },
    { tag: '{{phone}}', label: 'Τηλέφωνο' },
  ];

  // Insert merge tag at cursor position
  const insertMergeTag = (tag: string) => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const tagNode = document.createTextNode(tag);
        range.insertNode(tagNode);
        range.collapse(false);
        // Update the value
        onChange(editorRef.current.innerHTML);
      }
    }
  };

  // Execute formatting command
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // AI: Expand brief note to full email using Meltemi
  const handleAiExpand = async () => {
    const textContent = editorRef.current?.innerText || value;
    if (!textContent.trim()) {
      toast.warning('Χρειάζεται περιεχόμενο', 'Γράψτε πρώτα μια σύντομη σημείωση για να επεκταθεί');
      return;
    }

    setAiLoading(true);
    setAiAction('expand');

    try {
      const response = await fetch('/api/ai/email-expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefNote: textContent,
          customer: customerContext || { firstName: 'Πελάτη' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.generatedText) {
          onChange(data.generatedText.replace(/\n/g, '<br>'));
          if (editorRef.current) {
            editorRef.current.innerHTML = data.generatedText.replace(/\n/g, '<br>');
          }
        }
      }
    } catch (error) {
      console.error('AI expand error:', error);
    } finally {
      setAiLoading(false);
      setAiAction(null);
    }
  };

  // AI: Improve existing content
  const handleAiImprove = async (tone: 'professional' | 'friendly' | 'formal' = 'professional') => {
    const textContent = editorRef.current?.innerText || value;
    if (!textContent.trim()) {
      toast.warning('Χρειάζεται περιεχόμενο', 'Γράψτε πρώτα περιεχόμενο για βελτίωση');
      return;
    }

    setAiLoading(true);
    setAiAction('improve');

    try {
      const response = await fetch('/api/ai/email-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textContent,
          language: 'el',
          tone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.improved) {
          onChange(data.improved.replace(/\n/g, '<br>'));
          if (editorRef.current) {
            editorRef.current.innerHTML = data.improved.replace(/\n/g, '<br>');
          }
        }
      }
    } catch (error) {
      console.error('AI improve error:', error);
    } finally {
      setAiLoading(false);
      setAiAction(null);
    }
  };

  // AI: Generate subject line suggestions
  const handleAiSubjectSuggestions = async () => {
    const textContent = editorRef.current?.innerText || value;
    if (!textContent.trim()) {
      toast.warning('Χρειάζεται περιεχόμενο', 'Γράψτε πρώτα το περιεχόμενο του email');
      return;
    }

    setAiLoading(true);
    setAiAction('subjects');

    try {
      const response = await fetch('/api/ai/email-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailContent: textContent,
          count: 5,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions && onSubjectSuggestions) {
          onSubjectSuggestions(data.suggestions);
        }
      }
    } catch (error) {
      console.error('AI subjects error:', error);
    } finally {
      setAiLoading(false);
      setAiAction(null);
    }
  };

  const aiActions = [
    {
      key: 'expand',
      label: 'Επέκταση σε πλήρες email',
      icon: <Wand2 className="h-4 w-4" />,
      onClick: handleAiExpand,
      description: 'Μετατρέπει σύντομη σημείωση σε επαγγελματικό email',
    },
    {
      key: 'improve-professional',
      label: 'Βελτίωση (Επαγγελματικό)',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: () => handleAiImprove('professional'),
    },
    {
      key: 'improve-friendly',
      label: 'Βελτίωση (Φιλικό)',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: () => handleAiImprove('friendly'),
    },
    {
      key: 'improve-formal',
      label: 'Βελτίωση (Επίσημο)',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: () => handleAiImprove('formal'),
    },
    { key: 'divider', label: '', divider: true },
    {
      key: 'subjects',
      label: 'Προτάσεις θεμάτων',
      icon: <ListChecks className="h-4 w-4" />,
      onClick: handleAiSubjectSuggestions,
      description: 'Δημιουργεί 5 προτάσεις για θέμα email',
    },
  ];

  if (!mounted) {
    return <div className="h-64 bg-white/[0.02] rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Formatting buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => execCommand('bold')}
            className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => execCommand('italic')}
            className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => execCommand('insertUnorderedList')}
            className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              const url = prompt('Enter URL:');
              if (url) execCommand('createLink', url);
            }}
            className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors"
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Merge Tags */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Μεταβλητές:</span>
          <div className="flex flex-wrap gap-1">
            {mergeTags.slice(0, 4).map((item) => (
              <button
                key={item.tag}
                onClick={() => insertMergeTag(item.tag)}
                className="px-2 py-1 text-xs rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                title={`Εισαγωγή ${item.label}`}
              >
                {item.label}
              </button>
            ))}
            <GlassDropdown
              trigger={
                <button className="px-2 py-1 text-xs rounded bg-white/[0.05] text-white/60 hover:bg-white/[0.08] transition-colors">
                  +{mergeTags.length - 4} ακόμα
                </button>
              }
              items={mergeTags.slice(4).map((item) => ({
                key: item.tag,
                label: item.label,
                onClick: () => insertMergeTag(item.tag),
              }))}
            />
          </div>
        </div>

        {/* AI Actions */}
        <div className="flex items-center gap-2">
          <GlassDropdown
            trigger={
              <GlassButton
                variant="ghost"
                size="sm"
                disabled={aiLoading}
                className="gap-2"
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-violet-400" />
                )}
                AI Βοηθός
              </GlassButton>
            }
            items={aiActions}
          />
        </div>
      </div>

      {/* AI Status */}
      {aiLoading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
          <span className="text-sm text-violet-300">
            {aiAction === 'expand' && 'Δημιουργία πλήρους email...'}
            {aiAction === 'improve' && 'Βελτίωση περιεχομένου...'}
            {aiAction === 'subjects' && 'Δημιουργία προτάσεων θεμάτων...'}
          </span>
        </div>
      )}

      {/* Editable Content Area */}
      <div
        ref={editorRef}
        contentEditable
        dir="ltr"
        className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 overflow-y-auto prose prose-invert max-w-none"
        style={{ minHeight, direction: 'ltr', textAlign: 'left' }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Helper text */}
      <p className="text-xs text-white/40">
        Tip: Χρησιμοποιήστε τον AI Βοηθό για να επεκτείνετε μια σύντομη σημείωση σε πλήρες επαγγελματικό email
      </p>

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
