import type { Action, ActionReturn } from 'svelte/action';
import type { Plugin, Props } from 'tippy.js';
import tippy from 'tippy.js';

interface PermissionHandlerProps extends Partial<Omit<Props, 'content'>> {
  disabledClassName?: string;
  hasPermission?: boolean;
  permissionError?: string;
}

/**
 * Action for disabling/enabling an element based on permission and adding a tooltip
 * to allow for an explanation/description.
 *
 * NOTE: this MUST be added before any 'click' event handlers in order to correctly disable any following 'click'
 * events added to this element
 *
 * Tippy:
 * @see https://dev.to/danawoodman/svelte-quick-tip-using-actions-to-integrate-with-javascript-libraries-tippy-tooltips-2m94
 */
export const permissionHandler: Action<HTMLElement, PermissionHandlerProps> = (
  node: Element,
  { permissionError, disabledClassName = 'permission-disabled', ...params }: PermissionHandlerProps = {},
): ActionReturn<any, any> => {
  // Determine the title to show. We want to prefer
  // the permissionError content passed in first, then the
  // HTML title attribute then the aria-label
  // in that order.
  const existingError = node.getAttribute('aria-errormessage');
  const tabIndex = node.getAttribute('tabindex');
  const { hasPermission } = params;

  // Clear out the HTML title attribute since
  // we don't want the default behavior of it
  // showing up on hover.
  const htmlNode = node as HTMLElement;
  if (htmlNode?.title) {
    htmlNode.title = '';
  }

  // Support any of the Tippy props by forwarding all "params":
  // https://atomiks.github.io/tippyjs/v6/all-props/
  const tip: any = tippy(node, {
    ...params,
    ...(permissionError !== null ? { content: permissionError } : {}),
    delay: [500, 50],
    plugins: [permission],
  });

  const preventClick = (event: Event) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    event.preventDefault();
  };

  const preventFocus = (event: Event) => {
    if (event.target !== null) {
      (event.target as HTMLElement).blur();
    }
  };

  const preventKeyboardToggle = (event: Event) => {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === ' ' || keyEvent.key === 'Enter') {
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  };

  const handlePermission = (permission: boolean = true, error?: string) => {
    const tagName = node.tagName.toLowerCase();
    const inputType = tagName === 'input' ? (node as HTMLInputElement).type.toLowerCase() : '';
    const isClickableInput = inputType === 'checkbox' || inputType === 'radio';
    const isTextInput = (tagName === 'input' && !isClickableInput) || tagName === 'textarea';
    const isSelect = tagName === 'select';

    if (permission === false) {
      // Use data attribute for styling - more resilient to Svelte's class management
      node.setAttribute('data-permission-disabled', 'true');
      node.classList.add(disabledClassName);

      // Let's make sure the "aria-errormessage" attribute
      // is set so our element is accessible:
      // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-errormessage
      if (error) {
        node.setAttribute('aria-errormessage', error);
      }

      if (isTextInput) {
        // Text inputs: readonly allows copy but prevents editing, show lock icon instead of graying out
        node.setAttribute('readonly', 'readonly');
        node.setAttribute('data-permission-text-input', 'true');
      } else if (isSelect || isClickableInput) {
        // Select and checkbox/radio: readonly doesn't work - disable pointer events and keyboard
        (node as HTMLElement).style.pointerEvents = 'none';
        node.setAttribute('tabindex', '-1');
        node.addEventListener('keydown', preventKeyboardToggle, true);
      } else {
        // Buttons and custom components: prevent clicks and focus via event listeners
        // (not using native disabled for buttons to allow tooltip to show)
        node.setAttribute('tabindex', '-1');
        node.addEventListener('mousedown', preventClick, true);
        node.addEventListener('mouseup', preventClick, true);
        node.addEventListener('click', preventClick, true);
        node.addEventListener('focus', preventFocus, true);
      }
    } else {
      // Restore permissions
      node.removeAttribute('data-permission-disabled');
      node.classList.remove(disabledClassName);

      if (existingError) {
        node.setAttribute('aria-errormessage', existingError);
      } else {
        node.removeAttribute('aria-errormessage');
      }

      if (isTextInput) {
        node.removeAttribute('readonly');
        node.removeAttribute('data-permission-text-input');
      } else if (isSelect || isClickableInput) {
        (node as HTMLElement).style.pointerEvents = '';
        if (tabIndex !== null) {
          node.setAttribute('tabindex', tabIndex);
        } else {
          node.removeAttribute('tabindex');
        }
        node.removeEventListener('keydown', preventKeyboardToggle, true);
      } else {
        // Buttons and custom components
        if (tabIndex !== null) {
          node.setAttribute('tabindex', tabIndex);
        } else {
          node.removeAttribute('tabindex');
        }
        node.removeEventListener('mousedown', preventClick, true);
        node.removeEventListener('mouseup', preventClick, true);
        node.removeEventListener('click', preventClick, true);
        node.removeEventListener('focus', preventFocus, true);
      }
    }
  };

  handlePermission(hasPermission, permissionError);

  return {
    // Clean up the Tippy instance on unmount.
    destroy: () => {
      node.removeEventListener('mousedown', preventClick, true);
      node.removeEventListener('mouseup', preventClick, true);
      node.removeEventListener('click', preventClick, true);
      node.removeEventListener('focus', preventFocus, true);
      node.removeEventListener('keydown', preventKeyboardToggle, true);

      tip.destroy();
    },

    // If the props change, let's update the Tippy instance.
    update: ({ hasPermission: permission, permissionError: error, ...newParams }: PermissionHandlerProps) => {
      handlePermission(permission, error);
      tip.setProps({ content: error, hasPermission: permission, ...newParams });
    },
  };
};

const permission: Plugin<PermissionHandlerProps & { hasPermission?: boolean }> = {
  defaultValue: false,
  fn(instance) {
    return {
      onBeforeUpdate(domInstance, partialProps) {
        if (partialProps.hasPermission !== false) {
          domInstance.disable();
        } else {
          domInstance.enable();
        }
      },
      onCreate() {
        if (instance.props.hasPermission !== false) {
          instance.disable();
        }
      },
    };
  },
  name: 'hasPermission',
};
