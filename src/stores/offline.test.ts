import { get } from 'svelte/store';
import { beforeEach, describe, expect, test } from 'vitest';
import fooBundle from '../tests/fixtures/foo-bundle.json';
import { loadOfflineBundle, OFFLINE_DATASET_ID } from '../utilities/offline-bundle';
import { sampleProfiles } from '../utilities/resources';
import { clearOfflineBundle, getOfflineResource, offlineBundle, offlineMode, setOfflineBundle } from './offline';

const fixtureText = JSON.stringify(fooBundle);

describe('offline store', () => {
  beforeEach(() => {
    clearOfflineBundle();
  });

  test('offlineBundle starts null and offlineMode starts false', () => {
    expect(get(offlineBundle)).toBeNull();
    expect(get(offlineMode)).toBe(false);
  });

  test('setOfflineBundle populates offlineBundle and flips offlineMode true', () => {
    const loaded = loadOfflineBundle(fixtureText);
    setOfflineBundle(loaded);

    expect(get(offlineBundle)).toBe(loaded);
    expect(get(offlineMode)).toBe(true);
  });

  test('clearOfflineBundle resets offlineBundle to null and offlineMode to false', () => {
    setOfflineBundle(loadOfflineBundle(fixtureText));
    clearOfflineBundle();

    expect(get(offlineBundle)).toBeNull();
    expect(get(offlineMode)).toBe(false);
  });

  test('getOfflineResource returns null when offline mode is inactive', () => {
    expect(getOfflineResource(OFFLINE_DATASET_ID, '/counter')).toBeNull();
  });

  test('getOfflineResource returns null for an unknown profile name', () => {
    setOfflineBundle(loadOfflineBundle(fixtureText));

    expect(getOfflineResource(OFFLINE_DATASET_ID, '/does-not-exist')).toBeNull();
  });

  test('getOfflineResource returns the correctly sampled resource for a real profile', () => {
    const loaded = loadOfflineBundle(fixtureText);
    setOfflineBundle(loaded);

    const profile = loaded.profiles.find(p => p.name === '/counter');
    expect(profile).toBeDefined();
    const expected = sampleProfiles([profile!], loaded.plan.start_time)[0] ?? null;

    expect(getOfflineResource(OFFLINE_DATASET_ID, '/counter')).toEqual(expected);
  });

  test('getOfflineResource memoizes: repeat calls return the same object identity', () => {
    setOfflineBundle(loadOfflineBundle(fixtureText));

    const first = getOfflineResource(OFFLINE_DATASET_ID, '/counter');
    const second = getOfflineResource(OFFLINE_DATASET_ID, '/counter');

    expect(first).not.toBeNull();
    expect(first).toBe(second);
  });

  test('memo is invalidated when the bundle is cleared and reloaded', () => {
    setOfflineBundle(loadOfflineBundle(fixtureText));
    const first = getOfflineResource(OFFLINE_DATASET_ID, '/counter');

    clearOfflineBundle();
    setOfflineBundle(loadOfflineBundle(fixtureText));
    const second = getOfflineResource(OFFLINE_DATASET_ID, '/counter');

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first).not.toBe(second);
    expect(second).toEqual(first);
  });

  test('memo is invalidated when a new bundle is set directly', () => {
    setOfflineBundle(loadOfflineBundle(fixtureText));
    const first = getOfflineResource(OFFLINE_DATASET_ID, '/counter');

    setOfflineBundle(loadOfflineBundle(fixtureText));
    const second = getOfflineResource(OFFLINE_DATASET_ID, '/counter');

    expect(first).not.toBe(second);
    expect(second).toEqual(first);
  });
});
