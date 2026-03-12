'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

import {
  createEmailComposerDraft,
  useEmailComposerDraft,
} from '@/components/email/outlook-editor/use-email-composer-draft';
import type {
  CampaignAttachment,
  InlineImageConfig,
  Signature,
  Template,
} from '@/components/email/outlook-editor/types';
import {
  EMPTY_RECIPIENT_FILTERS,
  hasRecipientSelection,
  normalizeRecipientFiltersClient,
} from '@/lib/email/recipient-filters';
import { toast } from '@/lib/stores/ui-store';

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
  recipientFilters?: unknown;
  signatureId?: string | null;
}

type ApiFailure = {
  message: string;
  status: number;
  code: string | null;
  requestId: string | null;
  unauthorized: boolean;
};

export function useEmailPageController() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [openingCampaignId, setOpeningCampaignId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [showRecipientDrawer, setShowRecipientDrawer] = useState(false);
  const [showRecipientsViewDrawer, setShowRecipientsViewDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const campaignLoadRequestIdRef = useRef(0);
  const submissionLockRef = useRef(false);

  const defaultSignatureId = useMemo(
    () => signatures.find((signature) => signature.isDefault)?.id ?? null,
    [signatures]
  );

  const { draft, actions: draftActions } = useEmailComposerDraft(defaultSignatureId);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId]
  );
  const selectedCampaignStatus = selectedCampaign?.status ?? null;
  const listSelectedId = openingCampaignId ?? selectedCampaignId;
  const usesDeliverySnapshot = ['sent', 'sending', 'failed'].includes(
    selectedCampaign?.status ?? ''
  );
  const previewDrawerKey = useMemo(
    () => JSON.stringify(draft.recipientFilters),
    [draft.recipientFilters]
  );

  const folderCounts = useMemo(
    () => ({
      all: campaigns.length,
      draft: campaigns.filter((campaign) => campaign.status === 'draft').length,
      scheduled: campaigns.filter((campaign) => campaign.status === 'scheduled').length,
      sending: campaigns.filter((campaign) => campaign.status === 'sending').length,
      sent: campaigns.filter((campaign) => campaign.status === 'sent').length,
      failed: campaigns.filter((campaign) => campaign.status === 'failed').length,
    }),
    [campaigns]
  );

  const listItems = useMemo(() => {
    if (activeSection === 'templates') {
      return templates;
    }

    let filtered = [...campaigns];

    if (activeSection === 'draft') {
      filtered = filtered.filter((campaign) => campaign.status === 'draft');
    } else if (activeSection === 'scheduled') {
      filtered = filtered.filter((campaign) => campaign.status === 'scheduled');
    } else if (activeSection === 'sending') {
      filtered = filtered.filter((campaign) => campaign.status === 'sending');
    } else if (activeSection === 'sent') {
      filtered = filtered.filter((campaign) => campaign.status === 'sent');
    } else if (activeSection === 'failed') {
      filtered = filtered.filter((campaign) => campaign.status === 'failed');
    }

    return filtered;
  }, [activeSection, campaigns, templates]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignsRes, templatesRes, signaturesRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/templates'),
        fetch('/api/signatures'),
      ]);

      const readError = async (response: Response) => {
        try {
          const data = await response.json();
          if (data?.error) return String(data.error);
        } catch {
          // ignore bad error bodies
        }

        return `${response.status} ${response.statusText}`.trim() || 'Request failed';
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

        const defaultSig = data.signatures?.find((signature: Signature) => signature.isDefault);
        if (defaultSig) {
          draftActions.setSelectedSignature((current) => current ?? defaultSig.id);
        }
      } else {
        failures.push(`Signatures: ${await readError(signaturesRes)}`);
      }

      if (failures.length > 0) {
        const message = failures.join(' | ');
        setError(message);
        toast.error('Failed to load email data', message);

        if ([campaignsRes, templatesRes, signaturesRes].some((response) => response.status === 401)) {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load email data');
      toast.error('Failed to load email data', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [draftActions, router]);

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

    const data =
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const message =
      typeof data.error === 'string'
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
    if (!hasRecipientSelection(draft.recipientFilters)) return null;

    const params = new URLSearchParams();
    if (draft.recipientFilters.cities.length) {
      params.set('cities', draft.recipientFilters.cities.join(','));
    }
    if (draft.recipientFilters.tags.length) {
      params.set('tags', draft.recipientFilters.tags.join(','));
    }
    if (draft.recipientFilters.segments.length) {
      params.set('segments', draft.recipientFilters.segments.join(','));
    }
    if (draft.recipientFilters.categories.length) {
      params.set('categories', draft.recipientFilters.categories.join(','));
    }
    if (draft.recipientFilters.customerIds.length) {
      params.set('customerIds', draft.recipientFilters.customerIds.join(','));
    }
    if (draft.recipientFilters.rawEmails.length) {
      params.set('rawEmails', draft.recipientFilters.rawEmails.join(','));
    }

    return `/api/recipients/count?${params.toString()}`;
  }, [draft.recipientFilters]);

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

  const invalidateCampaignLoad = useCallback(() => {
    campaignLoadRequestIdRef.current += 1;
    setOpeningCampaignId(null);
  }, []);

  const resetEditor = useCallback(
    (useDefaultSignature = false) => {
      draftActions.resetDraft(useDefaultSignature ? defaultSignatureId : null);
    },
    [defaultSignatureId, draftActions]
  );

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
    invalidateCampaignLoad();
    setSelectedCampaignId(null);
    setIsEditing(false);
    setIsNew(false);
    resetEditor();
  };

  const handleNewCampaign = useCallback(() => {
    invalidateCampaignLoad();
    setSelectedCampaignId(null);
    setIsNew(true);
    setIsEditing(true);
    resetEditor(true);
    draftActions.setCampaignName('Νέα Καμπάνια');
  }, [draftActions, invalidateCampaignLoad, resetEditor]);

  const handleSelectCampaign = useCallback(
    async (id: string) => {
      const requestId = campaignLoadRequestIdRef.current + 1;
      campaignLoadRequestIdRef.current = requestId;

      setOpeningCampaignId(id);
      setError(null);

      try {
        const response = await fetch(`/api/campaigns/${id}`);
        if (!response.ok) {
          throw new Error('Failed to load campaign');
        }

        const campaign = (await response.json()) as Campaign;
        if (campaignLoadRequestIdRef.current !== requestId) return;

        draftActions.replaceDraft(
          createEmailComposerDraft(
            {
              campaignName: campaign.name,
              subject: campaign.subject,
              content: campaign.content || '',
              recipientFilters: normalizeRecipientFiltersClient(campaign.recipientFilters),
              attachments: campaign.assets?.attachments || [],
              inlineImages: campaign.assets?.inlineImages || [],
              selectedSignature: campaign.signatureId || defaultSignatureId,
            },
            defaultSignatureId
          )
        );
        setSelectedCampaignId(id);
        setIsEditing(true);
        setIsNew(false);
      } catch (err) {
        if (campaignLoadRequestIdRef.current !== requestId) return;

        console.error('Error loading campaign:', err);
        setError('Failed to load campaign');
      } finally {
        if (campaignLoadRequestIdRef.current === requestId) {
          setOpeningCampaignId(null);
        }
      }
    },
    [defaultSignatureId, draftActions]
  );

  const handleSelectTemplate = (id: string) => {
    const template = templates.find((entry) => entry.id === id);
    if (!template) return;

    handleNewCampaign();
    draftActions.replaceDraft(
      createEmailComposerDraft(
        {
          campaignName: template.name,
          subject: template.subject,
          content: template.content || '',
          recipientFilters: { ...EMPTY_RECIPIENT_FILTERS },
          attachments: [],
          inlineImages: [],
          selectedSignature: defaultSignatureId,
        },
        defaultSignatureId
      )
    );
  };

  const buildCampaignPayload = (status: Campaign['status'], scheduledAt?: string) => ({
    name: draft.campaignName,
    subject: draft.subject,
    content: draft.content,
    status,
    scheduledAt,
    recipientFilters: draft.recipientFilters,
    signatureId: draft.selectedSignature,
    assets: {
      attachments: draft.attachments.map((item) => item.assetId),
      inlineImages: draft.inlineImages.map((item, index) => ({
        assetId: item.assetId,
        embedInline: item.embedInline,
        widthPx: item.widthPx,
        align: item.align,
        alt: item.alt,
        sortOrder: index,
      })),
    },
  });

  const handleSave = async (sendNow: boolean) => {
    try {
      if (submissionLockRef.current || saving || sending) return;
      submissionLockRef.current = true;

      if (sendNow && recipientCount <= 0) {
        throw new Error('Select at least one recipient before sending.');
      }

      if (sendNow) {
        setSending(true);
      } else {
        setSaving(true);
      }

      const response = await fetch(
        isNew ? '/api/campaigns' : `/api/campaigns/${selectedCampaignId}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            buildCampaignPayload(isNew ? 'draft' : selectedCampaignStatus ?? 'draft')
          ),
        }
      );

      if (!response.ok) {
        const failure = await readApiFailure(response, 'Failed to save campaign');
        if (failure.unauthorized) {
          router.push('/login');
        }
        throw new Error(formatApiFailure(failure));
      }

      const saved = await response.json();
      const savedCampaignId =
        typeof saved?.id === 'string' ? saved.id : selectedCampaignId;
      if (!savedCampaignId) {
        throw new Error('Campaign save returned no identifier.');
      }

      if (isNew) {
        setSelectedCampaignId(savedCampaignId);
        setIsNew(false);
      }

      if (sendNow) {
        const sendResponse = await fetch(`/api/campaigns/${savedCampaignId}/send`, {
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

      await fetchData();
      setIsEditing(false);
      setIsNew(false);
      setSelectedCampaignId(null);
      resetEditor();
    } catch (err) {
      console.error('Error saving campaign:', err);
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    } finally {
      submissionLockRef.current = false;
      setSaving(false);
      setSending(false);
    }
  };

  const handleSchedule = async (runAtIso: string) => {
    try {
      if (submissionLockRef.current || saving || sending) return;
      submissionLockRef.current = true;

      if (recipientCount <= 0) {
        throw new Error('Select at least one recipient before scheduling.');
      }

      setSaving(true);

      const response = await fetch(
        isNew ? '/api/campaigns' : `/api/campaigns/${selectedCampaignId}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildCampaignPayload('scheduled', runAtIso)),
        }
      );

      if (!response.ok) {
        const failure = await readApiFailure(response, 'Failed to save campaign');
        if (failure.unauthorized) {
          router.push('/login');
        }
        throw new Error(formatApiFailure(failure));
      }

      const saved = await response.json();
      const savedCampaignId =
        typeof saved?.id === 'string' ? saved.id : selectedCampaignId;
      if (!savedCampaignId) {
        throw new Error('Campaign save returned no identifier.');
      }

      if (isNew) {
        setSelectedCampaignId(savedCampaignId);
        setIsNew(false);
      }

      const sendResponse = await fetch(`/api/campaigns/${savedCampaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runAt: runAtIso }),
      });

      if (!sendResponse.ok) {
        const failure = await readApiFailure(
          sendResponse,
          'Failed to enqueue scheduled campaign'
        );
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
      setError(err instanceof Error ? err.message : 'Failed to schedule campaign');
    } finally {
      submissionLockRef.current = false;
      setSaving(false);
    }
  };

  const handleCancel = () => {
    invalidateCampaignLoad();
    setIsEditing(false);
    setIsNew(false);
    resetEditor();
  };

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

      toast.success('Campaign deleted', 'The campaign was removed successfully.');
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError('Failed to delete campaign');
      toast.error('Failed to delete campaign', 'Please try again.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`);
      if (!response.ok) {
        const failure = await readApiFailure(response, 'Failed to duplicate campaign');
        if (failure.unauthorized) {
          router.push('/login');
        }
        throw new Error(formatApiFailure(failure));
      }

      const campaign = (await response.json()) as Campaign;
      handleNewCampaign();
      draftActions.replaceDraft(
        createEmailComposerDraft(
          {
            campaignName: `${campaign.name} (Αντίγραφο)`,
            subject: campaign.subject || '',
            content: campaign.content || '',
            recipientFilters: normalizeRecipientFiltersClient(campaign.recipientFilters),
            attachments: campaign.assets?.attachments || [],
            inlineImages: campaign.assets?.inlineImages || [],
            selectedSignature: campaign.signatureId || defaultSignatureId,
          },
          defaultSignatureId
        )
      );
    } catch (err) {
      console.error('Error duplicating campaign:', err);
      setError(err instanceof Error ? err.message : 'Failed to duplicate campaign');
    }
  };

  const listType: 'templates' | 'campaigns' =
    activeSection === 'templates' ? 'templates' : 'campaigns';
  const deleteCampaignName = deleteId
    ? campaigns.find((campaign) => campaign.id === deleteId)?.name
    : null;

  return {
    draft,
    draftActions,
    loading,
    error,
    setError,
    activeSection,
    selectedCampaignId,
    openingCampaignId,
    listSelectedId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isEditing,
    showRecipientDrawer,
    setShowRecipientDrawer,
    showRecipientsViewDrawer,
    setShowRecipientsViewDrawer,
    deleting,
    deleteOpen,
    setDeleteOpen,
    setDeleteId,
    folderCounts,
    listItems,
    listType,
    deleteCampaignName,
    previewDrawerKey,
    recipientCount,
    selectedCampaignStatus,
    usesDeliverySnapshot,
    templates,
    signatures,
    callbacks: {
      handleSectionChange,
      handleNewCampaign,
      handleSelectCampaign,
      handleSelectTemplate,
      handleSave,
      handleSchedule,
      handleCancel,
      handleDelete,
      confirmDelete,
      handleDuplicate,
    },
    workflow: {
      saving,
      sending,
      isNew,
    },
  };
}
