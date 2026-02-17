import { browser } from '$app/environment';

/**
 * Reads a cookie value by name. Returns null if not found or not in a browser.
 */
export function getCookieValue(name: string): string | null {
  if (!browser || !document?.cookie) {
    return null;
  }
  const cookie = document.cookie.split(/\s*;\s*/).find(entry => entry.startsWith(`${name}=`));
  return cookie ? cookie.split('=')[1] : null;
}

/**
 * Returns true if the current browser is running on MacOS
 */
export function isMacOs(): boolean {
  if (!browser) {
    return false;
  }
  // userAgentData is not yet in TypeScript's Navigator type (only supported in Chromium browsers)
  const nav = navigator as Navigator & { userAgentData?: { platform: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform;
  return /mac/i.test(platform);
}

/**
 * Adds event listeners to document and window to track if the page is in focus.
 * Returns a function that when called will remove the listeners.
 *
 * @see https://stackoverflow.com/a/70073076 modified to only support modern browsers
 */
export function addPageFocusListener(onChange: (string: 'out' | 'in') => void): () => void {
  if (!browser) {
    return () => null;
  }
  let visible = true;
  function handleChange(evt: FocusEvent | PageTransitionEvent | Event) {
    if (visible && (['blur', 'focusout', 'pagehide'].includes(evt.type) || (document && document.hidden))) {
      visible = false;
      onChange('out');
    } else if (!visible && (['focus', 'focusin', 'pageshow'].includes(evt.type) || (document && !document.hidden))) {
      visible = true;
      onChange('in');
    }
  }

  // Changing tab with alt+tab
  document.addEventListener('visibilitychange', handleChange);
  window.addEventListener('pageshow', handleChange);
  window.addEventListener('pagehide', handleChange);
  window.addEventListener('focus', handleChange);
  window.addEventListener('blur', handleChange);

  // Initialize state if Page Visibility API is supported
  handleChange({ type: document.hidden ? 'blur' : 'focus' } as FocusEvent);

  return () => {
    window.removeEventListener('pageshow', handleChange);
    window.removeEventListener('pagehide', handleChange);
    window.removeEventListener('focus', handleChange);
    window.removeEventListener('blur', handleChange);
    document.removeEventListener('visibilitychange', handleChange);
  };
}
