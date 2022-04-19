import { writable } from 'svelte/store';

/** Action Functions. */

export const panelActions = {
  createPanel(visible = false) {
    const { subscribe, update } = writable({ visible });
    return {
      hide: () => update(panel => ({ ...panel, visible: false })),
      show: () => update(panel => panelActions.hideAll() && { ...panel, visible: true }),
      subscribe,
    };
  },

  hideAll(): boolean {
    activityTypesPanel.hide();
    constraintEditorPanel.hide();
    constraintsPanel.hide();
    constraintViolationsPanel.hide();
    selectedActivityPanel.hide();
    selectedTimelinePanel.hide();
    simulationPanel.hide();
    viewEditorPanel.hide();
    viewsPanel.hide();
    return true;
  },

  reset(): void {
    activityTypesPanel.show();
  },
};

/** Stores. */

export const activityTypesPanel = panelActions.createPanel(true);
export const constraintEditorPanel = panelActions.createPanel(false);
export const constraintsPanel = panelActions.createPanel(false);
export const constraintViolationsPanel = panelActions.createPanel(false);
export const schedulingPanel = writable<boolean>(false);
export const schedulingPanelEditor = writable<boolean>(false);
export const selectedActivityPanel = panelActions.createPanel(false);
export const selectedTimelinePanel = panelActions.createPanel(false);
export const simulationPanel = panelActions.createPanel(false);
export const viewEditorPanel = panelActions.createPanel(false);
export const viewsPanel = panelActions.createPanel(false);
