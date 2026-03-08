'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { OutlookLayout } from '@/components/email/outlook-layout';
import { OutlookSidebar } from '@/components/email/outlook-sidebar';
import { OutlookList } from '@/components/email/outlook-list';
import { OutlookEditor } from '@/components/email/outlook-editor';
import { OutlookRecipientDrawer } from '@/components/email/outlook-recipient-drawer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/stores/ui-store';
import {
  EMPTY_RECIPIENT_FILTERS,
  hasRecipientSelection,
  normalizeRecipientFiltersClient,
  type RecipientFilters,
} from '@/lib/email/recipient-filters';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'paused';
  scheduledAt: string | Date | null;
  sentAt: string | Date | null;
  createdAt: string | Date;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  assets?: {
    attachments: CampaignAttachment[];
    inlineImages: InlineImageConfig[];
  };
}

interface Template {
  id: string;
  name: string;
  subject: string;
  content?: string;
  category: string;
  createdAt: string | Date;
}

interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

interface CampaignAttachment {
  assetId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobUrl: string;
}

type ImageAlign = 'left' | 'center' | 'right';

interface InlineImageConfig {
  assetId: string;
  embedInline: boolean;
  widthPx: number | null;
  align: ImageAlign | null;
  alt: string | null;
  sortOrder: number;
}

type ApiFailure = {
  message: string;
  status: number;
  code: string | null;
  requestId: string | null;
  unauthorized: boolean;
};

