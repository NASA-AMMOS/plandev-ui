import { writable, type Writable } from 'svelte/store';

/* Writeable. */
export const directiveBuilderIsVisible: Writable<boolean> = writable(false);
export const directiveBuilderWIP: Writable<{
  name: string;
  startTime: string;
  type: string;
}> = writable({
  name: '',
  startTime: '',
  type: '',
});

export function updateDirectiveBuilder(input: { name?: string; startTime?: string; type?: string }): void {
  directiveBuilderWIP.update(oldDirective => {
    const newDirective = { ...oldDirective };
    if (input.name !== undefined) {
      newDirective.name = input.name;
    }
    if (input.startTime !== undefined) {
      newDirective.startTime = input.startTime;
    }
    if (input.type !== undefined) {
      newDirective.type = input.type;
    }
    return newDirective;
  });
}

export function closeDirectiveBuilder(): void {
  directiveBuilderWIP.set({ name: '', startTime: '', type: '' });
  directiveBuilderIsVisible.set(false);
}
