import { getContext, setContext } from 'svelte';
import { get, writable, type Readable } from 'svelte/store';
import { workspaceId } from '../stores/workspaces';
import type { FileRevisionHistory } from '../types/actions';
import type { User } from '../types/app';
import { WorkspaceApi } from './workspaces';

export type FileRevisionHistoryStore = Readable<FileRevisionHistory> & {
  /** Fetches a file's revisions unless they are loaded or loading; `refresh` fetches them again. */
  load: (path: string, user: User | null, refresh?: boolean) => Promise<void>;
};

/** The revisions of the files selected in one form, kept per path so each file is fetched once. */
export function createFileRevisionHistory(): FileRevisionHistoryStore {
  const history = writable<FileRevisionHistory>({});
  const set = (path: string, value: FileRevisionHistory[string]) => history.update(all => ({ ...all, [path]: value }));

  async function load(path: string, user: User | null, refresh = false) {
    const current = get(history)[path];
    if (current === 'loading' || (current !== undefined && current !== 'error' && !refresh)) {
      return;
    }
    set(path, 'loading');
    try {
      const { revisions } = await WorkspaceApi.getFileRevisionList(get(workspaceId), path, user);
      set(path, revisions);
    } catch {
      set(path, 'error');
    }
  }

  return { load, subscribe: history.subscribe };
}

/** For the form that owns the run or settings: its file inputs share the history, so it can also gate on it. */
export function provideFileRevisionHistory(): FileRevisionHistoryStore {
  const history = createFileRevisionHistory();
  setContext('fileRevisionHistory', history);
  return history;
}

export function getFileRevisionHistory(): FileRevisionHistoryStore {
  return getContext<FileRevisionHistoryStore>('fileRevisionHistory');
}
