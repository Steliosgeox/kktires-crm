'use client';

import { CampaignRecipientsDrawer } from '@/components/email/campaign-recipients-drawer';
import { OutlookEditor } from '@/components/email/outlook-editor';
import { OutlookLayout } from '@/components/email/outlook-layout';
import { OutlookList } from '@/components/email/outlook-list';
import { OutlookRecipientDrawer } from '@/components/email/outlook-recipient-drawer';
import { OutlookSidebar } from '@/components/email/outlook-sidebar';
import { RecipientPreviewDrawer } from '@/components/email/recipient-preview-drawer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { hasRecipientSelection } from '@/lib/email/recipient-filters';

import { useEmailPageController } from './use-email-page-controller';

export default function EmailPage() {
  const {
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
    callbacks,
    workflow,
  } = useEmailPageController();

  return (
    <div className="h-[calc(100vh-64px)]">
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeleteId(null);
        }}
        onConfirm={callbacks.confirmDelete}
        title="Delete Campaign"
        description={
          deleteCampaignName
            ? `Delete campaign "${deleteCampaignName}"?`
            : 'Delete this campaign?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />

      <OutlookLayout
        sidebar={
          <OutlookSidebar
            activeItem={activeSection}
            onItemSelect={callbacks.handleSectionChange}
            onNewCampaign={callbacks.handleNewCampaign}
            folderCounts={folderCounts}
          />
        }
        list={
          <OutlookList
            items={listItems}
            type={listType}
            selectedId={listSelectedId}
            onSelect={
              listType === 'templates'
                ? callbacks.handleSelectTemplate
                : callbacks.handleSelectCampaign
            }
            onDelete={callbacks.handleDelete}
            onDuplicate={callbacks.handleDuplicate}
            onEdit={callbacks.handleSelectCampaign}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filter={statusFilter}
            onFilterChange={setStatusFilter}
            loading={loading}
          />
        }
        editor={
          <OutlookEditor
            draft={draft}
            draftActions={draftActions}
            workflow={{
              campaignId: selectedCampaignId,
              campaignStatus: selectedCampaignStatus,
              saving: workflow.saving,
              sending: workflow.sending,
              isNew: workflow.isNew,
              recipientCount,
            }}
            catalog={{ templates, signatures }}
            callbacks={{
              onSave: callbacks.handleSave,
              onSchedule: callbacks.handleSchedule,
              onCancel: callbacks.handleCancel,
              onOpenRecipients: () => setShowRecipientDrawer(true),
              onOpenRecipientsDrawer:
                (selectedCampaignId && usesDeliverySnapshot) ||
                hasRecipientSelection(draft.recipientFilters)
                  ? () => setShowRecipientsViewDrawer(true)
                  : undefined,
            }}
          />
        }
        showEditor={isEditing && !openingCampaignId}
      />

      {showRecipientsViewDrawer && selectedCampaignId && usesDeliverySnapshot && (
        <CampaignRecipientsDrawer
          key={`snapshot:${selectedCampaignId}`}
          isOpen={showRecipientsViewDrawer}
          onClose={() => setShowRecipientsViewDrawer(false)}
          campaignId={selectedCampaignId}
          campaignName={draft.campaignName}
        />
      )}

      {showRecipientsViewDrawer && !usesDeliverySnapshot && (
        <RecipientPreviewDrawer
          key={`preview:${previewDrawerKey}`}
          isOpen={showRecipientsViewDrawer}
          onClose={() => setShowRecipientsViewDrawer(false)}
          campaignName={draft.campaignName}
          filters={draft.recipientFilters}
        />
      )}

      <OutlookRecipientDrawer
        isOpen={showRecipientDrawer}
        onClose={() => setShowRecipientDrawer(false)}
        filters={draft.recipientFilters}
        onFiltersChange={(filters) => draftActions.setRecipientFilters(filters)}
        onPreviewRecipients={() => setShowRecipientsViewDrawer(true)}
      />

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
              type="button"
              onClick={() => setError(null)}
              className="hover:opacity-70"
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
