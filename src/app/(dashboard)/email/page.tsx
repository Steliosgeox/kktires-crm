'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Plus,
  Send,
  FileText,
  BarChart3,
  Zap,
  Inbox,
  Search,
  Pause,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/glass-tabs';
import { GlassProgress } from '@/components/ui/glass-progress';
import { GlassModal } from '@/components/ui/glass-modal';
import { GlassDropdown } from '@/components/ui/glass-dropdown';
import { GlassEmptyState } from '@/components/ui/glass-empty-state';
import { GlassSkeleton } from '@/components/ui/glass-skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduledAt: number | null;
  sentAt: number | null;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdAt: number;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  category: string;
  createdAt: number;
}

const statusConfig = {
  draft: { label: 'Πρόχειρο', variant: 'default' as const, icon: FileText },
  scheduled: { label: 'Προγραμματισμένο', variant: 'warning' as const, icon: Clock },
  sending: { label: 'Αποστολή...', variant: 'primary' as const, icon: Send },
  sent: { label: 'Απεστάλη', variant: 'success' as const, icon: CheckCircle },
  paused: { label: 'Παύση', variant: 'warning' as const, icon: Pause },
  failed: { label: 'Αποτυχία', variant: 'error' as const, icon: AlertCircle },
};

export default function EmailPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ totalSent: 0, openRate: '0', clickRate: '0' });
  
  // Modal states
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'campaign' | 'template'; id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [campaignForm, setCampaignForm] = useState({ name: '', subject: '', content: '' });
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', content: '', category: 'general' });

  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await fetch('/api/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
        setStats(data.stats || { totalSent: 0, openRate: '0', clickRate: '0' });
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCampaigns(), fetchTemplates()]);
    setLoading(false);
  }, [fetchCampaigns, fetchTemplates]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCampaign = async () => {
    if (!campaignForm.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignForm),
      });
      if (response.ok) {
        await fetchCampaigns();
        setCampaignModalOpen(false);
        setCampaignForm({ name: '', subject: '', content: '' });
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });
      if (response.ok) {
        await fetchTemplates();
        setTemplateModalOpen(false);
        setTemplateForm({ name: '', subject: '', content: '', category: 'general' });
      }
    } catch (error) {
      console.error('Error creating template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (type: 'campaign' | 'template', id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const endpoint = itemToDelete.type === 'campaign' ? `/api/campaigns/${itemToDelete.id}` : `/api/templates/${itemToDelete.id}`;
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (response.ok) {
        if (itemToDelete.type === 'campaign') {
          setCampaigns(prev => prev.filter(c => c.id !== itemToDelete.id));
        } else {
          setTemplates(prev => prev.filter(t => t.id !== itemToDelete.id));
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Active automations count (placeholder - would come from API)
  const activeAutomations = 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <div>
            <GlassSkeleton className="h-8 w-48 mb-2" />
            <GlassSkeleton className="h-5 w-64" />
          </div>
          <GlassSkeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <GlassCard key={i}>
              <GlassSkeleton className="h-16 w-full" />
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Marketing</h1>
          <p className="text-white/60">
            Διαχείριση campaigns, templates και αυτοματισμών
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton 
            variant="default" 
            leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchData}
          >
            Ανανέωση
          </GlassButton>
          <GlassButton 
            variant="primary" 
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCampaignModalOpen(true)}
          >
            Νέο Campaign
          </GlassButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
              <Send className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Απεσταλμένα</p>
              <p className="text-2xl font-bold text-white">{stats.totalSent.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20">
              <Inbox className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Ποσοστό Ανοίγματος</p>
              <p className="text-2xl font-bold text-white">{stats.openRate}%</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/20">
              <BarChart3 className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Ποσοστό Κλικ</p>
              <p className="text-2xl font-bold text-white">{stats.clickRate}%</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
              <Zap className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Ενεργοί Αυτοματισμοί</p>
              <p className="text-2xl font-bold text-white">{activeAutomations}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <GlassTabs defaultValue="campaigns">
        <GlassTabsList>
          <GlassTabsTrigger value="campaigns">
            <Mail className="h-4 w-4 mr-2" />
            Campaigns ({campaigns.length})
          </GlassTabsTrigger>
          <GlassTabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates ({templates.length})
          </GlassTabsTrigger>
          <GlassTabsTrigger value="automations">
            <Zap className="h-4 w-4 mr-2" />
            Αυτοματισμοί
          </GlassTabsTrigger>
        </GlassTabsList>

        {/* Campaigns Tab */}
        <GlassTabsContent value="campaigns" className="mt-6">
          <GlassCard padding="none">
            <div className="border-b border-white/[0.08] p-4">
              <GlassInput
                placeholder="Αναζήτηση campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                className="max-w-md"
              />
            </div>
            
            {filteredCampaigns.length === 0 ? (
              <GlassEmptyState
                icon={<Mail className="h-8 w-8" />}
                title="Δεν υπάρχουν campaigns"
                description="Δημιουργήστε το πρώτο σας email campaign"
                action={{
                  label: 'Νέο Campaign',
                  onClick: () => setCampaignModalOpen(true),
                }}
              />
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {filteredCampaigns.map((campaign) => {
                  const status = statusConfig[campaign.status as keyof typeof statusConfig] || statusConfig.draft;
                  const StatusIcon = status.icon;
                  const openRate = campaign.sentCount > 0
                    ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1)
                    : '0';
                  const clickRate = campaign.openCount > 0
                    ? ((campaign.clickCount / campaign.openCount) * 100).toFixed(1)
                    : '0';

                  return (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05]">
                          <Mail className="h-5 w-5 text-white/60" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{campaign.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <GlassBadge variant={status.variant} size="sm">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </GlassBadge>
                            <span className="text-xs text-white/40">
                              {campaign.totalRecipients.toLocaleString()} παραλήπτες
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {campaign.status === 'sending' && (
                          <div className="flex items-center gap-4">
                            <div className="w-32">
                              <GlassProgress
                                value={(campaign.sentCount / campaign.totalRecipients) * 100}
                                showLabel
                                size="sm"
                              />
                            </div>
                          </div>
                        )}

                        {campaign.status === 'sent' && (
                          <div className="flex items-center gap-6 text-sm">
                            <div>
                              <span className="text-white/40">Άνοιγμα</span>
                              <span className="ml-2 font-medium text-emerald-400">{openRate}%</span>
                            </div>
                            <div>
                              <span className="text-white/40">Κλικ</span>
                              <span className="ml-2 font-medium text-cyan-400">{clickRate}%</span>
                            </div>
                          </div>
                        )}

                        {campaign.status === 'scheduled' && campaign.scheduledAt && (
                          <div className="flex items-center gap-2 text-sm text-white/50">
                            <Clock className="h-4 w-4" />
                            {new Date(campaign.scheduledAt).toLocaleString('el-GR')}
                          </div>
                        )}

                        {campaign.status === 'draft' && (
                          <GlassButton 
                            variant="primary" 
                            size="sm" 
                            leftIcon={<Send className="h-3 w-3" />}
                          >
                            Αποστολή
                          </GlassButton>
                        )}

                        <GlassDropdown
                          trigger={
                            <GlassButton variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </GlassButton>
                          }
                          items={[
                            { key: 'edit', label: 'Επεξεργασία', icon: <Edit className="h-4 w-4" />, onClick: () => {} },
                            { key: 'stats', label: 'Στατιστικά', icon: <BarChart3 className="h-4 w-4" />, onClick: () => {} },
                            { key: 'divider', label: '', divider: true },
                            { key: 'delete', label: 'Διαγραφή', icon: <Trash2 className="h-4 w-4" />, onClick: () => handleDeleteClick('campaign', campaign.id, campaign.name), danger: true },
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </GlassTabsContent>

        {/* Templates Tab */}
        <GlassTabsContent value="templates" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Create New Template */}
            <GlassCard
              className="flex flex-col items-center justify-center min-h-[200px] border-dashed cursor-pointer hover:border-cyan-500/30"
              hover
              onClick={() => setTemplateModalOpen(true)}
            >
              <Plus className="h-8 w-8 text-white/40 mb-2" />
              <span className="text-sm text-white/60">Νέο Template</span>
            </GlassCard>

            {/* Templates */}
            {templates.map((template) => (
              <GlassCard key={template.id} className="group relative" hover glow="primary">
                <div className="aspect-video bg-gradient-to-br from-white/[0.02] to-white/[0.05] rounded-lg mb-4 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-white/20" />
                </div>
                <h3 className="font-medium text-white">{template.name}</h3>
                <div className="flex items-center justify-between mt-2">
                  <GlassBadge size="sm">{template.category}</GlassBadge>
                  <GlassButton 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick('template', template.id, template.name);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </GlassButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </GlassTabsContent>

        {/* Automations Tab */}
        <GlassTabsContent value="automations" className="mt-6">
          <GlassCard className="flex flex-col items-center justify-center py-16">
            <Zap className="h-12 w-12 text-amber-400/50 mb-4" />
            <h3 className="text-lg font-medium text-white">Email Αυτοματισμοί</h3>
            <p className="text-white/50 text-center mt-2 max-w-md">
              Δημιουργήστε αυτοματοποιημένες ροές email για καλωσόρισμα, follow-up,
              γενέθλια και re-engagement
            </p>
            <GlassButton variant="primary" className="mt-6" leftIcon={<Plus className="h-4 w-4" />}>
              Νέος Αυτοματισμός
            </GlassButton>
          </GlassCard>
        </GlassTabsContent>
      </GlassTabs>

      {/* New Campaign Modal */}
      <GlassModal
        isOpen={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
        title="Νέο Campaign"
        size="lg"
      >
        <div className="p-6 space-y-4">
          <GlassInput
            label="Όνομα Campaign *"
            value={campaignForm.name}
            onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="π.χ. Χειμερινές Προσφορές 2024"
          />
          <GlassInput
            label="Θέμα Email"
            value={campaignForm.subject}
            onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="π.χ. Μεγάλες Εκπτώσεις στα Χειμερινά Ελαστικά!"
          />
          <div className="flex justify-end gap-3 pt-4">
            <GlassButton variant="ghost" onClick={() => setCampaignModalOpen(false)}>
              Ακύρωση
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleCreateCampaign}
              disabled={saving || !campaignForm.name.trim()}
              leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            >
              {saving ? 'Δημιουργία...' : 'Δημιουργία'}
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* New Template Modal */}
      <GlassModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title="Νέο Template"
        size="lg"
      >
        <div className="p-6 space-y-4">
          <GlassInput
            label="Όνομα Template *"
            value={templateForm.name}
            onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="π.χ. Καλωσόρισμα Νέου Πελάτη"
          />
          <GlassInput
            label="Θέμα Email"
            value={templateForm.subject}
            onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="π.χ. Καλώς ήρθατε στην KK Tires!"
          />
          <GlassInput
            label="Κατηγορία"
            value={templateForm.category}
            onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
            placeholder="π.χ. welcome, offers, birthday"
          />
          <div className="flex justify-end gap-3 pt-4">
            <GlassButton variant="ghost" onClick={() => setTemplateModalOpen(false)}>
              Ακύρωση
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleCreateTemplate}
              disabled={saving || !templateForm.name.trim()}
              leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            >
              {saving ? 'Δημιουργία...' : 'Δημιουργία'}
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Διαγραφή"
        description={`Είστε σίγουροι ότι θέλετε να διαγράψετε το "${itemToDelete?.name}"? Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`}
        confirmText="Διαγραφή"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
