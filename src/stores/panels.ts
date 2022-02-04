import { writable } from 'svelte/store';

/** Stores. */

export const activityDictionaryPanel = createPanel(true);
export const constraintEditorPanel = createPanel(false);
export const constraintListPanel = createPanel(false);
export const constraintViolationsPanel = createPanel(false);
export const selectedActivityPanel = createPanel(false);
export const selectedTimelinePanel = createPanel(false);
export const simulationConfigurationPanel = createPanel(false);
export const viewEditorPanel = createPanel(false);
export const viewManagerPanel = createPanel(false);

/** Utility Functions. */

function createPanel(visible = false) {
  const { subscribe, update } = writable({ visible });
  return {
    hide: () => update(panel => ({ ...panel, visible: false })),
    show: () => update(panel => hideAll() && { ...panel, visible: true }),
    subscribe,
  };
}

function hideAll(): boolean {
  activityDictionaryPanel.hide();
  constraintEditorPanel.hide();
  constraintListPanel.hide();
  constraintViolationsPanel.hide();
  selectedActivityPanel.hide();
  selectedTimelinePanel.hide();
  simulationConfigurationPanel.hide();
  viewEditorPanel.hide();
  viewManagerPanel.hide();
  return true;
}
