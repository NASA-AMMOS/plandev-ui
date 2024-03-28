import { derived, type Readable, type Stores, type StoresValues } from 'svelte/store';

export function derivedDeeply<S extends Stores, T>(
  stores: S,
  fn: (values: StoresValues<S>) => T,
  initialValue?: T,
): Readable<T> {
  return derived(
    stores,
    ($stores, _set, update) => {
      const nextValue = fn($stores);

      update(prevValue => {
        let prevValueString: string;
        let nextValueString: string;

        if (typeof prevValue === 'object') {
          prevValueString = JSON.stringify(prevValue);
        } else {
          prevValueString = `${prevValue}`;
        }

        if (typeof nextValue === 'object') {
          nextValueString = JSON.stringify(nextValue);
        } else {
          nextValueString = `${nextValue}`;
        }

        if (prevValueString === nextValueString) {
          return prevValue;
        }

        return nextValue;
      });
    },
    initialValue,
  );
}
