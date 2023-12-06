import type { Plugin, Props } from 'tippy.js';
import tippy from 'tippy.js';

function processParams(node: Element, params: any = {}): any {
  // Determine the title to show. We want to prefer
  // the custom content passed in first, then the
  // HTML title attribute then the aria-label
  // in that order.
  const newParams = { ...params };
  const custom = params.content;
  const label = node.getAttribute('aria-label');
  const content = custom || label;

  // Support keyboard shortcut param
  const shortcut = params.shortcut;
  const shortcutLabel = params.shortcutLabel;
  if (shortcut || shortcutLabel) {
    newParams.allowHTML = true;
    const shortcutContent = shortcut
      ? `
      <span class="tooltip-shortcut-container">
        ${shortcutLabel ? `<span class="tooltip-shortcut-label">${shortcutLabel}</span>` : ''}
        <span class="tooltip-shortcut">${shortcut}</span>
      </span>
    `
      : '';
    newParams.content = `<div class="tooltip--with-shortcut">
        <div>${content}</div>
        ${shortcutContent}
      </div>`;
  }

  // Let's make sure the "aria-label" attribute
  // is set so our element is accessible:
  // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_aria-label_attribute
  if (!label) {
    node.setAttribute('aria-label', content);
  }

  // Clear out the HTML title attribute since
  // we don't want the default behavior of it
  // showing up on hover.
  const htmlNode = node as HTMLElement;
  if (htmlNode?.title) {
    htmlNode.title = '';
  }

  return newParams;
}

/**
 * @see https://dev.to/danawoodman/svelte-quick-tip-using-actions-to-integrate-with-javascript-libraries-tippy-tooltips-2m94
 */
export function tooltip(node: Element, params: any = {}): any {
  const processedParams = processParams(node, params);

  // Support any of the Tippy props by forwarding all "params":
  // https://atomiks.github.io/tippyjs/v6/all-props/
  const tip: any = tippy(node, {
    ...processedParams,
    plugins: [disabled],
  });

  return {
    // Clean up the Tippy instance on unmount.
    destroy: () => tip.destroy(),

    // If the props change, let's update the Tippy instance.
    update: (newParams: any) => {
      const processedParams = processParams(node, newParams);
      tip.setProps({ ...processedParams });
    },
  };
}

const disabled: Plugin<Props & { disabled: boolean }> = {
  defaultValue: false,
  fn(instance) {
    return {
      onBeforeUpdate(instance, partialProps) {
        if (partialProps.disabled || !partialProps.content) {
          instance.disable();
        } else {
          instance.enable();
        }
      },
      onCreate() {
        if (instance.props.disabled || !instance.props.content) {
          instance.disable();
        }
      },
    };
  },
  name: 'disabled',
};
