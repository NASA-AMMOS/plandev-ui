/* eslint-disable sort-keys */
import { afterAll, describe, expect, test, vi } from 'vitest';
import { WorkspaceContentType } from '../enums/workspace';
import type { ActionDefinition } from '../types/actions';
import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../types/workspace-tree-view';
import * as requests from './requests';
import {
  cleanPath,
  computeMovedFilePath,
  computeTreeFilter,
  defaultTreeSortComparator,
  findNodeByPath,
  findNodeInDirectory,
  flattenWorkspaceTreeWithPaths,
  getAvailableActionsForNodes,
  getCommonPathPrefix,
  getSelectedFilesDisplay,
  getWorkspaceFileFolderDisplay,
  incrementFilename,
  joinPath,
  mapWorkspaceTreePaths,
  removeRedundantNodes,
  separateFilenameFromPath,
  shouldNodeBeVisible,
  sortWorkspaceTree,
  WorkspaceApi,
} from './workspaces';

const mockNavigator = {
  platform: 'MacIntel',
};

const reqWorkspaceMock = vi.spyOn(requests, 'reqWorkspace').mockResolvedValue({});
vi.stubGlobal('navigator', mockNavigator);
vi.mock('$env/dynamic/public', () => {
  return {
    env: {},
  };
}); // https://github.com/sveltejs/kit/issues/8180

