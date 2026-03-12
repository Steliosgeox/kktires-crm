import {
  INITIAL_OUTLOOK_EDITOR_UI_STATE,
  reduceOutlookEditorUi,
} from '@/components/email/outlook-editor/use-outlook-editor-ui';

describe('outlook editor ui reducer', () => {
  it('keeps only one popover open at a time', () => {
    const withTemplates = reduceOutlookEditorUi(INITIAL_OUTLOOK_EDITOR_UI_STATE, {
      type: 'toggle_popover',
      popover: 'templates',
    });
    const withVariables = reduceOutlookEditorUi(withTemplates, {
      type: 'toggle_popover',
      popover: 'variables',
    });

    expect(withTemplates.activePopover).toBe('templates');
    expect(withVariables.activePopover).toBe('variables');
  });

  it('toggles preview and preview mode independently from popovers', () => {
    const previewOpen = reduceOutlookEditorUi(INITIAL_OUTLOOK_EDITOR_UI_STATE, {
      type: 'toggle_preview',
    });
    const mobilePreview = reduceOutlookEditorUi(previewOpen, {
      type: 'set_preview_mode',
      mode: 'mobile',
    });

    expect(previewOpen.showPreview).toBe(true);
    expect(mobilePreview.previewMode).toBe('mobile');
    expect(mobilePreview.activePopover).toBe('none');
  });

  it('resets transient selection and upload state without touching preview mode', () => {
    const dirtyState = {
      ...INITIAL_OUTLOOK_EDITOR_UI_STATE,
      activePopover: 'schedule' as const,
      showPreview: true,
      previewMode: 'dark' as const,
      aiLoading: true,
      linkUrl: 'https://example.com',
      scheduleDate: '2026-03-12',
      scheduleTime: '09:00',
      selectedImageAssetId: 'asset-1',
      pendingReplaceAssetId: 'asset-2',
      customWidth: '640',
      uploadingImages: true,
      uploadingAttachments: true,
    };

    const reset = reduceOutlookEditorUi(dirtyState, {
      type: 'reset_transient_state',
    });

    expect(reset.activePopover).toBe('none');
    expect(reset.showPreview).toBe(true);
    expect(reset.previewMode).toBe('dark');
    expect(reset.aiLoading).toBe(false);
    expect(reset.linkUrl).toBe('');
    expect(reset.scheduleDate).toBe('');
    expect(reset.selectedImageAssetId).toBeNull();
    expect(reset.pendingReplaceAssetId).toBeNull();
    expect(reset.customWidth).toBe('');
    expect(reset.uploadingImages).toBe(false);
    expect(reset.uploadingAttachments).toBe(false);
  });
});
