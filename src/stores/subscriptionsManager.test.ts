import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addSubscription,
  removeSubscription,
  subscriptionManager,
  subscriptionsLoading,
  updateSubscription,
} from './subscriptionsManager';

describe('subscriptionsManager', () => {
  afterEach(() => {
    // Reset the store after each test
    subscriptionManager.set({});
  });

  describe('addSubscription', () => {
    it('should add a subscription to the manager', () => {
      const mockRestart = vi.fn();
      addSubscription('test-1', {
        error: '',
        loading: true,
        restart: mockRestart,
      });

      const state = get(subscriptionManager);
      expect(state['test-1']).toEqual({
        error: '',
        loading: true,
        restart: mockRestart,
      });
    });

    it('should add multiple subscriptions', () => {
      addSubscription('sub-1', { error: '', loading: true, restart: vi.fn() });
      addSubscription('sub-2', { error: '', loading: false, restart: vi.fn() });

      const state = get(subscriptionManager);
      expect(Object.keys(state)).toHaveLength(2);
      expect(state['sub-1'].loading).toBe(true);
      expect(state['sub-2'].loading).toBe(false);
    });
  });

  describe('updateSubscription', () => {
    it('should update an existing subscription', () => {
      addSubscription('test-1', { error: '', loading: true, restart: vi.fn() });

      updateSubscription('test-1', { loading: false });

      const state = get(subscriptionManager);
      expect(state['test-1'].loading).toBe(false);
      expect(state['test-1'].error).toBe('');
    });

    it('should update error state', () => {
      addSubscription('test-1', { error: '', loading: false, restart: vi.fn() });

      updateSubscription('test-1', { error: 'Connection failed' });

      const state = get(subscriptionManager);
      expect(state['test-1'].error).toBe('Connection failed');
    });

    it('should not update non-existent subscription', () => {
      updateSubscription('non-existent', { loading: false });

      const state = get(subscriptionManager);
      expect(state['non-existent']).toBeUndefined();
    });
  });

  describe('removeSubscription', () => {
    it('should remove a subscription from the manager', () => {
      addSubscription('test-1', { error: '', loading: true, restart: vi.fn() });
      addSubscription('test-2', { error: '', loading: true, restart: vi.fn() });

      removeSubscription('test-1');

      const state = get(subscriptionManager);
      expect(state['test-1']).toBeUndefined();
      expect(state['test-2']).toBeDefined();
    });

    it('should handle removing non-existent subscription gracefully', () => {
      addSubscription('test-1', { error: '', loading: true, restart: vi.fn() });

      // Should not throw
      removeSubscription('non-existent');

      const state = get(subscriptionManager);
      expect(state['test-1']).toBeDefined();
    });
  });

  describe('subscriptionsLoading', () => {
    it('should be true when any subscription is loading without error', () => {
      addSubscription('sub-1', { error: '', loading: true, restart: vi.fn() });

      expect(get(subscriptionsLoading)).toBe(true);
    });

    it('should be false when all subscriptions are done loading', () => {
      addSubscription('sub-1', { error: '', loading: false, restart: vi.fn() });
      addSubscription('sub-2', { error: '', loading: false, restart: vi.fn() });

      expect(get(subscriptionsLoading)).toBe(false);
    });

    it('should be false when subscription has error even if loading', () => {
      addSubscription('sub-1', { error: 'Failed', loading: true, restart: vi.fn() });

      expect(get(subscriptionsLoading)).toBe(false);
    });

    it('should be true when at least one subscription is loading without error', () => {
      addSubscription('sub-1', { error: '', loading: false, restart: vi.fn() });
      addSubscription('sub-2', { error: '', loading: true, restart: vi.fn() });

      expect(get(subscriptionsLoading)).toBe(true);
    });

    it('should update when subscription loading state changes', () => {
      addSubscription('sub-1', { error: '', loading: true, restart: vi.fn() });
      expect(get(subscriptionsLoading)).toBe(true);

      updateSubscription('sub-1', { loading: false });
      expect(get(subscriptionsLoading)).toBe(false);
    });

    it('should be false when no subscriptions exist', () => {
      // When the store is empty, there are no loading subscriptions
      expect(get(subscriptionsLoading)).toBe(false);
    });
  });
});
