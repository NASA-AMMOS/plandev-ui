import { describe, expect, test } from 'vitest';
import { ADMIN_ROLE, getRoleDisplayName } from './roles';

describe('roles util', () => {
  describe('getRoleDisplayName', () => {
    test('should alias the admin role', () => {
      expect(getRoleDisplayName(ADMIN_ROLE)).toEqual('admin');
    });

    test('should pass through roles without an alias', () => {
      expect(getRoleDisplayName('user')).toEqual('user');
      expect(getRoleDisplayName('viewer')).toEqual('viewer');
    });

    test('should return an empty string for an absent role', () => {
      expect(getRoleDisplayName(null)).toEqual('');
      expect(getRoleDisplayName(undefined)).toEqual('');
      expect(getRoleDisplayName('')).toEqual('');
    });
  });
});
