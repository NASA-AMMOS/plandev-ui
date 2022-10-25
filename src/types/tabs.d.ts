type TabId = number | string | Record<string, never>;
type PanelId = TabId;

interface TabContext {
  registerPanel: (panelId: PanelId) => void;
  registerTab: (tabId: TabId) => void;
  selectTab: (tabId: TabId) => void;
  selectedPanel: Writable<TabId>;
  selectedTab: Writable<TabId>;
  unregisterPanel: (panelId: PanelId) => void;
  unregisterTab: (tabId: TabId) => void;
}