export default function EmailPage() {
  const router = useRouter();

  // Data state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeSection, setActiveSection] = useState<string>('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [showRecipientDrawer, setShowRecipientDrawer] = useState(false);

  // Editor state
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [recipientFilters, setRecipientFilters] = useState<RecipientFilters>({ ...EMPTY_RECIPIENT_FILTERS });
  const [attachments, setAttachments] = useState<CampaignAttachment[]>([]);
  const [inlineImages, setInlineImages] = useState<InlineImageConfig[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Computed folder counts
  const folderCounts = useMemo(() => ({
    all: campaigns.length,
    draft: campaigns.filter((c) => c.status === 'draft').length,
    scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
    sending: campaigns.filter((c) => c.status === 'sending').length,
    sent: campaigns.filter((c) => c.status === 'sent').length,
    failed: campaigns.filter((c) => c.status === 'failed').length,
  }), [campaigns]);

  // Filtered items based on active section and view
  const listItems = useMemo(() => {
    if (activeSection === 'templates') {
      return templates;
    }
    
    let filtered = [...campaigns];
    
    // Filter by folder/status
    if (activeSection === 'draft') {
      filtered = filtered.filter((c) => c.status === 'draft');
    } else if (activeSection === 'scheduled') {
      filtered = filtered.filter((c) => c.status === 'scheduled');
    } else if (activeSection === 'sending') {
      filtered = filtered.filter((c) => c.status === 'sending');
    } else if (activeSection === 'sent') {
      filtered = filtered.filter((c) => c.status === 'sent');
    } else if (activeSection === 'failed') {
      filtered = filtered.filter((c) => c.status === 'failed');
    }

    return filtered;
  }, [campaigns, templates, activeSection]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignsRes, templatesRes, signaturesRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/templates'),
        fetch('/api/signatures'),
      ]);

      const readError = async (res: Response) => {
        try {
          const data = await res.json();
          if (data?.error) return String(data.error);
        } catch {
          // ignore
        }
        return `${res.status} ${res.statusText}`.trim() || 'Request failed';
      };

      const failures: string[] = [];

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      } else {
        failures.push(`Campaigns: ${await readError(campaignsRes)}`);
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      } else {
        failures.push(`Templates: ${await readError(templatesRes)}`);
      }

      if (signaturesRes.ok) {
        const data = await signaturesRes.json();
        setSignatures(data.signatures || []);
        
        // Set default signature
        const defaultSig = data.signatures?.find((s: Signature) => s.isDefault);
        if (defaultSig) {
          setSelectedSignature(defaultSig.id);
        }
      } else {
        failures.push(`Signatures: ${await readError(signaturesRes)}`);
      }

      if (failures.length > 0) {
        const msg = failures.join(' • ');
        setError(msg);
        toast.error('Αποτυχία φόρτωσης', msg);

        if ([campaignsRes, templatesRes, signaturesRes].some((r) => r.status === 401)) {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Αποτυχία φόρτωσης δεδομένων');
      toast.error('Αποτυχία φόρτωσης', 'Αποτυχία φόρτωσης δεδομένων');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const readApiFailure = async (response: Response, fallback: string): Promise<ApiFailure> => {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const data = (payload && typeof payload === 'object') ? (payload as Record<string, unknown>) : {};
    const message = typeof data.error === 'string'
      ? data.error
      : `${fallback} (${response.status} ${response.statusText || 'Request failed'})`;

    return {
      message,
      status: response.status,
      code: typeof data.code === 'string' ? data.code : null,
      requestId: typeof data.requestId === 'string' ? data.requestId : null,
      unauthorized: response.status === 401,
    };
  };

  const formatApiFailure = (failure: ApiFailure) => {
    const parts = [failure.message];
    if (failure.code) parts.push(`[${failure.code}]`);
    if (failure.requestId) parts.push(`requestId: ${failure.requestId}`);
    return parts.join(' | ');
  };

  const recipientCountKey = useMemo(() => {
    if (!hasRecipientSelection(recipientFilters)) return null;

    const params = new URLSearchParams();
    if (recipientFilters.cities.length) params.set('cities', recipientFilters.cities.join(','));
    if (recipientFilters.tags.length) params.set('tags', recipientFilters.tags.join(','));
    if (recipientFilters.segments.length) params.set('segments', recipientFilters.segments.join(','));
    if (recipientFilters.categories.length) params.set('categories', recipientFilters.categories.join(','));
    if (recipientFilters.customerIds.length) params.set('customerIds', recipientFilters.customerIds.join(','));
    if (recipientFilters.rawEmails.length) params.set('rawEmails', recipientFilters.rawEmails.join(','));
    return `/api/recipients/count?${params.toString()}`;
  }, [recipientFilters]);

  const { data: recipientCountData } = useSWR<{ count?: number }>(
    recipientCountKey,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch recipients: ${response.status}`);
      }
      return response.json() as Promise<{ count?: number }>;
    },
    { revalidateOnFocus: false }
  );

  const recipientCount = recipientCountData?.count ?? 0;

  // Handle section change
  const handleSectionChange = (sectionId: string) => {
    if (sectionId === 'automations') {
      router.push('/email/automations');
      return;
    }
    if (sectionId === 'segments') {
      router.push('/segments');
      return;
    }

    setActiveSection(sectionId);
    setSelectedCampaignId(null);
    setIsEditing(false);
    setIsNew(false);
    resetEditor();
  };

  // Reset editor state
  const resetEditor = () => {
    setCampaignName('');
    setSubject('');
    setContent('');
    setRecipientFilters({ ...EMPTY_RECIPIENT_FILTERS });
    setAttachments([]);
    setInlineImages([]);
    setSelectedSignature(null);
  };

  // Handle new campaign
  const handleNewCampaign = () => {
    setSelectedCampaignId(null);
    setIsNew(true);
    setIsEditing(true);
    resetEditor();
    setCampaignName('Νέα Καμπάνια');
  };

  // Handle campaign selection
  const handleSelectCampaign = (id: string) => {
    setSelectedCampaignId(id);
    setIsEditing(true);
    setIsNew(false);

    // Load campaign data (full record)
    fetch(`/api/campaigns/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load campaign');
        return res.json();
      })
      .then((campaign) => {
        setCampaignName(campaign.name);
        setSubject(campaign.subject);
        setContent(campaign.content || '');
        setRecipientFilters(normalizeRecipientFiltersClient(campaign.recipientFilters));
        setAttachments(campaign.assets?.attachments || []);
        setInlineImages(
          (campaign.assets?.inlineImages || []).map((image: InlineImageConfig, index: number) => ({
            ...image,
            sortOrder: Number.isFinite(image.sortOrder) ? image.sortOrder : index,
          }))
        );
        setSelectedSignature(campaign.signatureId || null);
      })
      .catch((err) => {
        console.error('Error loading campaign:', err);
        setError('Αποτυχία φόρτωσης καμπάνιας');
      });
  };

  // Handle template selection
  const handleSelectTemplate = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (template) {
      // Apply template to a new campaign
      handleNewCampaign();
      setCampaignName(template.name);
      setSubject(template.subject);
      setContent(template.content || '');
      setAttachments([]);
      setInlineImages([]);
    }
  };

  // Handle save
  const handleSave = async (sendNow: boolean) => {
    try {
      if (sendNow) {
        setSending(true);
      } else {
        setSaving(true);
      }

      const payload = {
        name: campaignName,
        subject,
        content,
        status: 'draft',
        recipientFilters,
        signatureId: selectedSignature,
        assets: {
          attachments: attachments.map((item) => item.assetId),
          inlineImages: inlineImages.map((item, index) => ({
            assetId: item.assetId,
            embedInline: item.embedInline,
            widthPx: item.widthPx,
            align: item.align,
            alt: item.alt,
            sortOrder: index,
          })),
        },
      };

      const url = isNew ? '/api/campaigns' : `/api/campaigns/${selectedCampaignId}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const failure = await readApiFailure(response, 'Failed to save campaign');
        if (failure.unauthorized) {
          router.push('/login');
        }
        throw new Error(formatApiFailure(failure));
      }

      const saved = await response.json();
      const campaignId = saved?.id || selectedCampaignId;

      if (sendNow) {
        // Trigger send for the saved campaign
        const sendResponse = await fetch(`/api/campaigns/${campaignId}/send`, {
          method: 'POST',
        });
        if (!sendResponse.ok) {
          const failure = await readApiFailure(sendResponse, 'Failed to enqueue campaign');
          if (failure.unauthorized) {
            router.push('/login');
          }
          throw new Error(formatApiFailure(failure));
        }
      }

      // Refresh data
      await fetchData();

      // Reset state
      setIsEditing(false);
      setIsNew(false);
      setSelectedCampaignId(null);
      resetEditor();
    } catch (err) {
      console.error('Error saving campaign:', err);
      setError(err instanceof Error ? err.message : 'Αποτυχία αποθήκευσης');
    } finally {
      setSaving(false);
      setSending(false);
    }
  };

  const handleSchedule = async (runAtIso: string) => {
    try {
      setSaving(true);

      const payload = {
        name: campaignName,
        subject,
        content,
        status: 'scheduled',
        scheduledAt: runAtIso,
        recipientFilters,
        signatureId: selectedSignature,
        assets: {
          attachments: attachments.map((item) => item.assetId),
          inlineImages: inlineImages.map((item, index) => ({
            assetId: item.assetId,
            embedInline: item.embedInline,
            widthPx: item.widthPx,
            align: item.align,
            alt: item.alt,
            sortOrder: index,
          })),
        },
      };

      const url = isNew ? '/api/campaigns' : `/api/campaigns/${selectedCampaignId}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const failure = await readApiFailure(response, 'Failed to save campaign');
        if (failure.unauthorized) {
          router.push('/login');
        }
        throw new Error(formatApiFailure(failure));
      }

      const saved = await response.json();
      const campaignId = saved?.id || selectedCampaignId;

      const sendResponse = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runAt: runAtIso }),
      });
      if (!sendResponse.ok) {
        const failure = await readApiFailure(sendResponse, 'Failed to enqueue scheduled campaign');
        if (failure.unauthorized) {
          router.push('/login');
        }
        throw new Error(formatApiFailure(failure));
      }

      await fetchData();

      setIsEditing(false);
      setIsNew(false);
      setSelectedCampaignId(null);
      resetEditor();
    } catch (err) {
      console.error('Error scheduling campaign:', err);
      setError(err instanceof Error ? err.message : 'Αποτυχία προγραμματισμού');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setIsEditing(false);
    setIsNew(false);
    resetEditor();
  };

  // Handle delete
  const handleDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    const id = deleteId;
    if (!id) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

      await fetchData();
      
      if (selectedCampaignId === id) {
        setSelectedCampaignId(null);
        setIsEditing(false);
        resetEditor();
      }
      toast.success('Διαγράφηκε', 'Η καμπάνια διαγράφηκε επιτυχώς.');
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError('Αποτυχία διαγραφής');
      toast.error('Αποτυχία διαγραφής', 'Δεν ήταν δυνατή η διαγραφή της καμπάνιας.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteId(null);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (id: string) => {
    const campaign = campaigns.find((c) => c.id === id);
    if (campaign) {
      handleNewCampaign();
      setCampaignName(`${campaign.name} (Αντίγραφο)`);
      setSubject(campaign.subject);
      setContent(campaign.content || '');
    }
  };

  // Determine what to show in the list
  const listType = activeSection === 'templates' ? 'templates' : 'campaigns';
  const deleteCampaignName = deleteId ? campaigns.find((c) => c.id === deleteId)?.name : null;

  return (
    <div className="h-[calc(100vh-64px)]">
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title="Διαγραφή Καμπάνιας"
        description={
          deleteCampaignName
            ? `Είστε σίγουροι ότι θέλετε να διαγράψετε την καμπάνια "${deleteCampaignName}";`
            : 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την καμπάνια;'
        }
        confirmText="Διαγραφή"
        cancelText="Ακύρωση"
        variant="danger"
        loading={deleting}
      />
      <OutlookLayout
        sidebar={
          <OutlookSidebar
            activeItem={activeSection}
            onItemSelect={handleSectionChange}
            onNewCampaign={handleNewCampaign}
            folderCounts={folderCounts}
          />
        }
        list={
          <OutlookList
            items={listItems}
            type={listType}
            selectedId={selectedCampaignId}
            onSelect={listType === 'templates' ? handleSelectTemplate : handleSelectCampaign}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onEdit={handleSelectCampaign}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filter={statusFilter}
            onFilterChange={setStatusFilter}
            loading={loading}
          />
        }
        editor={
          <OutlookEditor
            campaignId={selectedCampaignId}
            campaignName={campaignName}
            setCampaignName={setCampaignName}
            subject={subject}
            setSubject={setSubject}
            content={content}
            setContent={setContent}
            recipientFilters={recipientFilters}
            setRecipientFilters={setRecipientFilters}
            attachments={attachments}
            setAttachments={setAttachments}
            inlineImages={inlineImages}
            setInlineImages={setInlineImages}
            templates={templates}
            signatures={signatures}
            selectedSignature={selectedSignature}
            setSelectedSignature={setSelectedSignature}
            onSave={handleSave}
            onSchedule={handleSchedule}
            onCancel={handleCancel}
            onOpenRecipients={() => setShowRecipientDrawer(true)}
            saving={saving}
            sending={sending}
            isNew={isNew}
            recipientCount={recipientCount}
          />
        }
        showEditor={isEditing}
      />

      {/* Recipient Selection Drawer */}
      <OutlookRecipientDrawer
        isOpen={showRecipientDrawer}
        onClose={() => setShowRecipientDrawer(false)}
        filters={recipientFilters}
        onFiltersChange={setRecipientFilters}
      />

      {/* Error Toast */}
      {error && (
        <div 
          className="fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg outlook-animate-slide-right z-50"
          style={{
            background: 'var(--outlook-error-bg)',
            border: '1px solid var(--outlook-error)',
            color: 'var(--outlook-error)',
          }}
        >
          <div className="flex items-center gap-3">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="hover:opacity-70"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
