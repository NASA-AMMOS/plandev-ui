import { derived, get, writable, type Readable } from 'svelte/store';
import type { WorkspaceContentType } from '../enums/workspace';

/* Types */

export interface ActiveDocumentState {
  currentContent: string;
  fileName: string | null;
  isLoading: boolean;
  loadingPath: string | null;
  originalContent: string;
  path: string | null;
  type: WorkspaceContentType | null;
}

export interface ActiveDocumentStore {
  /** Cancel a pending load (if user navigates away before load completes). */
  cancelLoad: () => void;

  /** Close the current document. */
  close: () => void;

  /** Mark the document as clean (after save). Syncs originalContent with currentContent. */
  markClean: (savedContent?: string) => void;

  /**
   * Open a document after content has been loaded.
   * Only updates if the path matches loadingPath (stale check).
   * Returns true if the document was opened, false if stale.
   */
  open: (path: string, content: string) => boolean;

  /** Reset the store to initial state. */
  reset: () => void;

  /**
   * Start loading a new document. Immediately updates path/fileName/type,
   * clears content, and sets isLoading flag. This ensures the UI shows
   * the new file info immediately while content loads.
   */
  startLoad: (path: string, fileName: string | null, type: WorkspaceContentType | null) => void;

  subscribe: typeof internalStore.subscribe;

  /** Update the current content (called on editor changes). */
  updateContent: (content: string) => void;

  /** Update the document path (after rename/move). */
  updatePath: (newPath: string, newFileName?: string) => void;
}

/* Constants */

const initialState: ActiveDocumentState = {
  currentContent: '',
  fileName: null,
  isLoading: false,
  loadingPath: null,
  originalContent: '',
  path: null,
  type: null,
};

/* Internal Store */

const internalStore = writable<ActiveDocumentState>(initialState);

/* Custom Store */

function createActiveDocumentStore(): ActiveDocumentStore {
  const { set, subscribe, update } = internalStore;

  return {
    cancelLoad(): void {
      update(state => ({
        ...state,
        isLoading: false,
        loadingPath: null,
      }));
    },

    close(): void {
      set(initialState);
    },

    markClean(savedContent?: string): void {
      update(state => ({
        ...state,
        originalContent: savedContent ?? state.currentContent,
      }));
    },

    open(path: string, content: string): boolean {
      const currentState = get(internalStore);

      // Stale response check: only proceed if this is the path we're expecting
      if (currentState.loadingPath !== path) {
        return false;
      }

      update(state => ({
        ...state,
        currentContent: content,
        isLoading: false,
        loadingPath: null,
        originalContent: content,
      }));

      return true;
    },

    reset(): void {
      set(initialState);
    },

    startLoad(path: string, fileName: string | null, type: WorkspaceContentType | null): void {
      set({
        currentContent: '',
        fileName,
        isLoading: true,
        loadingPath: path,
        originalContent: '',
        path,
        type,
      });
    },

    subscribe,

    updateContent(content: string): void {
      update(state => ({
        ...state,
        currentContent: content,
      }));
    },

    updatePath(newPath: string, newFileName?: string): void {
      update(state => ({
        ...state,
        fileName: newFileName ?? state.fileName,
        path: newPath,
      }));
    },
  };
}

export const activeDocument = createActiveDocumentStore();

/* Derived Stores */

export const activeDocumentIsDirty: Readable<boolean> = derived(
  activeDocument,
  $activeDocument => $activeDocument.currentContent !== $activeDocument.originalContent,
);

export const activeDocumentPath: Readable<string | null> = derived(
  activeDocument,
  $activeDocument => $activeDocument.path,
);

export const activeDocumentIsLoading: Readable<boolean> = derived(
  activeDocument,
  $activeDocument => $activeDocument.isLoading,
);
