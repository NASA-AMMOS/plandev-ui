import { derived, get, writable, type Readable } from 'svelte/store';
import type { WorkspaceContentType } from '../enums/workspace';

/* Types */

export interface ActiveDocumentState {
  /**
   * The server's ETag for the version the editor is based on. Sent back on save so the
   * server can reject it if the file changed underneath. Opaque — only stored and echoed.
   */
  baseEtag: string | null;
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

  /**
   * Mark the document clean after save (syncs originalContent). Pass `newEtag` to also
   * advance `baseEtag`.
   */
  markClean: (savedContent?: string, newEtag?: string | null) => void;

  /**
   * Open a loaded document and store its `etag` as `baseEtag`. Skips stale loads (only
   * applies when `path` matches `loadingPath`). Returns false if stale.
   */
  open: (path: string, content: string, etag: string | null) => boolean;

  /**
   * Rebase the document onto `content` + `etag` and mark it clean (e.g. "take theirs", or
   * after a merged save). Only applies if `path` is still active. Returns false otherwise.
   */
  replaceWithServer: (path: string, content: string, etag: string | null) => boolean;

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

  /** Update the document path and optionally type (after rename/move). */
  updatePath: (newPath: string, newFileName?: string, newType?: WorkspaceContentType | null) => void;
}

/* Constants */

const initialState: ActiveDocumentState = {
  baseEtag: null,
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

    markClean(savedContent?: string, newEtag?: string | null): void {
      update(state => ({
        ...state,
        baseEtag: newEtag !== undefined ? newEtag : state.baseEtag,
        originalContent: savedContent ?? state.currentContent,
      }));
    },

    open(path: string, content: string, etag: string | null): boolean {
      const currentState = get(internalStore);

      // Stale response check: only proceed if this is the path we're expecting
      if (currentState.loadingPath !== path) {
        return false;
      }

      update(state => ({
        ...state,
        baseEtag: etag,
        currentContent: content,
        isLoading: false,
        loadingPath: null,
        originalContent: content,
      }));

      return true;
    },

    replaceWithServer(path: string, content: string, etag: string | null): boolean {
      const currentState = get(internalStore);

      // Only replace if this is still the active document (no in-flight load to guard on).
      if (currentState.path !== path) {
        return false;
      }

      update(state => ({
        ...state,
        baseEtag: etag,
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
        baseEtag: null,
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

    updatePath(newPath: string, newFileName?: string, newType?: WorkspaceContentType | null): void {
      update(state => ({
        ...state,
        fileName: newFileName ?? state.fileName,
        path: newPath,
        type: newType !== undefined ? newType : state.type,
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
