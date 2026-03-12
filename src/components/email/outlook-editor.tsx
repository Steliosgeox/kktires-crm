'use client';

import { OutlookComposeSurface } from './outlook-editor/outlook-compose-surface';
import { OutlookEditorHeader } from './outlook-editor/outlook-editor-header';
import { OutlookEditorToolbar } from './outlook-editor/outlook-editor-toolbar';
import { OutlookImageInspector } from './outlook-editor/outlook-image-inspector';
import { OutlookSchedulePanel } from './outlook-editor/outlook-schedule-panel';
import { useOutlookEditorController } from './outlook-editor/use-outlook-editor-controller';
import type {
  EmailComposerCatalog,
  EmailComposerDraft,
  EmailComposerDraftActions,
  OutlookEditorCallbacks,
  OutlookEditorWorkflow,
} from './outlook-editor/types';

export type { CampaignAttachment, InlineImageConfig, Signature, Template } from './outlook-editor/types';

interface OutlookEditorProps {
  draft: EmailComposerDraft;
  draftActions: EmailComposerDraftActions;
  workflow: OutlookEditorWorkflow;
  catalog: EmailComposerCatalog;
  callbacks: OutlookEditorCallbacks;
}

export function OutlookEditor({
  draft,
  draftActions,
  workflow,
  catalog,
  callbacks,
}: OutlookEditorProps) {
  const { editorRefs, uiState, uiActions, derived, handlers } = useOutlookEditorController({
    draft,
    draftActions,
    workflow,
    callbacks,
  });

  const scheduleOpen = uiState.activePopover === 'schedule';

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: 'var(--outlook-bg-surface)' }}
    >
      <OutlookSchedulePanel
        isOpen={scheduleOpen}
        scheduleDate={uiState.scheduleDate}
        scheduleTime={uiState.scheduleTime}
        disabled={derived.scheduleDisabled}
        onDateChange={uiActions.setScheduleDate}
        onTimeChange={uiActions.setScheduleTime}
        onSubmit={handlers.handleScheduleSubmit}
      />

      <div className="flex-1 overflow-y-auto outlook-scrollbar p-4">
        <div
          className="max-w-4xl mx-auto rounded-lg overflow-hidden"
          style={{
            background: 'var(--outlook-bg-panel)',
            border: '1px solid var(--outlook-border)',
            boxShadow: 'var(--outlook-shadow-md)',
          }}
        >
          <OutlookEditorHeader
            campaignId={workflow.campaignId}
            campaignName={draft.campaignName}
            subject={draft.subject}
            recipientFilters={draft.recipientFilters}
            campaignStatus={workflow.campaignStatus}
            isNew={workflow.isNew}
            actionsLocked={derived.actionsLocked}
            totalRecipients={derived.totalRecipients}
            saveDisabled={derived.saveDisabled}
            sendDisabled={derived.sendDisabled}
            scheduleDisabled={derived.scheduleDisabled}
            saving={workflow.saving}
            sending={workflow.sending}
            aiLoading={uiState.aiLoading}
            content={draft.content}
            onCampaignNameChange={draftActions.setCampaignName}
            onSubjectChange={draftActions.setSubject}
            onRecipientFiltersChange={draftActions.setRecipientFilters}
            onCancel={callbacks.onCancel}
            onSave={callbacks.onSave}
            onToggleSchedule={() => uiActions.togglePopover('schedule')}
            onOpenRecipients={callbacks.onOpenRecipients}
            onOpenRecipientsDrawer={callbacks.onOpenRecipientsDrawer}
            onSuggestSubject={() => handlers.handleAiAssist('subjects')}
          />

          <OutlookEditorToolbar
            templates={catalog.templates}
            activePopover={uiState.activePopover}
            showPreview={uiState.showPreview}
            actionsLocked={derived.actionsLocked}
            aiLoading={uiState.aiLoading}
            linkUrl={uiState.linkUrl}
            content={draft.content}
            uploadingImages={uiState.uploadingImages}
            uploadingAttachments={uiState.uploadingAttachments}
            onApplyEditorCommand={handlers.applyEditorCommand}
            onLinkUrlChange={uiActions.setLinkUrl}
            onSubmitLink={handlers.handleSubmitLink}
            onInsertImage={handlers.handleInsertImageClick}
            onInsertAttachment={handlers.handleInsertAttachmentClick}
            onTogglePopover={uiActions.togglePopover}
            onApplyTemplate={handlers.handleApplyTemplate}
            onInsertVariable={handlers.handleInsertVariable}
            onAiAction={handlers.handleAiAssist}
            onTogglePreview={uiActions.togglePreview}
          />

          <OutlookImageInspector
            selectedImageConfig={derived.selectedImageConfig}
            customWidth={uiState.customWidth}
            onCustomWidthChange={uiActions.setCustomWidth}
            onCustomWidthBlur={handlers.handleApplyCustomWidth}
            onApplyPercent={handlers.handleApplyImagePercent}
            onSetAlign={handlers.handleSetImageAlign}
            onSetAlt={handlers.handleSetImageAlt}
            onSetEmbedInline={handlers.handleSetImageEmbedInline}
            onReplace={handlers.handleReplaceSelectedImage}
            onRemove={handlers.handleRemoveSelectedImage}
          />

          <OutlookComposeSurface
            content={draft.content}
            attachments={draft.attachments}
            signatures={catalog.signatures}
            selectedSignature={draft.selectedSignature}
            showPreview={uiState.showPreview}
            previewMode={uiState.previewMode}
            actionsLocked={derived.actionsLocked}
            editorInstanceRef={editorRefs.editorRef}
            editableElementRef={editorRefs.editorEditableRef}
            imageInputRef={editorRefs.imageInputRef}
            attachmentInputRef={editorRefs.attachmentInputRef}
            onImageInputChange={handlers.handleImageSelected}
            onAttachmentInputChange={handlers.handleAttachmentSelected}
            onAttachmentRemove={(assetId) =>
              draftActions.setAttachments((current) =>
                current.filter((item) => item.assetId !== assetId)
              )
            }
            onPreviewModeChange={uiActions.setPreviewMode}
            onEditorChange={handlers.onEditorChange}
            onImageClick={uiActions.setSelectedImageAssetId}
            onSelectedSignatureChange={(value) => draftActions.setSelectedSignature(value)}
          />
        </div>
      </div>
    </div>
  );
}
