'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Save, Sparkles, User, Mail, ChevronDown } from 'lucide-react';
import { GlassModal } from '@/components/ui/glass-modal';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  recipient?: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
  };
  campaignId?: string;
  template?: {
    id: string;
    name: string;
    subject: string;
    content: string;
  };
  onSend?: (result: { success: boolean; message?: string }) => void;
}

export function EmailComposer({
  isOpen,
  onClose,
  recipient,
  campaignId,
  template,
  onSend,
}: EmailComposerProps) {
  const [to, setTo] = useState(recipient?.email || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [content, setContent] = useState(template?.content || '');
  const [sending, setSending] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; subject: string; content: string }>>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Load templates
  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => setTemplates(data.templates || []))
      .catch(console.error);
  }, []);

  // Personalize content with recipient data
  const personalizeContent = (text: string) => {
    if (!recipient) return text;
    return text
      .replace(/{{firstName}}/g, recipient.firstName || '')
      .replace(/{{lastName}}/g, recipient.lastName || '')
      .replace(/{{email}}/g, recipient.email || '');
  };

  const handleTemplateSelect = (tmpl: typeof templates[0]) => {
    setSubject(personalizeContent(tmpl.subject));
    setContent(personalizeContent(tmpl.content));
    setShowTemplates(false);
  };

  const handleAiAssist = async () => {
    if (!content.trim()) {
      alert('Γράψτε πρώτα ένα μήνυμα για να βελτιωθεί με AI');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/api/ai/email-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          language: 'el',
          tone: 'professional',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data.improved || content);
      }
    } catch (error) {
      console.error('AI assist error:', error);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!to || !subject || !content) {
      alert('Συμπληρώστε όλα τα πεδία');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          content,
          html: true,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSend?.({ success: true, message: 'Email sent successfully' });
        onClose();
      } else {
        onSend?.({ success: false, message: result.error });
        alert(result.error || 'Αποτυχία αποστολής');
      }
    } catch (error) {
      console.error('Send error:', error);
      onSend?.({ success: false, message: 'Network error' });
      alert('Σφάλμα δικτύου');
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    // Save as campaign draft
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subject || 'Πρόχειρο',
          subject,
          content,
          status: 'draft',
        }),
      });

      if (response.ok) {
        alert('Αποθηκεύτηκε ως πρόχειρο');
        onClose();
      }
    } catch (error) {
      console.error('Save draft error:', error);
      alert('Αποτυχία αποθήκευσης');
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Νέο Email" size="xl">
      <div className="space-y-4">
        {/* Recipient */}
        <div className="flex items-center gap-3">
          <label className="w-20 text-sm text-white/60">Προς:</label>
          <div className="flex-1 relative">
            <GlassInput
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              disabled={!!recipient}
            />
            {recipient && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm text-white/60">
                <User className="h-4 w-4" />
                {recipient.firstName} {recipient.lastName}
              </div>
            )}
          </div>
        </div>

        {/* Subject */}
        <div className="flex items-center gap-3">
          <label className="w-20 text-sm text-white/60">Θέμα:</label>
          <div className="flex-1">
            <GlassInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Θέμα email..."
            />
          </div>
        </div>

        {/* Templates dropdown */}
        <div className="flex items-center gap-3">
          <label className="w-20 text-sm text-white/60">Template:</label>
          <div className="relative flex-1">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.05] transition-colors"
            >
              <span>Επιλέξτε template...</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 border border-white/[0.08] rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto"
                >
                  {templates.length === 0 ? (
                    <div className="p-4 text-sm text-white/40 text-center">
                      Δεν υπάρχουν templates
                    </div>
                  ) : (
                    templates.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        onClick={() => handleTemplateSelect(tmpl)}
                        className="w-full px-4 py-3 text-left hover:bg-white/[0.05] transition-colors border-b border-white/[0.05] last:border-0"
                      >
                        <div className="font-medium text-white">{tmpl.name}</div>
                        <div className="text-sm text-white/50 truncate">{tmpl.subject}</div>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-white/60">Περιεχόμενο:</label>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleAiAssist}
              disabled={aiGenerating}
              className="gap-2"
            >
              <Sparkles className={`h-4 w-4 ${aiGenerating ? 'animate-spin' : ''}`} />
              {aiGenerating ? 'Βελτίωση...' : 'AI Βελτίωση'}
            </GlassButton>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Γράψτε το μήνυμά σας εδώ...

Διαθέσιμες μεταβλητές:
{{firstName}} - Όνομα
{{lastName}} - Επώνυμο
{{email}} - Email"
            className="w-full h-64 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>

        {/* Variable hints */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-white/40">Μεταβλητές:</span>
          {['{{firstName}}', '{{lastName}}', '{{email}}'].map((variable) => (
            <button
              key={variable}
              onClick={() => setContent(content + ' ' + variable)}
              className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            >
              {variable}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
          <GlassButton variant="ghost" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Αποθήκευση
          </GlassButton>
          <GlassButton variant="ghost" onClick={onClose}>
            Ακύρωση
          </GlassButton>
          <GlassButton onClick={handleSend} disabled={sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Αποστολή...' : 'Αποστολή'}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}