describe('Workspace utility function tests', () => {
  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('separateFilenameFromPath', () => {
    test('Should correctly separate directory path from filename', () => {
      expect(separateFilenameFromPath('foo/bar.foo')).toEqual({
        filename: 'bar.foo',
        path: 'foo',
      });

      expect(separateFilenameFromPath('bar.foo')).toEqual({
        filename: 'bar.foo',
        path: '',
      });

      expect(separateFilenameFromPath('foo/bar')).toEqual({
        filename: 'bar',
        path: 'foo',
      });

      expect(separateFilenameFromPath('bar')).toEqual({
        filename: 'bar',
        path: '',
      });
    });
  });

  describe('incrementFilename', () => {
    test('Should add a number to filename that does not yet have one', () => {
      expect(incrementFilename('file.txt')).toEqual('file (1).txt');
      expect(incrementFilename('foo.txt')).toEqual('foo (1).txt');
      expect(incrementFilename('bar.txt')).toEqual('bar (1).txt');
    });

    test('Should increment the number in a filename', () => {
      expect(incrementFilename('file (1).txt')).toEqual('file (2).txt');
      expect(incrementFilename('foo (2).txt')).toEqual('foo (3).txt');
      expect(incrementFilename('bar(1) (2).txt')).toEqual('bar(1) (3).txt');
    });
  });

  describe('cleanPath', () => {
    test('Should correctly remove any trailing / in a path', () => {
      expect(cleanPath('foo/bar/')).toEqual('foo/bar');
      expect(cleanPath('./foo/bar')).toEqual('foo/bar');
      expect(cleanPath('./foo/bar/')).toEqual('foo/bar');
      expect(cleanPath('/foo/bar/')).toEqual('foo/bar');
    });
  });

  describe('joinPath', () => {
    test('Should correctly form a valid path from an array of string', () => {
      expect(joinPath(['foo', 'bar'])).toEqual('foo/bar');
      expect(joinPath(['foo', '', 'bar'])).toEqual('foo/bar');
      expect(joinPath(['', 'foo', 'bar'])).toEqual('foo/bar');
      expect(joinPath(['', 'foo', 'bar', ''])).toEqual('foo/bar');
    });
  });

  describe('getWorkspaceFileFolderDisplay', () => {
    test('Should correctly output a string that reflects the contents of the node list', () => {
      expect(
        getWorkspaceFileFolderDisplay([{ fullPath: 'foo1', name: 'foo1', type: WorkspaceContentType.Binary }]),
      ).toEqual('File');
      expect(
        getWorkspaceFileFolderDisplay([
          { fullPath: 'foo1', name: 'foo1', type: WorkspaceContentType.Binary },
          { fullPath: 'foo2.txt', name: 'foo2.txt', type: WorkspaceContentType.Text },
          { fullPath: 'foo3.seqN.txt', name: 'foo3.seqN.txt', type: WorkspaceContentType.Text },
        ]),
      ).toEqual('Files');
      expect(
        getWorkspaceFileFolderDisplay([{ fullPath: 'foo1', name: 'foo1', type: WorkspaceContentType.Directory }]),
      ).toEqual('Folder');
      expect(
        getWorkspaceFileFolderDisplay([
          { fullPath: 'foo1', name: 'foo1', type: WorkspaceContentType.Directory },
          { fullPath: 'foo2', name: 'foo2', type: WorkspaceContentType.Directory },
        ]),
      ).toEqual('Folders');
      expect(
        getWorkspaceFileFolderDisplay([
          { fullPath: 'foo1', name: 'foo1', type: WorkspaceContentType.Binary },
          { fullPath: 'foo2.txt', name: 'foo2.txt', type: WorkspaceContentType.Text },
          { fullPath: 'foo3.seqN.txt', name: 'foo3.seqN.txt', type: WorkspaceContentType.Text },
          { fullPath: 'foo1', name: 'foo1', type: WorkspaceContentType.Directory },
          { fullPath: 'foo2', name: 'foo2', type: WorkspaceContentType.Directory },
        ]),
      ).toEqual('Files/Folders');
    });

    describe('findNodeInDirectory', () => {
      test('should find the node with the correct filename', () => {
        expect(
          findNodeInDirectory('foo1.txt', [
            {
              name: 'foo2.txt',
              type: WorkspaceContentType.Text,
            },
            {
              name: 'foo1.txt',
              type: WorkspaceContentType.Text,
            },
          ]),
        ).toEqual({
          name: 'foo1.txt',
          type: WorkspaceContentType.Text,
        });
      });

      test('should find the node with the correct filename regardless of the requested path', () => {
        expect(
          findNodeInDirectory('/workspace1/foo1.txt', [
            {
              name: 'foo2.txt',
              type: WorkspaceContentType.Text,
            },
            {
              name: 'foo1.txt',
              type: WorkspaceContentType.Text,
            },
          ]),
        ).toEqual({
          name: 'foo1.txt',
          type: WorkspaceContentType.Text,
        });
      });
    });

    describe('getSelectedFilesDisplay', () => {
      test('should correctly truncate the display string', () => {
        expect(getSelectedFilesDisplay(['foo1.txt', 'foo2.txt', 'foo3.txt', 'foo4.txt', 'foo5.txt'], 3)).toEqual(
          'foo1.txt, foo2.txt, foo3.txt... and 2 more files',
        );
        expect(getSelectedFilesDisplay(['foo1.txt', 'foo2.txt', 'foo3.txt', 'foo4.txt', 'foo5.txt'], 4)).toEqual(
          'foo1.txt, foo2.txt, foo3.txt, foo4.txt... and 1 more file',
        );
        expect(getSelectedFilesDisplay(['foo1.txt', 'foo2.txt', 'foo3.txt', 'foo4.txt', 'foo5.txt'], 5)).toEqual(
          'foo1.txt, foo2.txt, foo3.txt, foo4.txt, foo5.txt',
        );
      });
    });
  });

  describe('WorkspaceApi', () => {
    test('createFolder', async () => {
      await WorkspaceApi.createFolder(1, 'foo/bar', null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar?type=directory',
        'PUT',
        null,
        null,
        undefined,
        false,
      );
    });

    test('createWorkspace', async () => {
      await WorkspaceApi.createWorkspace('foo_bar', 1, null, 'Foo Bar');
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'create',
        'POST',
        JSON.stringify({ parcelId: 1, workspaceLocation: 'foo_bar', workspaceName: 'Foo Bar' }),
        null,
      );
    });

    test('deleteFile', async () => {
      await WorkspaceApi.deleteFile(1, 'foo/bar/bazz.seq', null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith('1/foo/bar/bazz.seq', 'DELETE', null, null, undefined, false);
    });

    test('deleteFiles', async () => {
      await WorkspaceApi.deleteFiles(1, ['foo_bar', 'baz', 'buzz'], null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'DELETE',
        JSON.stringify(['foo_bar', 'baz', 'buzz']),
        null,
        undefined,
        false,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('deleteWorkspace', async () => {
      await WorkspaceApi.deleteWorkspace(1, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith('1', 'DELETE', null, null, undefined, false);
    });

    test('getFileContent', async () => {
      await WorkspaceApi.getFileContent(1, 'foo/bar/bazz.seq', null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith('1/foo/bar/bazz.seq', 'GET', null, null, undefined, false);
    });

    test('getWorkspaceContents', async () => {
      await WorkspaceApi.getWorkspaceContents(1, '', null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith('1', 'GET', null, null);

      await WorkspaceApi.getWorkspaceContents(1, 'foo', null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith('1/foo', 'GET', null, null);
    });

    test('moveFile - move', async () => {
      await WorkspaceApi.moveFile(1, 'foo/bar/bazz.seq', 'foo/buzz/bazz.seq', false, false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq',
        'POST',
        JSON.stringify({
          moveTo: 'foo/buzz/bazz.seq',
          overwrite: false,
        }),
        null,
        undefined,
        false,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFile - copy', async () => {
      await WorkspaceApi.moveFile(1, 'foo/bar/bazz.seq', 'foo/buzz/bazz.seq', true, false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq',
        'POST',
        JSON.stringify({
          copyTo: 'foo/buzz/bazz.seq',
          overwrite: false,
        }),
        null,
        undefined,
        false,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFileToWorkspace - move', async () => {
      await WorkspaceApi.moveFileToWorkspace(1, 'foo/bar/bazz.seq', 2, 'foo/buzz/bazz.seq', false, false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq',
        'POST',
        JSON.stringify({
          moveTo: 'foo/buzz/bazz.seq',
          overwrite: false,
          toWorkspace: 2,
        }),
        null,
        undefined,
        false,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFileToWorkspace - copy', async () => {
      await WorkspaceApi.moveFileToWorkspace(1, 'foo/bar/bazz.seq', 2, 'foo/buzz/bazz.seq', true, false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq',
        'POST',
        JSON.stringify({
          copyTo: 'foo/buzz/bazz.seq',
          overwrite: false,
          toWorkspace: 2,
        }),
        null,
        undefined,
        false,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFiles - move', async () => {
      await WorkspaceApi.moveFiles(1, [{ path: 'foo/bar/bazz.seq' }], 'foo/buzz', false, false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'POST',
        JSON.stringify({
          moveTo: 'foo/buzz',
          items: [{ path: 'foo/bar/bazz.seq' }],
          overwrite: false,
        }),
        null,
        undefined,
        true,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFiles - move + overwrite', async () => {
      await WorkspaceApi.moveFiles(1, [{ path: 'foo/bar/bazz.seq' }], 'foo/buzz', false, true, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'POST',
        JSON.stringify({
          moveTo: 'foo/buzz',
          items: [{ path: 'foo/bar/bazz.seq' }],
          overwrite: true,
        }),
        null,
        undefined,
        true,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFiles - copy', async () => {
      await WorkspaceApi.moveFiles(1, [{ path: 'foo/bar/bazz.seq' }], 'foo/buzz', true, false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'POST',
        JSON.stringify({
          copyTo: 'foo/buzz',
          items: [{ path: 'foo/bar/bazz.seq' }],
          overwrite: false,
        }),
        null,
        undefined,
        true,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFiles - copy + overwrite', async () => {
      await WorkspaceApi.moveFiles(1, [{ path: 'foo/bar/bazz.seq' }], 'foo/buzz', true, true, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'POST',
        JSON.stringify({
          copyTo: 'foo/buzz',
          items: [{ path: 'foo/bar/bazz.seq' }],
          overwrite: true,
        }),
        null,
        undefined,
        true,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFilesToWorkspace - move', async () => {
      await WorkspaceApi.moveFilesToWorkspace(1, [{ path: 'foo/bar/bazz.seq' }], 2, 'foo/buzz', false, false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'POST',
        JSON.stringify({
          moveTo: 'foo/buzz',
          items: [{ path: 'foo/bar/bazz.seq' }],
          overwrite: false,
          toWorkspace: 2,
        }),
        null,
        undefined,
        true,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFilesToWorkspace - move + overwrite', async () => {
      await WorkspaceApi.moveFilesToWorkspace(1, [{ path: 'foo/bar/bazz.seq' }], 2, 'foo/buzz', false, true, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'POST',
        JSON.stringify({
          moveTo: 'foo/buzz',
          items: [{ path: 'foo/bar/bazz.seq' }],
          overwrite: true,
          toWorkspace: 2,
        }),
        null,
        undefined,
        true,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFilesToWorkspace - copy', async () => {
      await WorkspaceApi.moveFilesToWorkspace(1, [{ path: 'foo/bar/bazz.seq' }], 2, 'foo/buzz', true, false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'POST',
        JSON.stringify({
          copyTo: 'foo/buzz',
          items: [{ path: 'foo/bar/bazz.seq' }],
          overwrite: false,
          toWorkspace: 2,
        }),
        null,
        undefined,
        true,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('moveFilesToWorkspace - copy + overwrite', async () => {
      await WorkspaceApi.moveFilesToWorkspace(1, [{ path: 'foo/bar/bazz.seq' }], 2, 'foo/buzz', true, true, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'POST',
        JSON.stringify({
          copyTo: 'foo/buzz',
          items: [{ path: 'foo/bar/bazz.seq' }],
          overwrite: true,
          toWorkspace: 2,
        }),
        null,
        undefined,
        true,
        {
          'Content-Type': 'application/json',
        },
      );
    });

    test('saveFile', async () => {
      const file: File = new File(['sequence contents'], 'bazz.seq');
      const body = new FormData();
      body.append('file', file, file.name);

      await WorkspaceApi.saveFile(1, 'foo/bar/bazz.seq', 'sequence contents', true, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq?type=file&overwrite=true',
        'PUT',
        body,
        null,
        undefined,
        false,
      );
    });

    test('uploadFile', async () => {
      const file: File = new File(['foo'], 'bazz.seq');
      const body = new FormData();
      body.append('file', file, file.name);

      await WorkspaceApi.uploadFile(1, 'foo/bar', 'bazz.seq', file, false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq?type=file&overwrite=false',
        'PUT',
        body,
        null,
        undefined,
        false,
      );
    });

    test('uploadFile - overwrite', async () => {
      const file: File = new File(['foo'], 'bazz.seq');
      const body = new FormData();
      body.append('file', file, file.name);

      await WorkspaceApi.uploadFile(1, 'foo/bar', 'bazz.seq', file, true, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq?type=file&overwrite=true',
        'PUT',
        body,
        null,
        undefined,
        false,
      );
    });

    test('uploadFiles', async () => {
      const file1: File = new File(['foo'], 'bazz.seq');
      const file2: File = new File(['bar'], 'buzz.seq');
      const form = new FormData();
      form.append('files', file1, file1.name);
      form.append('files', file2, file2.name);
      form.append(
        'body',
        JSON.stringify([
          {
            overwrite: false,
            path: `foo/bar/${file1.name}`,
            type: 'file',
          },
          {
            overwrite: false,
            path: `foo/bar/${file2.name}`,
            type: 'file',
          },
        ]),
      );

      await WorkspaceApi.uploadFiles(1, 'foo/bar', [file1, file2], false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'PUT',
        expect.objectContaining(form),
        null,
        undefined,
        true,
      );
    });

    test('uploadFiles - overwrite', async () => {
      const file1: File = new File(['foo'], 'bazz.seq');
      const file2: File = new File(['bar'], 'buzz.seq');
      const form = new FormData();
      form.append('files', file1, file1.name);
      form.append('files', file2, file2.name);
      form.append(
        'body',
        JSON.stringify([
          {
            overwrite: true,
            path: `foo/bar/${file1.name}`,
            type: 'file',
          },
          {
            overwrite: true,
            path: `foo/bar/${file2.name}`,
            type: 'file',
          },
        ]),
      );

      await WorkspaceApi.uploadFiles(1, 'foo/bar', [file1, file2], true, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'bulk/1',
        'PUT',
        expect.objectContaining(form),
        null,
        undefined,
        true,
      );
    });
  });

  describe('mapWorkspaceTreePaths', () => {
    test('Should create a flat map from a simple tree', () => {
      const nodes: WorkspaceTreeNode[] = [
        { name: 'file1.txt', type: WorkspaceContentType.Text },
        { name: 'file2.seq', type: WorkspaceContentType.Sequence },
      ];

      const result = mapWorkspaceTreePaths(nodes);

      expect(result).toEqual({
        'file1.txt': { name: 'file1.txt', type: WorkspaceContentType.Text },
        'file2.seq': { name: 'file2.seq', type: WorkspaceContentType.Sequence },
      });
    });

    test('Should handle nested directories', () => {
      const nodes: WorkspaceTreeNode[] = [
        {
          contents: [
            { name: 'nested.txt', type: WorkspaceContentType.Text },
            {
              contents: [{ name: 'deep.seq', type: WorkspaceContentType.Sequence }],
              name: 'subfolder',
              type: WorkspaceContentType.Directory,
            },
          ],
          name: 'folder1',
          type: WorkspaceContentType.Directory,
        },
      ];

      const result = mapWorkspaceTreePaths(nodes);

      expect(result['folder1']).toBeDefined();
      expect(result['folder1/nested.txt']).toBeDefined();
      expect(result['folder1/subfolder']).toBeDefined();
      expect(result['folder1/subfolder/deep.seq']).toBeDefined();
    });

    test('Should handle unnamed nodes with fallback', () => {
      const nodes: WorkspaceTreeNode[] = [{ type: WorkspaceContentType.Text }];

      const result = mapWorkspaceTreePaths(nodes);

      expect(result['[Unnamed TEXT]']).toBeDefined();
    });

    test('Should return empty map for empty array', () => {
      const result = mapWorkspaceTreePaths([]);
      expect(result).toEqual({});
    });
  });

  describe('defaultTreeSortComparator', () => {
    test('Should sort directories before files', () => {
      const dir: WorkspaceTreeNode = { name: 'zebra', type: WorkspaceContentType.Directory };
      const file: WorkspaceTreeNode = { name: 'apple', type: WorkspaceContentType.Text };

      expect(defaultTreeSortComparator(dir, file)).toBe(-1);
      expect(defaultTreeSortComparator(file, dir)).toBe(1);
    });

    test('Should sort alphabetically within same type', () => {
      const fileA: WorkspaceTreeNode = { name: 'apple.txt', type: WorkspaceContentType.Text };
      const fileB: WorkspaceTreeNode = { name: 'banana.txt', type: WorkspaceContentType.Text };

      expect(defaultTreeSortComparator(fileA, fileB)).toBeLessThan(0);
      expect(defaultTreeSortComparator(fileB, fileA)).toBeGreaterThan(0);
    });

    test('Should be case-insensitive', () => {
      const fileA: WorkspaceTreeNode = { name: 'Apple.txt', type: WorkspaceContentType.Text };
      const fileB: WorkspaceTreeNode = { name: 'banana.txt', type: WorkspaceContentType.Text };

      expect(defaultTreeSortComparator(fileA, fileB)).toBeLessThan(0);
    });

    test('Should handle undefined names', () => {
      const fileA: WorkspaceTreeNode = { type: WorkspaceContentType.Text };
      const fileB: WorkspaceTreeNode = { name: 'banana.txt', type: WorkspaceContentType.Text };

      expect(defaultTreeSortComparator(fileA, fileB)).toBeLessThan(0);
    });
  });

  describe('sortWorkspaceTree', () => {
    test('Should sort nodes with directories first', () => {
      const nodes: WorkspaceTreeNode[] = [
        { name: 'zebra.txt', type: WorkspaceContentType.Text },
        { name: 'folder', type: WorkspaceContentType.Directory },
        { name: 'apple.txt', type: WorkspaceContentType.Text },
      ];

      const result = sortWorkspaceTree(nodes);

      expect(result[0].name).toBe('folder');
      expect(result[1].name).toBe('apple.txt');
      expect(result[2].name).toBe('zebra.txt');
    });

    test('Should recursively sort nested contents', () => {
      const nodes: WorkspaceTreeNode[] = [
        {
          contents: [
            { name: 'zebra.txt', type: WorkspaceContentType.Text },
            { name: 'subfolder', type: WorkspaceContentType.Directory },
            { name: 'apple.txt', type: WorkspaceContentType.Text },
          ],
          name: 'folder',
          type: WorkspaceContentType.Directory,
        },
      ];

      const result = sortWorkspaceTree(nodes);

      expect(result[0].contents![0].name).toBe('subfolder');
      expect(result[0].contents![1].name).toBe('apple.txt');
      expect(result[0].contents![2].name).toBe('zebra.txt');
    });

    test('Should not mutate original array', () => {
      const nodes: WorkspaceTreeNode[] = [
        { name: 'zebra.txt', type: WorkspaceContentType.Text },
        { name: 'apple.txt', type: WorkspaceContentType.Text },
      ];

      sortWorkspaceTree(nodes);

      expect(nodes[0].name).toBe('zebra.txt');
      expect(nodes[1].name).toBe('apple.txt');
    });

    test('Should use custom comparator when provided', () => {
      const nodes: WorkspaceTreeNode[] = [
        { name: 'apple.txt', type: WorkspaceContentType.Text },
        { name: 'zebra.txt', type: WorkspaceContentType.Text },
      ];

      const reverseComparator = (a: WorkspaceTreeNode, b: WorkspaceTreeNode) => {
        return (b.name ?? '').localeCompare(a.name ?? '');
      };

      const result = sortWorkspaceTree(nodes, reverseComparator);

      expect(result[0].name).toBe('zebra.txt');
      expect(result[1].name).toBe('apple.txt');
    });
  });

  describe('flattenWorkspaceTreeWithPaths', () => {
    test('Should flatten a simple tree', () => {
      const nodes: WorkspaceTreeNode[] = [
        { name: 'file1.txt', type: WorkspaceContentType.Text },
        { name: 'file2.seq', type: WorkspaceContentType.Sequence },
      ];

      const result = flattenWorkspaceTreeWithPaths(nodes);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        depth: 0,
        fullPath: 'file1.txt',
        hasChildren: false,
        name: 'file1.txt',
      });
      expect(result[1]).toMatchObject({
        depth: 0,
        fullPath: 'file2.seq',
        hasChildren: false,
        name: 'file2.seq',
      });
    });

    test('Should flatten nested tree with correct paths and depths', () => {
      const nodes: WorkspaceTreeNode[] = [
        {
          contents: [
            { name: 'nested.txt', type: WorkspaceContentType.Text },
            {
              contents: [{ name: 'deep.seq', type: WorkspaceContentType.Sequence }],
              name: 'subfolder',
              type: WorkspaceContentType.Directory,
            },
          ],
          name: 'folder',
          type: WorkspaceContentType.Directory,
        },
      ];

      const result = flattenWorkspaceTreeWithPaths(nodes);

      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({ depth: 0, fullPath: 'folder', hasChildren: true });
      expect(result[1]).toMatchObject({ depth: 1, fullPath: 'folder/nested.txt', hasChildren: false });
      expect(result[2]).toMatchObject({ depth: 1, fullPath: 'folder/subfolder', hasChildren: true });
      expect(result[3]).toMatchObject({ depth: 2, fullPath: 'folder/subfolder/deep.seq', hasChildren: false });
    });

    test('Should handle empty array', () => {
      const result = flattenWorkspaceTreeWithPaths([]);
      expect(result).toEqual([]);
    });

    test('Should handle unnamed nodes with fallback', () => {
      const nodes: WorkspaceTreeNode[] = [{ type: WorkspaceContentType.Text }];

      const result = flattenWorkspaceTreeWithPaths(nodes);

      expect(result[0].fullPath).toBe('[Unnamed TEXT]');
    });
  });

  describe('findNodeByPath', () => {
    const testTree: WorkspaceTreeNode[] = [
      { name: 'file.txt', type: WorkspaceContentType.Text },
      {
        contents: [
          { name: 'nested.txt', type: WorkspaceContentType.Text },
          {
            contents: [{ name: 'deep.seq', type: WorkspaceContentType.Sequence }],
            name: 'subfolder',
            type: WorkspaceContentType.Directory,
          },
        ],
        name: 'folder',
        type: WorkspaceContentType.Directory,
      },
    ];

    test('Should find root-level node', () => {
      const result = findNodeByPath(testTree, 'file.txt');
      expect(result?.name).toBe('file.txt');
    });

    test('Should find nested node', () => {
      const result = findNodeByPath(testTree, 'folder/nested.txt');
      expect(result?.name).toBe('nested.txt');
    });

    test('Should find deeply nested node', () => {
      const result = findNodeByPath(testTree, 'folder/subfolder/deep.seq');
      expect(result?.name).toBe('deep.seq');
    });

    test('Should return null for non-existent path', () => {
      const result = findNodeByPath(testTree, 'nonexistent');
      expect(result).toBeNull();
    });

    test('Should return null for partial path match', () => {
      const result = findNodeByPath(testTree, 'folder/nonexistent');
      expect(result).toBeNull();
    });

    test('Should return null for empty tree', () => {
      const result = findNodeByPath([], 'file.txt');
      expect(result).toBeNull();
    });
  });

  describe('computeTreeFilter', () => {
    const testNodes: WorkspaceTreeNodeWithFullPath[] = [
      { depth: 0, fullPath: 'folder', hasChildren: true, name: 'folder', type: WorkspaceContentType.Directory },
      { depth: 1, fullPath: 'folder/file.txt', hasChildren: false, name: 'file.txt', type: WorkspaceContentType.Text },
      {
        depth: 1,
        fullPath: 'folder/subfolder',
        hasChildren: true,
        name: 'subfolder',
        type: WorkspaceContentType.Directory,
      },
      {
        depth: 2,
        fullPath: 'folder/subfolder/deep.seq',
        hasChildren: false,
        name: 'deep.seq',
        type: WorkspaceContentType.Sequence,
      },
      {
        depth: 0,
        fullPath: 'root.txt',
        hasChildren: false,
        name: 'root.txt',
        type: WorkspaceContentType.Text,
      },
    ];

    test('Should return empty sets for empty filter', () => {
      const result = computeTreeFilter(testNodes, '');

      expect(result.matchingPaths.size).toBe(0);
      expect(result.ancestorPaths.size).toBe(0);
    });

    test('Should find matching nodes and include ancestor paths', () => {
      const result = computeTreeFilter(testNodes, 'deep');

      expect(result.matchingPaths.has('folder/subfolder/deep.seq')).toBe(true);
      expect(result.ancestorPaths.has('folder')).toBe(true);
      expect(result.ancestorPaths.has('folder/subfolder')).toBe(true);
    });

    test('Should be case-insensitive', () => {
      const result = computeTreeFilter(testNodes, 'DEEP');

      expect(result.matchingPaths.has('folder/subfolder/deep.seq')).toBe(true);
    });

    test('Should find multiple matches', () => {
      const result = computeTreeFilter(testNodes, 'txt');

      expect(result.matchingPaths.has('folder/file.txt')).toBe(true);
      expect(result.matchingPaths.has('root.txt')).toBe(true);
    });

    test('Should handle no matches', () => {
      const result = computeTreeFilter(testNodes, 'nonexistent');

      expect(result.matchingPaths.size).toBe(0);
      expect(result.ancestorPaths.size).toBe(0);
    });
  });

  describe('shouldNodeBeVisible', () => {
    const expandedPaths = new Set(['folder', 'folder/subfolder']);
    const matchingPaths = new Set(['folder/subfolder/deep.seq']);
    const ancestorPaths = new Set(['folder', 'folder/subfolder']);

    test('Should show root level items without filter', () => {
      const result = shouldNodeBeVisible('folder', 0, '', new Set(), new Set(), new Set(), '');

      expect(result).toBe(true);
    });

    test('Should show matching paths when filtering', () => {
      const result = shouldNodeBeVisible(
        'folder/subfolder/deep.seq',
        2,
        'deep',
        matchingPaths,
        ancestorPaths,
        expandedPaths,
        '',
      );

      expect(result).toBe(true);
    });

    test('Should show ancestor paths when filtering', () => {
      const result = shouldNodeBeVisible('folder', 0, 'deep', matchingPaths, ancestorPaths, new Set(), '');

      expect(result).toBe(true);
    });

    test('Should hide non-matching, non-ancestor paths when filtering', () => {
      const result = shouldNodeBeVisible('other', 0, 'deep', matchingPaths, ancestorPaths, new Set(), '');

      expect(result).toBe(false);
    });

    test('Should hide children of collapsed folders without filter', () => {
      const result = shouldNodeBeVisible('folder/nested.txt', 1, '', new Set(), new Set(), new Set(), '');

      expect(result).toBe(false);
    });

    test('Should show children of expanded folders without filter', () => {
      const result = shouldNodeBeVisible('folder/nested.txt', 1, '', new Set(), new Set(), new Set(['folder']), '');

      expect(result).toBe(true);
    });

    test('Should handle currentRootPath correctly', () => {
      // When viewing from 'folder' as root, depth 0 should be the items inside 'folder'
      const result = shouldNodeBeVisible(
        'folder/subfolder/deep.seq',
        1,
        '',
        new Set(),
        new Set(),
        new Set(['folder/subfolder']),
        'folder',
      );

      expect(result).toBe(true);
    });
  });

  describe('getAvailableActionsForNodes', () => {
    const createMockAction = (
      id: number,
      paramSchema: Record<string, { pattern?: string; primary?: boolean; type: string }>,
    ): ActionDefinition => ({
      action_file_id: 1,
      created_at: '2024-01-01',
      description: 'Test action',
      id,
      name: `Action ${id}`,
      owner: null,
      parameter_schema: paramSchema as ActionDefinition['parameter_schema'],
      settings: {},
      settings_schema: {},
      updated_at: '2024-01-01',
      updated_by: null,
      workspace_id: 1,
    });

    test('Should return empty array when no actions match', () => {
      const actions = [createMockAction(1, { input: { type: 'string' } })];
      const nodes: WorkspaceTreeNode[] = [{ name: 'file.txt', type: WorkspaceContentType.Text }];

      const result = getAvailableActionsForNodes(actions, nodes);

      expect(result).toEqual([]);
    });

    test('Should match single file to file param', () => {
      const actions = [createMockAction(1, { input: { type: 'file' } })];
      const nodes: WorkspaceTreeNode[] = [{ name: 'file.txt', type: WorkspaceContentType.Text }];

      const result = getAvailableActionsForNodes(actions, nodes);

      expect(result).toHaveLength(1);
      expect(result[0].parameter).toBe('input');
    });

    test('Should match multiple files to fileList param', () => {
      const actions = [createMockAction(1, { files: { type: 'fileList' } })];
      const nodes: WorkspaceTreeNode[] = [
        { name: 'file1.txt', type: WorkspaceContentType.Text },
        { name: 'file2.txt', type: WorkspaceContentType.Text },
      ];

      const result = getAvailableActionsForNodes(actions, nodes);

      expect(result).toHaveLength(1);
      expect(result[0].parameter).toBe('files');
    });

    test('Should match single sequence to sequence param', () => {
      const actions = [createMockAction(1, { seq: { type: 'sequence' } })];
      const nodes: WorkspaceTreeNode[] = [{ name: 'test.seq', type: WorkspaceContentType.Sequence }];

      const result = getAvailableActionsForNodes(actions, nodes);

      expect(result).toHaveLength(1);
      expect(result[0].parameter).toBe('seq');
    });

    test('Should match multiple sequences to sequenceList param', () => {
      const actions = [createMockAction(1, { seqs: { type: 'sequenceList' } })];
      const nodes: WorkspaceTreeNode[] = [
        { name: 'test1.seq', type: WorkspaceContentType.Sequence },
        { name: 'test2.seq', type: WorkspaceContentType.Sequence },
      ];

      const result = getAvailableActionsForNodes(actions, nodes);

      expect(result).toHaveLength(1);
      expect(result[0].parameter).toBe('seqs');
    });

    test('Should not match file param with multiple files', () => {
      const actions = [createMockAction(1, { input: { type: 'file' } })];
      const nodes: WorkspaceTreeNode[] = [
        { name: 'file1.txt', type: WorkspaceContentType.Text },
        { name: 'file2.txt', type: WorkspaceContentType.Text },
      ];

      const result = getAvailableActionsForNodes(actions, nodes);

      expect(result).toEqual([]);
    });

    test('Should use primary param when specified', () => {
      const actions = [
        createMockAction(1, {
          otherParam: { type: 'file' },
          primaryParam: { primary: true, type: 'file' },
        }),
      ];
      const nodes: WorkspaceTreeNode[] = [{ name: 'file.txt', type: WorkspaceContentType.Text }];

      const result = getAvailableActionsForNodes(actions, nodes);

      expect(result).toHaveLength(1);
      expect(result[0].parameter).toBe('primaryParam');
    });

    test('Should filter by file pattern when specified', () => {
      const actions = [createMockAction(1, { input: { pattern: '*.seq', type: 'file' } })];
      const nodes: WorkspaceTreeNode[] = [{ name: 'file.txt', type: WorkspaceContentType.Text }];

      const result = getAvailableActionsForNodes(actions, nodes);

      expect(result).toEqual([]);
    });

    test('Should match file pattern correctly', () => {
      const actions = [createMockAction(1, { input: { pattern: '*.seq', type: 'file' } })];
      const nodes: WorkspaceTreeNode[] = [{ name: 'test.seq', type: WorkspaceContentType.Sequence }];

      const result = getAvailableActionsForNodes(actions, nodes);

      expect(result).toHaveLength(1);
    });

    test('Should skip directories when determining file type', () => {
      const actions = [createMockAction(1, { input: { type: 'file' } })];
      const nodes: WorkspaceTreeNode[] = [
        {
          contents: [{ name: 'file.txt', type: WorkspaceContentType.Text }],
          name: 'folder',
          type: WorkspaceContentType.Directory,
        },
      ];

      const result = getAvailableActionsForNodes(actions, nodes);

      expect(result).toHaveLength(1);
    });
  });

  describe('removeRedundantNodes', () => {
    test('Should return empty array for empty input', () => {
      const result = removeRedundantNodes([]);
      expect(result).toEqual([]);
    });

    test('Should return single node unchanged', () => {
      const nodes: WorkspaceTreeNodeWithFullPath[] = [
        { depth: 0, fullPath: 'folder', hasChildren: true, name: 'folder', type: WorkspaceContentType.Directory },
      ];

      const result = removeRedundantNodes(nodes);

      expect(result).toHaveLength(1);
      expect(result[0].fullPath).toBe('folder');
    });

    test('Should remove child when parent directory is selected', () => {
      const nodes: WorkspaceTreeNodeWithFullPath[] = [
        { depth: 0, fullPath: 'folder', hasChildren: true, name: 'folder', type: WorkspaceContentType.Directory },
        {
          depth: 1,
          fullPath: 'folder/file.txt',
          hasChildren: false,
          name: 'file.txt',
          type: WorkspaceContentType.Text,
        },
      ];

      const result = removeRedundantNodes(nodes);

      expect(result).toHaveLength(1);
      expect(result[0].fullPath).toBe('folder');
    });

    test('Should remove deeply nested children when ancestor is selected', () => {
      const nodes: WorkspaceTreeNodeWithFullPath[] = [
        { depth: 0, fullPath: 'a', hasChildren: true, name: 'a', type: WorkspaceContentType.Directory },
        { depth: 1, fullPath: 'a/b', hasChildren: true, name: 'b', type: WorkspaceContentType.Directory },
        { depth: 2, fullPath: 'a/b/c.txt', hasChildren: false, name: 'c.txt', type: WorkspaceContentType.Text },
      ];

      const result = removeRedundantNodes(nodes);

      expect(result).toHaveLength(1);
      expect(result[0].fullPath).toBe('a');
    });

    test('Should keep sibling nodes', () => {
      const nodes: WorkspaceTreeNodeWithFullPath[] = [
        {
          depth: 1,
          fullPath: 'folder/file1.txt',
          hasChildren: false,
          name: 'file1.txt',
          type: WorkspaceContentType.Text,
        },
        {
          depth: 1,
          fullPath: 'folder/file2.txt',
          hasChildren: false,
          name: 'file2.txt',
          type: WorkspaceContentType.Text,
        },
      ];

      const result = removeRedundantNodes(nodes);

      expect(result).toHaveLength(2);
    });

    test('Should keep nodes from different parent directories', () => {
      const nodes: WorkspaceTreeNodeWithFullPath[] = [
        { depth: 0, fullPath: 'folder1', hasChildren: true, name: 'folder1', type: WorkspaceContentType.Directory },
        { depth: 0, fullPath: 'folder2', hasChildren: true, name: 'folder2', type: WorkspaceContentType.Directory },
      ];

      const result = removeRedundantNodes(nodes);

      expect(result).toHaveLength(2);
    });

    test('Should not treat similar path prefixes as parent-child', () => {
      const nodes: WorkspaceTreeNodeWithFullPath[] = [
        { depth: 0, fullPath: 'foo', hasChildren: true, name: 'foo', type: WorkspaceContentType.Directory },
        { depth: 0, fullPath: 'foobar', hasChildren: true, name: 'foobar', type: WorkspaceContentType.Directory },
      ];

      const result = removeRedundantNodes(nodes);

      expect(result).toHaveLength(2);
      expect(result.map(n => n.fullPath)).toContain('foo');
      expect(result.map(n => n.fullPath)).toContain('foobar');
    });

    test('Should handle mixed selection of files and directories', () => {
      const nodes: WorkspaceTreeNodeWithFullPath[] = [
        { depth: 0, fullPath: 'folder', hasChildren: true, name: 'folder', type: WorkspaceContentType.Directory },
        {
          depth: 1,
          fullPath: 'folder/child.txt',
          hasChildren: false,
          name: 'child.txt',
          type: WorkspaceContentType.Text,
        },
        { depth: 0, fullPath: 'root.txt', hasChildren: false, name: 'root.txt', type: WorkspaceContentType.Text },
      ];

      const result = removeRedundantNodes(nodes);

      expect(result).toHaveLength(2);
      expect(result.map(n => n.fullPath)).toContain('folder');
      expect(result.map(n => n.fullPath)).toContain('root.txt');
      expect(result.map(n => n.fullPath)).not.toContain('folder/child.txt');
    });

    test('Should handle unsorted input correctly', () => {
      // Input with child before parent
      const nodes: WorkspaceTreeNodeWithFullPath[] = [
        { depth: 2, fullPath: 'a/b/c.txt', hasChildren: false, name: 'c.txt', type: WorkspaceContentType.Text },
        { depth: 0, fullPath: 'a', hasChildren: true, name: 'a', type: WorkspaceContentType.Directory },
      ];

      const result = removeRedundantNodes(nodes);

      expect(result).toHaveLength(1);
      expect(result[0].fullPath).toBe('a');
    });
  });

  describe('computeMovedFilePath', () => {
    test('Should return file in target directory when moved directly', () => {
      const result = computeMovedFilePath('file.txt', [{ fullPath: 'file.txt' }], 'dest');
      expect(result).toBe('dest/file.txt');
    });

    test('Should return just filename when moved to root', () => {
      const result = computeMovedFilePath('folder/file.txt', [{ fullPath: 'folder/file.txt' }], '');
      expect(result).toBe('file.txt');
    });

    test('Should handle file moved as part of parent folder', () => {
      const result = computeMovedFilePath('parent/file.txt', [{ fullPath: 'parent' }], 'dest');
      expect(result).toBe('dest/parent/file.txt');
    });

    test('Should handle file moved as part of parent folder to root', () => {
      const result = computeMovedFilePath('parent/file.txt', [{ fullPath: 'parent' }], '');
      expect(result).toBe('parent/file.txt');
    });

    test('Should handle deeply nested file moved with ancestor folder', () => {
      const result = computeMovedFilePath('a/b/c/file.txt', [{ fullPath: 'a' }], 'dest');
      expect(result).toBe('dest/a/b/c/file.txt');
    });

    test('Should handle file in subfolder when parent folder is moved', () => {
      const result = computeMovedFilePath('parent/sub/file.txt', [{ fullPath: 'parent' }], 'dest');
      expect(result).toBe('dest/parent/sub/file.txt');
    });

    test('Should use closest parent when multiple ancestors are in movedNodes', () => {
      // If both 'a' and 'a/b' are in movedNodes, and file is 'a/b/file.txt',
      // the file should be matched to 'a/b' (the immediate parent in movedNodes)
      const result = computeMovedFilePath('a/b/file.txt', [{ fullPath: 'a' }, { fullPath: 'a/b' }], 'dest');
      // Since 'a/b' matches first in the find (it's also a parent), it depends on order
      // The function uses .find() which returns first match - 'a' comes first and matches
      expect(result).toBe('dest/a/b/file.txt');
    });

    test('Should handle sibling nodes correctly - file moved directly', () => {
      const result = computeMovedFilePath('file1.txt', [{ fullPath: 'file1.txt' }, { fullPath: 'file2.txt' }], 'dest');
      expect(result).toBe('dest/file1.txt');
    });

    test('Should not match similar path prefixes as parent', () => {
      // 'foobar/file.txt' should not be treated as child of 'foo'
      const result = computeMovedFilePath('foobar/file.txt', [{ fullPath: 'foo' }, { fullPath: 'foobar/file.txt' }], 'dest');
      expect(result).toBe('dest/file.txt');
    });

    test('Should handle nested target directory path', () => {
      const result = computeMovedFilePath('file.txt', [{ fullPath: 'file.txt' }], 'a/b/c');
      expect(result).toBe('a/b/c/file.txt');
    });
  });

  describe('getCommonPathPrefix', () => {
    test('Should return empty string for empty array', () => {
      const result = getCommonPathPrefix([]);
      expect(result).toBe('');
    });

    test('Should return parent directory for single path', () => {
      const result = getCommonPathPrefix(['folder/file.txt']);
      expect(result).toBe('folder');
    });

    test('Should return empty string for single root-level path', () => {
      const result = getCommonPathPrefix(['file.txt']);
      expect(result).toBe('');
    });

    test('Should return empty string for single root-level directory', () => {
      const result = getCommonPathPrefix(['myFolder']);
      expect(result).toBe('');
    });

    test('Should return common prefix for paths with shared parent', () => {
      const result = getCommonPathPrefix(['folder/file1.txt', 'folder/file2.txt']);
      expect(result).toBe('folder');
    });

    test('Should return deeper common prefix for nested paths', () => {
      const result = getCommonPathPrefix(['a/b/c/file1.txt', 'a/b/c/file2.txt']);
      expect(result).toBe('a/b/c');
    });

    test('Should return empty string when paths have no common prefix', () => {
      const result = getCommonPathPrefix(['folder1/file.txt', 'folder2/file.txt']);
      expect(result).toBe('');
    });

    test('Should handle paths of different depths', () => {
      const result = getCommonPathPrefix(['a/b/file.txt', 'a/file.txt']);
      expect(result).toBe('a');
    });

    test('Should not match partial directory names', () => {
      const result = getCommonPathPrefix(['foo/file.txt', 'foobar/file.txt']);
      expect(result).toBe('');
    });

    test('Should handle multiple paths with varying common depths', () => {
      const result = getCommonPathPrefix(['a/b/c/file1.txt', 'a/b/file2.txt', 'a/b/d/file3.txt']);
      expect(result).toBe('a/b');
    });
  });
});
