import { afterAll, describe, expect, test, vi } from 'vitest';
import * as requests from './requests';
import { cleanPath, joinPath, separateFilenameFromPath, WorkspaceApi } from './workspaces';
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

  describe('WorkspaceApi', () => {
    test('createWorkspace', async () => {
      await WorkspaceApi.createWorkspace('foo_bar', 1, null, 'Foo Bar');
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        'create',
        'POST',
        JSON.stringify({ parcelId: 1, workspaceLocation: 'foo_bar', workspaceName: 'Foo Bar' }),
        null,
      );
    });

    test('getWorkspaceContents', async () => {
      await WorkspaceApi.getWorkspaceContents(1, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith('1', 'GET', null, null);
    });

    test('deleteWorkspace', async () => {
      await WorkspaceApi.deleteWorkspace(1, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith('1', 'DELETE', null, null, undefined, false);
    });

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

    test('uploadFile', async () => {
      const file: File = new File(['foo'], 'bazz.seq');
      const body = new FormData();
      body.append('file', file, file.name);

      await WorkspaceApi.uploadFile(1, 'foo/bar', 'bazz.seq', file, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq?type=file',
        'PUT',
        body,
        null,
        undefined,
        false,
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

    test('moveFile - move', async () => {
      await WorkspaceApi.moveFile(1, 'foo/bar/bazz.seq', 'foo/buzz/bazz.seq', false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq',
        'POST',
        JSON.stringify({
          moveTo: 'foo/buzz/bazz.seq',
        }),
        null,
        undefined,
        false,
      );
    });

    test('moveFile - copy', async () => {
      await WorkspaceApi.moveFile(1, 'foo/bar/bazz.seq', 'foo/buzz/bazz.seq', true, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq',
        'POST',
        JSON.stringify({
          copyTo: 'foo/buzz/bazz.seq',
        }),
        null,
        undefined,
        false,
      );
    });

    test('moveFileToWorkspace - move', async () => {
      await WorkspaceApi.moveFileToWorkspace(1, 'foo/bar/bazz.seq', 2, 'foo/buzz/bazz.seq', false, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq',
        'POST',
        JSON.stringify({
          moveTo: 'foo/buzz/bazz.seq',
          toWorkspace: 2,
        }),
        null,
        undefined,
        false,
      );
    });

    test('moveFileToWorkspace - copy', async () => {
      await WorkspaceApi.moveFileToWorkspace(1, 'foo/bar/bazz.seq', 2, 'foo/buzz/bazz.seq', true, null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith(
        '1/foo/bar/bazz.seq',
        'POST',
        JSON.stringify({
          copyTo: 'foo/buzz/bazz.seq',
          toWorkspace: 2,
        }),
        null,
        undefined,
        false,
      );
    });

    test('getFileContent', async () => {
      await WorkspaceApi.getFileContent(1, 'foo/bar/bazz.seq', null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith('1/foo/bar/bazz.seq', 'GET', null, null, undefined, false);
    });

    test('deleteFile', async () => {
      await WorkspaceApi.deleteFile(1, 'foo/bar/bazz.seq', null);
      expect(reqWorkspaceMock).toHaveBeenLastCalledWith('1/foo/bar/bazz.seq', 'DELETE', null, null, undefined, false);
    });
  });
});
