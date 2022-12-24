import type { Writable } from 'svelte/store';

export type TabId = number | string | Record<string, never>;
export type PanelId = TabId;

export interface TabContext {
  registerPanel: (panelId: PanelId) => void;
  registerTab: (tabId: TabId) => void;
  selectTab: (tabId: TabId) => void;
  selectedPanel: Writable<TabId>;
  selectedTab: Writable<TabId>;
  unregisterPanel: (panelId: PanelId) => void;
  unregisterTab: (tabId: TabId) => void;
}
