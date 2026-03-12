import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ChangeEvent,
} from 'react';

import { toast } from '@/lib/stores/ui-store';
import { sanitizeHtml } from '@/lib/html-sanitize';
import type { CKEditorInstance } from '@/components/email/ck-email-editor';

import {
  applyInlineImageConfigToHtml,
  buildInlineImageHtml,
  hasInlineImageAssetId,
  reconcileInlineImages,
  removeInlineImageConfig,
  removeInlineImageFromHtml,
  replaceInlineImageAsset,
  upsertInlineImageConfig,
} from './email-html';
import {
  createAttachmentFromAsset,
  optimizeImageFile,
  uploadEmailAsset,
} from './email-assets';
import { requestAiAssist } from './email-ai';
import { useOutlookEditorUi } from './use-outlook-editor-ui';
import type {
  EmailAiAction,
  EmailComposerDraft,
  EmailComposerDraftActions,
  InlineImageConfig,
  OutlookEditorCallbacks,
  OutlookEditorWorkflow,
  Template,
} from './types';

type SyncInlineImagesTransform = (inlineImages: InlineImageConfig[]) => InlineImageConfig[];

type UseOutlookEditorControllerArgs = {
  draft: EmailComposerDraft;
  draftActions: EmailComposerDraftActions;
  workflow: OutlookEditorWorkflow;
  callbacks: Pick<OutlookEditorCallbacks, 'onSchedule'>;
};

