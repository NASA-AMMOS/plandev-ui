import { getContext, setContext } from 'svelte';
import { derived, writable, type Readable } from 'svelte/store';
import { SIDEBAR_KEYBOARD_SHORTCUT } from './constants.js';

type Getter<T> = () => T;

export type SidebarStateProps = {
  /**
   * A getter function that returns the current open state of the sidebar.
   * We use a getter function here to support `bind:open` on the `Sidebar.Provider`
   * component.
   */
  open: Getter<boolean>;

  /**
   * A function that sets the open state of the sidebar. To support `bind:open`, we need
   * a source of truth for changing the open state to ensure it will be synced throughout
   * the sub-components and any `bind:` references.
   */
  setOpen: (open: boolean) => void;
};

class SidebarState {
  // Store-based reactivity for Svelte 4
  private _open: Readable<boolean>;
  private _state: Readable<'expanded' | 'collapsed'>;

  readonly props: SidebarStateProps;
  setOpen: SidebarStateProps['setOpen'];

  constructor(props: SidebarStateProps) {
    this.setOpen = props.setOpen;
    this.props = props;

    // Create derived store for open state
    this._open = derived(
      // Create a writable store that updates when props.open() changes
      writable(props.open(), set => {
        // Set up a reactive update mechanism
        const interval = setInterval(() => {
          set(props.open());
        }, 16); // Check every frame for changes

        return () => clearInterval(interval);
      }),
      $open => $open,
    );

    // Create derived store for state
    this._state = derived(this._open, $open => ($open ? 'expanded' : 'collapsed'));
  }

  // Getter for open state (returns store)
  get open(): Readable<boolean> {
    return this._open;
  }

  // Getter for state (returns store)
  get state(): Readable<'expanded' | 'collapsed'> {
    return this._state;
  }

  // Event handler to apply to the `<svelte:window>`
  handleShortcutKeydown = (e: KeyboardEvent) => {
    if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.toggle();
    }
  };

  toggle = () => {
    // Desktop only - no mobile logic
    let currentOpen = false;
    const unsubscribe = this._open.subscribe(value => {
      currentOpen = value;
    });
    unsubscribe(); // Immediately unsubscribe after getting current value
    this.setOpen(!currentOpen);
  };
}

const SYMBOL_KEY = 'scn-sidebar';

/**
 * Instantiates a new `SidebarState` instance and sets it in the context.
 *
 * @param props The constructor props for the `SidebarState` class.
 * @returns  The `SidebarState` instance.
 */
export function setSidebar(props: SidebarStateProps): SidebarState {
  return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}

/**
 * Retrieves the `SidebarState` instance from the context. This is a class instance,
 * so you cannot destructure it.
 * @returns The `SidebarState` instance.
 */
export function useSidebar(): SidebarState {
  return getContext(Symbol.for(SYMBOL_KEY));
}
