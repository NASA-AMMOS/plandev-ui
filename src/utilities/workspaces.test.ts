/* eslint-disable sort-keys */
import { afterAll, describe, expect, test, vi } from 'vitest';
import { WorkspaceContentType } from '../enums/workspace';
import * as requests from './requests';
import {
  cleanPath,
  findNodeInDirectory,
  getSelectedFilesDisplay,
  getWorkspaceFileFolderDisplay,
  joinPath,
  separateFilenameFromPath,
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
});
