'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { OutlookLayout } from '@/components/email/outlook-layout';
import { OutlookSidebar } from '@/components/email/outlook-sidebar';
import { OutlookList } from '@/components/email/outlook-list';
import { OutlookEditor } from '@/components/email/outlook-editor';
import { OutlookRecipientDrawer } from '@/components/email/outlook-recipient-drawer';

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

interface RecipientFilters {
  cities: string[];
  tags: string[];
  segments: string[];
  categories: string[];
}

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
  const [recipientFilters, setRecipientFilters] = useState<RecipientFilters>({
    cities: [],
    tags: [],
    segments: [],
    categories: [],
  });
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number>(0);

  // Computed folder counts
  const folderCounts = useMemo(() => ({
    all: campaigns.length,
    draft: campaigns.filter((c) => c.status === 'draft').length,
    scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
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

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }

      if (signaturesRes.ok) {
        const data = await signaturesRes.json();
        setSignatures(data.signatures || []);
        
        // Set default signature
        const defaultSig = data.signatures?.find((s: Signature) => s.isDefault);
        if (defaultSig) {
          setSelectedSignature(defaultSig.id);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Αποτυχία φόρτωσης δεδομένων');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch recipient count when filters change
  useEffect(() => {
    const fetchRecipientCount = async () => {
      if (!recipientFilters.cities.length && !recipientFilters.tags.length && !recipientFilters.segments.length) {
        setRecipientCount(0);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (recipientFilters.cities.length) params.set('cities', recipientFilters.cities.join(','));
        if (recipientFilters.tags.length) params.set('tags', recipientFilters.tags.join(','));
        if (recipientFilters.segments.length) params.set('segments', recipientFilters.segments.join(','));

        const response = await fetch(`/api/recipients/count?${params}`);
        if (response.ok) {
          const data = await response.json();
          setRecipientCount(data.count || 0);
        }
      } catch (err) {
        console.error('Error fetching recipient count:', err);
      }
    };

    fetchRecipientCount();
  }, [recipientFilters]);

  // Handle section change
  const handleSectionChange = (sectionId: string) => {
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
    setRecipientFilters({ cities: [], tags: [], segments: [], categories: [] });
    setSelectedSignature(null);
  };

  // Handle new campaign
  const handleNewCampaign = () => {
    setSelectedCampaignId(null);
    setIsNew(true);
    setIsEditing(true);
    resetEditor();
    setCampaignName('Νέο Campaign');
  };

  // Handle campaign selection
  const handleSelectCampaign = (id: string) => {
    setSelectedCampaignId(id);
    setIsEditing(true);
    setIsNew(false);

    // Load campaign data
    const campaign = campaigns.find((c) => c.id === id);
    if (campaign) {
      setCampaignName(campaign.name);
      setSubject(campaign.subject);
      setContent(campaign.content || '');
      // Note: In a real app, you'd also load the recipient filters from the campaign
    }
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
        status: sendNow ? 'sending' : 'draft',
        recipientFilters,
      };

      const url = isNew ? '/api/campaigns' : `/api/campaigns/${selectedCampaignId}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save campaign');
      }

      // Refresh data
      await fetchData();

      if (sendNow) {
        // If sending, also trigger the send
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: selectedCampaignId || (await response.json()).id,
          }),
        });
      }

      // Reset state
      setIsEditing(false);
      setIsNew(false);
      setSelectedCampaignId(null);
      resetEditor();
    } catch (err) {
      console.error('Error saving campaign:', err);
      setError('Αποτυχία αποθήκευσης');
    } finally {
      setSaving(false);
      setSending(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setIsEditing(false);
    setIsNew(false);
    resetEditor();
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το campaign;')) {
      return;
    }

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
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError('Αποτυχία διαγραφής');
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

  return (
    <div className="h-[calc(100vh-64px)]">
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
            items={listItems as any}
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
            templates={templates}
            signatures={signatures}
            selectedSignature={selectedSignature}
            setSelectedSignature={setSelectedSignature}
            onSave={handleSave}
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