export function useOutlookEditorController({
  draft,
  draftActions,
  workflow,
  callbacks,
}: UseOutlookEditorControllerArgs) {
  const { uiState, uiActions } = useOutlookEditorUi();
  const editorRef = useRef<CKEditorInstance | null>(null);
  const editorEditableRef = useRef<HTMLElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const lastCampaignKeyRef = useRef<string | null>(null);
  const lastSyncedHtmlRef = useRef('');
  const selectedImageConfigRef = useRef<InlineImageConfig | null>(null);

  const totalRecipients = workflow.recipientCount ?? 0;
  const hasRecipients = totalRecipients > 0;
  const isSentCampaign = workflow.campaignStatus === 'sent';
  const isSendingCampaign = workflow.campaignStatus === 'sending';
  const actionsLocked = isSentCampaign || isSendingCampaign;
  const saveDisabled = workflow.saving || workflow.sending || actionsLocked;
  const sendDisabled = workflow.saving || workflow.sending || !hasRecipients || actionsLocked;
  const scheduleDisabled = workflow.saving || workflow.sending || !hasRecipients || actionsLocked;

  const selectedImageConfig = uiState.selectedImageAssetId
    ? draft.inlineImages.find((image) => image.assetId === uiState.selectedImageAssetId) ?? null
    : null;

  const syncDraftWithHtml = useCallback(
    (html: string, transformInlineImages?: SyncInlineImagesTransform) => {
      draftActions.setContent(html);
      draftActions.setInlineImages((current) =>
        reconcileInlineImages(html, transformInlineImages ? transformInlineImages(current) : current)
      );

      if (!hasInlineImageAssetId(html, uiState.selectedImageAssetId)) {
        uiActions.setSelectedImageAssetId(null);
      }
    },
    [draftActions, uiActions, uiState.selectedImageAssetId]
  );

  const replaceEditorHtml = useCallback(
    (html: string, sanitize = false, transformInlineImages?: SyncInlineImagesTransform) => {
      const nextHtml = sanitize ? sanitizeHtml(html) : html;
      editorRef.current?.setData(nextHtml);
      lastSyncedHtmlRef.current = sanitizeHtml(nextHtml);
      syncDraftWithHtml(nextHtml, transformInlineImages);
      return nextHtml;
    },
    [syncDraftWithHtml]
  );

  const insertHtmlAtSelection = useCallback(
    (html: string, transformInlineImages?: SyncInlineImagesTransform) => {
      const editor = editorRef.current;
      if (!editor) return false;

      const viewFragment = editor.data.processor.toView(html);
      const modelFragment = editor.data.toModel(viewFragment);
      editor.model.insertContent(modelFragment);
      const nextHtml = editor.getData();
      lastSyncedHtmlRef.current = sanitizeHtml(nextHtml);
      syncDraftWithHtml(nextHtml, transformInlineImages);
      return true;
    },
    [syncDraftWithHtml]
  );

  useEffect(() => {
    const key = `${workflow.campaignId ?? 'new'}:${workflow.isNew ? 'new' : 'existing'}`;
    const next = sanitizeHtml(draft.content || '');
    const campaignChanged = lastCampaignKeyRef.current !== key;
    const contentAlreadySynced = next === lastSyncedHtmlRef.current;

    if (!campaignChanged && contentAlreadySynced) return;

    lastCampaignKeyRef.current = key;
    if (campaignChanged) {
      uiActions.resetTransientState();
    }

    const editor = editorRef.current;
    if (editor && editor.getData() !== next) {
      editor.setData(next);
    }
    lastSyncedHtmlRef.current = next;
  }, [draft.content, uiActions, workflow.campaignId, workflow.isNew]);

  useEffect(() => {
    uiActions.setCustomWidth(selectedImageConfig?.widthPx ? String(selectedImageConfig.widthPx) : '');
  }, [selectedImageConfig?.assetId, selectedImageConfig?.widthPx, uiActions]);

  useEffect(() => {
    selectedImageConfigRef.current = selectedImageConfig;
  }, [selectedImageConfig]);

  useEffect(() => {
    const editor = editorRef.current;
    const config = selectedImageConfigRef.current;
    if (!config || !editor) return;

    const currentHtml = editor.getData();
    const result = applyInlineImageConfigToHtml(currentHtml, config);
    if (!result.updated || result.html === currentHtml) return;

    editor.setData(result.html);
    lastSyncedHtmlRef.current = sanitizeHtml(result.html);
    syncDraftWithHtml(result.html);
  }, [
    selectedImageConfig?.assetId,
    selectedImageConfig?.widthPx,
    selectedImageConfig?.align,
    selectedImageConfig?.alt,
    selectedImageConfig?.embedInline,
    syncDraftWithHtml,
  ]);

  const applyEditorCommand = useCallback((command: string, value?: string) => {
    if (actionsLocked) return;

    const editor = editorRef.current;
    if (!editor) return;

    const commandMap: Record<string, string> = {
      bold: 'bold',
      italic: 'italic',
      underline: 'underline',
      insertUnorderedList: 'bulletedList',
      insertOrderedList: 'numberedList',
      justifyLeft: 'alignment',
      justifyCenter: 'alignment',
      justifyRight: 'alignment',
      justifyFull: 'alignment',
    };

    const ckCommand = commandMap[command] ?? command;

    if (command === 'justifyLeft') {
      editor.execute('alignment', { value: 'left' });
    } else if (command === 'justifyCenter') {
      editor.execute('alignment', { value: 'center' });
    } else if (command === 'justifyRight') {
      editor.execute('alignment', { value: 'right' });
    } else if (command === 'justifyFull') {
      editor.execute('alignment', { value: 'justify' });
    } else if (command === 'createLink' && value) {
      editor.execute('link', value);
    } else if (value !== undefined) {
      editor.execute(ckCommand, { value });
    } else {
      editor.execute(ckCommand);
    }
  }, [actionsLocked]);

  const handleEditorChange = useCallback(
    (html: string) => {
      if (actionsLocked) return;
      lastSyncedHtmlRef.current = sanitizeHtml(html);
      syncDraftWithHtml(html);
    },
    [actionsLocked, syncDraftWithHtml]
  );

  const handleSubmitLink = useCallback(() => {
    if (actionsLocked) return;

    const raw = uiState.linkUrl.trim();
    if (!raw) {
      uiActions.setLinkUrl('');
      uiActions.closePopovers();
      return;
    }

    const nextUrl = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;

    try {
      const url = new URL(nextUrl).toString();
      applyEditorCommand('createLink', url);
      uiActions.setLinkUrl('');
      uiActions.closePopovers();
    } catch {
      toast.error('Invalid link', 'Enter a valid URL.');
    }
  }, [actionsLocked, applyEditorCommand, uiActions, uiState.linkUrl]);

  const handleInsertImageClick = useCallback(() => {
    if (actionsLocked) return;
    uiActions.setPendingReplaceAssetId(null);
    imageInputRef.current?.click();
  }, [actionsLocked, uiActions]);

  const handleImageSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      if (actionsLocked) {
        event.target.value = '';
        return;
      }

      const file = event.target.files?.[0];
      if (!file) {
        event.target.value = '';
        return;
      }

      event.target.value = '';

      if (!file.type.startsWith('image/')) {
        toast.error('Invalid file type', 'Please select an image (PNG, JPG, WEBP, GIF).');
        return;
      }

      try {
        uiActions.setUploadingImages(true);

        const optimized = await optimizeImageFile(file);
        const asset = await uploadEmailAsset(optimized.file, 'image', {
          width: optimized.width ?? undefined,
          height: optimized.height ?? undefined,
        });

        const editor = editorRef.current;
        if (!editor) return;

        if (uiState.pendingReplaceAssetId) {
          const currentHtml = editor.getData();
          const replacement = replaceInlineImageAsset(currentHtml, {
            currentAssetId: uiState.pendingReplaceAssetId,
            nextAssetId: asset.id,
            nextBlobUrl: asset.blobUrl,
          });

          if (replacement.replaced) {
            const currentConfig = draft.inlineImages.find(
              (item) => item.assetId === uiState.pendingReplaceAssetId
            );

            uiActions.setSelectedImageAssetId(asset.id);
            replaceEditorHtml(replacement.html, false, (current) =>
              upsertInlineImageConfig(
                removeInlineImageConfig(current, uiState.pendingReplaceAssetId as string),
                {
                  assetId: asset.id,
                  embedInline: currentConfig?.embedInline ?? false,
                  widthPx: currentConfig?.widthPx ?? null,
                  align: currentConfig?.align ?? null,
                  alt: currentConfig?.alt ?? replacement.alt,
                  sortOrder: current.length,
                }
              )
            );
            return;
          }
        }

        const imageHtml = buildInlineImageHtml(asset.id, asset.blobUrl);
        const inserted = insertHtmlAtSelection(imageHtml, (current) =>
          upsertInlineImageConfig(current, {
            assetId: asset.id,
            embedInline: false,
            widthPx: null,
            align: null,
            alt: null,
            sortOrder: current.length,
          })
        );

        if (!inserted) {
          replaceEditorHtml(`${draft.content}${imageHtml}`, false, (current) =>
            upsertInlineImageConfig(current, {
              assetId: asset.id,
              embedInline: false,
              widthPx: null,
              align: null,
              alt: null,
              sortOrder: current.length,
            })
          );
        }

        uiActions.setSelectedImageAssetId(asset.id);
      } catch (error) {
        console.error('Image insert error:', error);
        toast.error(
          'Image insert failed',
          error instanceof Error ? error.message : 'Could not add image to email body.'
        );
      } finally {
        uiActions.setUploadingImages(false);
        uiActions.setPendingReplaceAssetId(null);
      }
    },
    [
      actionsLocked,
      draft.content,
      draft.inlineImages,
      insertHtmlAtSelection,
      replaceEditorHtml,
      uiActions,
      uiState.pendingReplaceAssetId,
    ]
  );

  const handleInsertAttachmentClick = useCallback(() => {
    if (actionsLocked) return;
    attachmentInputRef.current?.click();
  }, [actionsLocked]);

  const handleAttachmentSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      if (actionsLocked) {
        event.target.value = '';
        return;
      }

      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList);
      event.target.value = '';

      try {
        uiActions.setUploadingAttachments(true);

        for (const file of files) {
          const asset = await uploadEmailAsset(file, 'file');
          draftActions.setAttachments((current) => {
            if (current.some((item) => item.assetId === asset.id)) {
              return current;
            }

            return [...current, createAttachmentFromAsset(asset)];
          });
        }
      } catch (error) {
        toast.error(
          'Attachment upload failed',
          error instanceof Error ? error.message : 'Could not attach file.'
        );
      } finally {
        uiActions.setUploadingAttachments(false);
      }
    },
    [actionsLocked, draftActions, uiActions]
  );

  const handleApplyTemplate = useCallback(
    (template: Template) => {
      if (actionsLocked) return;

      draftActions.updateDraft({
        campaignName: template.name,
        subject: template.subject,
        attachments: [],
      });
      replaceEditorHtml(template.content || '', true);
      uiActions.closePopovers();
    },
    [actionsLocked, draftActions, replaceEditorHtml, uiActions]
  );

  const handleInsertVariable = useCallback(
    (tag: string) => {
      if (actionsLocked) return;

      const editor = editorRef.current;
      if (editor) {
        editor.model.change((writer) => {
          const insertPosition = editor.model.document.selection.getFirstPosition();
          if (insertPosition) {
            writer.insertText(tag, insertPosition);
          }
        });
        syncDraftWithHtml(editor.getData());
      } else {
        draftActions.setContent((current) => `${current}${tag}`);
      }

      uiActions.closePopovers();
    },
    [actionsLocked, draftActions, syncDraftWithHtml, uiActions]
  );

  const handleAiAssist = useCallback(
    async (action: EmailAiAction) => {
      if (actionsLocked) return;

      uiActions.setAiLoading(true);

      try {
        const currentContent = editorRef.current?.getData() ?? draft.content;
        const result = await requestAiAssist(action, currentContent);

        if (action === 'subjects') {
          if (result.subjects?.length) {
            draftActions.setSubject(result.subjects[0]);
          }
          return;
        }

        if (result.content) {
          replaceEditorHtml(result.content, true);
        }
      } catch (error) {
        console.error('AI assist error:', error);
        toast.error(
          'AI action failed',
          error instanceof Error ? error.message : 'Could not process the AI request.'
        );
      } finally {
        uiActions.setAiLoading(false);
      }
    },
    [actionsLocked, draft.content, draftActions, replaceEditorHtml, uiActions]
  );

  const handleScheduleSubmit = useCallback(() => {
    if (actionsLocked) return;

    if (!uiState.scheduleDate || !uiState.scheduleTime) {
      toast.warning('Απαιτείται ημερομηνία/ώρα', 'Επιλέξτε ημερομηνία και ώρα.');
      return;
    }

    const dt = new Date(`${uiState.scheduleDate}T${uiState.scheduleTime}:00`);
    if (isNaN(dt.getTime())) {
      toast.error('Μη έγκυρη ημερομηνία/ώρα', 'Ελέγξτε τα πεδία και δοκιμάστε ξανά.');
      return;
    }

    callbacks.onSchedule(dt.toISOString());
    uiActions.closePopovers();
    uiActions.setScheduleDate('');
    uiActions.setScheduleTime('');
  }, [actionsLocked, callbacks, uiActions, uiState.scheduleDate, uiState.scheduleTime]);

  const handleApplyImagePercent = useCallback(
    (pct: number) => {
      if (actionsLocked || !selectedImageConfig) return;

      const editorWidth = Math.max(320, editorEditableRef.current?.clientWidth || 800);
      const width = Math.round((editorWidth * pct) / 100);

      draftActions.setInlineImages((current) =>
        current.map((item, index) =>
          item.assetId === selectedImageConfig.assetId
            ? { ...item, widthPx: width, sortOrder: index }
            : { ...item, sortOrder: index }
        )
      );
    },
    [actionsLocked, draftActions, selectedImageConfig]
  );

  const handleApplyCustomWidth = useCallback(() => {
    if (actionsLocked || !selectedImageConfig) return;

    const parsed = Number.parseInt(uiState.customWidth, 10);
    const width = Number.isFinite(parsed) ? Math.max(32, Math.min(2400, parsed)) : null;

    draftActions.setInlineImages((current) =>
      current.map((item, index) =>
        item.assetId === selectedImageConfig.assetId
          ? { ...item, widthPx: width, sortOrder: index }
          : { ...item, sortOrder: index }
      )
    );
  }, [actionsLocked, draftActions, selectedImageConfig, uiState.customWidth]);

  const handleSetImageAlign = useCallback(
    (align: InlineImageConfig['align']) => {
      if (actionsLocked || !selectedImageConfig) return;

      draftActions.setInlineImages((current) =>
        current.map((item, index) =>
          item.assetId === selectedImageConfig.assetId
            ? { ...item, align, sortOrder: index }
            : { ...item, sortOrder: index }
        )
      );
    },
    [actionsLocked, draftActions, selectedImageConfig]
  );

  const handleSetImageAlt = useCallback(
    (alt: string) => {
      if (actionsLocked || !selectedImageConfig) return;
      const nextAlt = alt.trim();

      draftActions.setInlineImages((current) =>
        current.map((item, index) =>
          item.assetId === selectedImageConfig.assetId
            ? { ...item, alt: nextAlt || null, sortOrder: index }
            : { ...item, sortOrder: index }
        )
      );
    },
    [actionsLocked, draftActions, selectedImageConfig]
  );

  const handleSetImageEmbedInline = useCallback(
    (checked: boolean) => {
      if (actionsLocked || !selectedImageConfig) return;

      draftActions.setInlineImages((current) =>
        current.map((item, index) =>
          item.assetId === selectedImageConfig.assetId
            ? { ...item, embedInline: checked, sortOrder: index }
            : { ...item, sortOrder: index }
        )
      );
    },
    [actionsLocked, draftActions, selectedImageConfig]
  );

  const handleReplaceSelectedImage = useCallback(() => {
    if (actionsLocked) return;
    if (!uiState.selectedImageAssetId) return;
    uiActions.setPendingReplaceAssetId(uiState.selectedImageAssetId);
    imageInputRef.current?.click();
  }, [actionsLocked, uiActions, uiState.selectedImageAssetId]);

  const handleRemoveSelectedImage = useCallback(() => {
    if (actionsLocked) return;

    const editor = editorRef.current;
    if (!uiState.selectedImageAssetId || !editor) return;

    const result = removeInlineImageFromHtml(editor.getData(), uiState.selectedImageAssetId);
    if (!result.removed) return;

    replaceEditorHtml(result.html, false, (current) =>
      removeInlineImageConfig(current, uiState.selectedImageAssetId as string)
    );
    uiActions.setSelectedImageAssetId(null);
  }, [actionsLocked, replaceEditorHtml, uiActions, uiState.selectedImageAssetId]);

  const derived = useMemo(
    () => ({
      totalRecipients,
      hasRecipients,
      isSentCampaign,
      isSendingCampaign,
      actionsLocked,
      saveDisabled,
      sendDisabled,
      scheduleDisabled,
      selectedImageConfig,
    }),
    [
      actionsLocked,
      hasRecipients,
      isSendingCampaign,
      isSentCampaign,
      saveDisabled,
      scheduleDisabled,
      selectedImageConfig,
      sendDisabled,
      totalRecipients,
    ]
  );

  return {
    editorRefs: {
      editorRef,
      editorEditableRef,
      imageInputRef,
      attachmentInputRef,
    },
    uiState,
    uiActions,
    derived,
    handlers: {
      onEditorChange: handleEditorChange,
      applyEditorCommand,
      handleSubmitLink,
      handleInsertImageClick,
      handleImageSelected,
      handleInsertAttachmentClick,
      handleAttachmentSelected,
      handleApplyTemplate,
      handleInsertVariable,
      handleAiAssist,
      handleScheduleSubmit,
      handleApplyImagePercent,
      handleApplyCustomWidth,
      handleSetImageAlign,
      handleSetImageAlt,
      handleSetImageEmbedInline,
      handleReplaceSelectedImage,
      handleRemoveSelectedImage,
    },
  };
}
