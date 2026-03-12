import { useMemo, useReducer } from 'react';

import type { OutlookEditorPopover, OutlookEditorUiState, PreviewMode } from './types';

type UiAction =
  | { type: 'toggle_popover'; popover: Exclude<OutlookEditorPopover, 'none'> }
  | { type: 'close_popovers' }
  | { type: 'toggle_preview' }
  | { type: 'set_preview_mode'; mode: PreviewMode }
  | { type: 'set_ai_loading'; value: boolean }
  | { type: 'set_link_url'; value: string }
  | { type: 'set_schedule_date'; value: string }
  | { type: 'set_schedule_time'; value: string }
  | { type: 'set_selected_image'; assetId: string | null }
  | { type: 'set_pending_replace'; assetId: string | null }
  | { type: 'set_custom_width'; value: string }
  | { type: 'set_uploading_images'; value: boolean }
  | { type: 'set_uploading_attachments'; value: boolean }
  | { type: 'reset_transient_state' };

export const INITIAL_OUTLOOK_EDITOR_UI_STATE: OutlookEditorUiState = {
  activePopover: 'none',
  showPreview: false,
  previewMode: 'desktop',
  aiLoading: false,
  linkUrl: '',
  scheduleDate: '',
  scheduleTime: '',
  selectedImageAssetId: null,
  pendingReplaceAssetId: null,
  customWidth: '',
  uploadingImages: false,
  uploadingAttachments: false,
};

export function reduceOutlookEditorUi(
  state: OutlookEditorUiState,
  action: UiAction
): OutlookEditorUiState {
  switch (action.type) {
    case 'toggle_popover':
      return {
        ...state,
        activePopover: state.activePopover === action.popover ? 'none' : action.popover,
      };
    case 'close_popovers':
      return { ...state, activePopover: 'none' };
    case 'toggle_preview':
      return { ...state, showPreview: !state.showPreview };
    case 'set_preview_mode':
      return { ...state, previewMode: action.mode };
    case 'set_ai_loading':
      return { ...state, aiLoading: action.value };
    case 'set_link_url':
      return { ...state, linkUrl: action.value };
    case 'set_schedule_date':
      return { ...state, scheduleDate: action.value };
    case 'set_schedule_time':
      return { ...state, scheduleTime: action.value };
    case 'set_selected_image':
      return { ...state, selectedImageAssetId: action.assetId };
    case 'set_pending_replace':
      return { ...state, pendingReplaceAssetId: action.assetId };
    case 'set_custom_width':
      return { ...state, customWidth: action.value };
    case 'set_uploading_images':
      return { ...state, uploadingImages: action.value };
    case 'set_uploading_attachments':
      return { ...state, uploadingAttachments: action.value };
    case 'reset_transient_state':
      return {
        ...state,
        activePopover: 'none',
        aiLoading: false,
        linkUrl: '',
        scheduleDate: '',
        scheduleTime: '',
        selectedImageAssetId: null,
        pendingReplaceAssetId: null,
        customWidth: '',
        uploadingImages: false,
        uploadingAttachments: false,
      };
    default:
      return state;
  }
}

export function useOutlookEditorUi() {
  const [uiState, dispatch] = useReducer(
    reduceOutlookEditorUi,
    INITIAL_OUTLOOK_EDITOR_UI_STATE
  );

  const uiActions = useMemo(
    () => ({
      togglePopover: (popover: Exclude<OutlookEditorPopover, 'none'>) =>
        dispatch({ type: 'toggle_popover', popover }),
      closePopovers: () => dispatch({ type: 'close_popovers' }),
      togglePreview: () => dispatch({ type: 'toggle_preview' }),
      setPreviewMode: (mode: PreviewMode) => dispatch({ type: 'set_preview_mode', mode }),
      setAiLoading: (value: boolean) => dispatch({ type: 'set_ai_loading', value }),
      setLinkUrl: (value: string) => dispatch({ type: 'set_link_url', value }),
      setScheduleDate: (value: string) => dispatch({ type: 'set_schedule_date', value }),
      setScheduleTime: (value: string) => dispatch({ type: 'set_schedule_time', value }),
      setSelectedImageAssetId: (assetId: string | null) =>
        dispatch({ type: 'set_selected_image', assetId }),
      setPendingReplaceAssetId: (assetId: string | null) =>
        dispatch({ type: 'set_pending_replace', assetId }),
      setCustomWidth: (value: string) => dispatch({ type: 'set_custom_width', value }),
      setUploadingImages: (value: boolean) => dispatch({ type: 'set_uploading_images', value }),
      setUploadingAttachments: (value: boolean) =>
        dispatch({ type: 'set_uploading_attachments', value }),
      resetTransientState: () => dispatch({ type: 'reset_transient_state' }),
    }),
    []
  );

  return { uiState, uiActions };
}
