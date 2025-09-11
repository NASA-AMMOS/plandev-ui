import { describe, expect, test } from 'vitest';
import { SearchParameters } from '../enums/searchParameters';
import { getActionsUrl, getWorkspacesUrl } from './routes';

describe('Routes utility functions', () => {
  describe('getWorkspacesUrl', () => {
    test('Should generate base workspaces URL without any parameters', () => {
      const base = 'http://localhost:3000';
      const result = getWorkspacesUrl(base);
      expect(result).toBe('http://localhost:3000/workspaces');
    });

    test('Should generate workspaces URL with workspaceId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 123;
      const result = getWorkspacesUrl(base, workspaceId);
      expect(result).toBe('http://localhost:3000/workspaces/123');
    });

    test('Should generate workspaces URL with workspaceId and sequenceId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 123;
      const sequenceId = 'test-sequence';
      const result = getWorkspacesUrl(base, workspaceId, sequenceId);
      expect(result).toBe(`http://localhost:3000/workspaces/123?${SearchParameters.SEQUENCE_ID}=test-sequence`);
    });

    test('Should handle null workspaceId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = null;
      const result = getWorkspacesUrl(base, workspaceId);
      expect(result).toBe('http://localhost:3000/workspaces');
    });

    test('Should handle null sequenceId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 123;
      const sequenceId = null;
      const result = getWorkspacesUrl(base, workspaceId, sequenceId);
      expect(result).toBe('http://localhost:3000/workspaces/123');
    });

    test('Should handle zero workspaceId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 0;
      const result = getWorkspacesUrl(base, workspaceId);
      expect(result).toBe('http://localhost:3000/workspaces/0');
    });

    test('Should handle base URL without trailing slash', () => {
      const base = 'http://localhost:3000';
      const result = getWorkspacesUrl(base);
      expect(result).toBe('http://localhost:3000/workspaces');
    });

    test('Should handle base URL with trailing slash', () => {
      const base = 'http://localhost:3000/';
      const result = getWorkspacesUrl(base);
      expect(result).toBe('http://localhost:3000//workspaces');
    });

    test('Should properly encode sequenceId with special characters', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 123;
      const sequenceId = 'test sequence with spaces';
      const result = getWorkspacesUrl(base, workspaceId, sequenceId);
      expect(result).toBe(
        `http://localhost:3000/workspaces/123?${SearchParameters.SEQUENCE_ID}=test+sequence+with+spaces`,
      );
    });

    test('Should not include sequenceId parameter when workspaceId is null', () => {
      const base = 'http://localhost:3000';
      const workspaceId = null;
      const sequenceId = 'test-sequence';
      const result = getWorkspacesUrl(base, workspaceId, sequenceId);
      expect(result).toBe('http://localhost:3000/workspaces');
    });
  });

  describe('getActionsUrl', () => {
    test('Should generate actions URL without actionRunId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 123;
      const result = getActionsUrl(base, workspaceId);
      expect(result).toBe('http://localhost:3000/workspaces/123/actions');
    });

    test('Should generate actions URL with actionRunId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 123;
      const actionRunId = 456;
      const result = getActionsUrl(base, workspaceId, actionRunId);
      expect(result).toBe('http://localhost:3000/workspaces/123/actions/runs/456');
    });

    test('Should handle null workspaceId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = null;
      const result = getActionsUrl(base, workspaceId);
      expect(result).toBe('http://localhost:3000/workspaces/actions');
    });

    test('Should handle null actionRunId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 123;
      const actionRunId = null;
      const result = getActionsUrl(base, workspaceId, actionRunId);
      expect(result).toBe('http://localhost:3000/workspaces/123/actions');
    });

    test('Should handle zero workspaceId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 0;
      const result = getActionsUrl(base, workspaceId);
      expect(result).toBe('http://localhost:3000/workspaces/0/actions');
    });

    test('Should handle zero actionRunId', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 123;
      const actionRunId = 0;
      const result = getActionsUrl(base, workspaceId, actionRunId);
      expect(result).toBe('http://localhost:3000/workspaces/123/actions/runs/0');
    });

    test('Should handle both workspaceId and actionRunId as null', () => {
      const base = 'http://localhost:3000';
      const workspaceId = null;
      const actionRunId = null;
      const result = getActionsUrl(base, workspaceId, actionRunId);
      expect(result).toBe('http://localhost:3000/workspaces/actions');
    });

    test('Should handle empty base URL', () => {
      const base = '';
      const workspaceId = 123;
      const result = getActionsUrl(base, workspaceId);
      expect(result).toBe('/workspaces/123/actions');
    });

    test('Should build correct URL using getWorkspacesUrl internally', () => {
      const base = 'http://localhost:3000';
      const workspaceId = 123;
      const actionRunId = 456;

      // This should be equivalent to calling getWorkspacesUrl + '/actions/runs/456'
      const workspaceUrl = getWorkspacesUrl(base, workspaceId);
      const expectedUrl = `${workspaceUrl}/actions/runs/456`;
      const actualUrl = getActionsUrl(base, workspaceId, actionRunId);

      expect(actualUrl).toBe(expectedUrl);
      expect(actualUrl).toBe('http://localhost:3000/workspaces/123/actions/runs/456');
    });
  });
});
