import { writable } from 'svelte/store';

/** Action Functions. */

export const panelActions = {
  createPanel(visible = false) {
    const { subscribe, update } = writable({ visible });
    return {
      hide: () => update(panel => ({ ...panel, visible: false })),
      show: () =>
        update(panel => panelActions.hideAll() && { ...panel, visible: true }),
      subscribe,
    };
  },

  hideAll(): boolean {
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
  },

  reset(): void {
    activityDictionaryPanel.show();
  },
};

/** Stores. */

export const activityDictionaryPanel = panelActions.createPanel(true);
export const constraintEditorPanel = panelActions.createPanel(false);
export const constraintListPanel = panelActions.createPanel(false);
export const constraintViolationsPanel = panelActions.createPanel(false);
export const schedulingPanel = writable<boolean>(false);
export const schedulingPanelEditor = writable<boolean>(false);
export const selectedActivityPanel = panelActions.createPanel(false);
export const selectedTimelinePanel = panelActions.createPanel(false);
export const simulationConfigurationPanel = panelActions.createPanel(false);
export const viewEditorPanel = panelActions.createPanel(false);
export const viewManagerPanel = panelActions.createPanel(false);
