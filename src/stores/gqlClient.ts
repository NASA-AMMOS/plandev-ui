import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { createClient, type Client, type ClientOptions } from 'graphql-ws';
import { writable, type Readable } from 'svelte/store';
import type { BaseUser } from '../types/app';
import { getCookieValue } from '../utilities/browser';
import { logout } from '../utilities/login';
import { EXPIRED_JWT } from '../utilities/permissions';

/**
 * Connection state for the shared WebSocket client.
 * - 'disconnected': No connection (client not created or disposed)
 * - 'connecting': Connection in progress
 * - 'connected': Successfully connected
 * - 'reconnecting': Connection lost, attempting to reconnect
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Connection state store - exposed as readonly to consumers
const connectionStateStore = writable<ConnectionState>('disconnected');
export const connectionState: Readable<ConnectionState> = connectionStateStore;

// Track current state value for internal checks
let currentConnectionState: ConnectionState = 'disconnected';
connectionStateStore.subscribe(state => {
  currentConnectionState = state;
});

// Listen for browser offline/online events for immediate feedback
if (browser) {
  window.addEventListener('offline', () => {
    if (currentConnectionState === 'connected') {
      connectionStateStore.set('reconnecting');
    }
  });

  window.addEventListener('online', () => {
    // When coming back online, restart the connection to reconnect faster
    if (client && currentConnectionState === 'reconnecting') {
      doRestart();
    }
  });
}

/**
 * Shared GraphQL WebSocket client module.
 *
 * This module provides a singleton WebSocket client that all gqlSubscribable stores
 * share, leveraging graphql-ws's native multiplexing support. Instead of creating
 * one WebSocket connection per subscription, all subscriptions share a single connection.
 *
 * Key features:
 * - Lazy initialization: Client created on first getSharedClient() call
 * - Reference counting: Client disposed when no subscriptions remain (with grace period)
 * - Debuggable subscription IDs: Format "QUERY_NAME-N" visible in browser DevTools
 * - Connection-level error handling separate from subscription-level errors
 */

// Singleton client instance
let client: Client | null = null;

// Reference counting for lifecycle management
let refCount = 0;
let disposeTimeout: ReturnType<typeof setTimeout> | null = null;

// WebSocket reference for restart functionality
let activeSocket: WebSocket | null = null;
let restartRequested = false;

// Sequential counter for debuggable subscription IDs
let subscriptionCounter = 0;

// Track pending subscription ID for generateID callback
let pendingQueryName: string | null = null;

/**
 * Helper that reads auth token from cookies.
 * Supports both OIDC format (direct accessToken cookie) and
 * standard JWT format (base64-encoded user cookie containing token).
 */
function getToken(): string {
  // OIDC format: direct accessToken cookie
  const accessToken = getCookieValue('accessToken');
  if (accessToken) {
    return accessToken;
  }

  // Standard JWT/SSO format: base64-encoded user cookie containing token
  const userCookie = getCookieValue('user');
  if (userCookie) {
    try {
      const decodedUserCookie = atob(decodeURIComponent(userCookie));
      const parsedUserCookie: BaseUser = JSON.parse(decodedUserCookie);
      return parsedUserCookie.token;
    } catch (e) {
      console.log('Error parsing user cookie:', e);
      return '';
    }
  }

  return '';
}

/**
 * Helper that parses a role cookie.
 */
function getRoleFromCookie(): string {
  const role = getCookieValue('activeRole');
  if (role) {
    return role;
  }
  console.log(`No 'role' cookie found`);
  return '';
}

/**
 * Creates the shared graphql-ws client with configured options.
 */
function createSharedClient(): Client {
  // Capture reference so event handlers can detect if this client was replaced/disposed.
  // When disposeSharedClient() sets client = null (or a new client is created),
  // the old client's async close event won't corrupt shared state.
  const clientOptions: ClientOptions = {
    // connectionParams is a function so it gets fresh token/role on each reconnect
    connectionParams: () => {
      return {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'x-hasura-role': getRoleFromCookie(),
        },
      };
    },
    // Generate debuggable subscription IDs: "QUERY_NAME-N"
    // Counter is managed by registerSubscription/setPendingQueryName, not here
    generateID: () => {
      const queryName = pendingQueryName ?? 'unknown';
      return `${queryName}-${subscriptionCounter}`;
    },
    on: {
      closed: (event: unknown) => {
        // Ignore events from a disposed/replaced client
        if (newClient !== client) {
          return;
        }
        activeSocket = null;
        // Update state to reconnecting (graphql-ws will auto-retry)
        connectionStateStore.set('reconnecting');
        // Check for auth-related close codes
        if (event && typeof event === 'object' && 'code' in event) {
          const closeEvent = event as CloseEvent;
          // 4401 = Unauthorized
          // 4403 = Forbidden
          if (closeEvent.code === 4401 || closeEvent.code === 4403) {
            logout('Session expired');
          }
        }
      },
      connected: (socket: unknown) => {
        if (newClient !== client) {
          return;
        }
        activeSocket = socket as WebSocket;
        connectionStateStore.set('connected');
        // Handle pending restart request
        if (restartRequested) {
          restartRequested = false;
          doRestart();
        }
      },
      connecting: () => {
        if (newClient !== client) {
          return;
        }
        // Only set 'connecting' if we're not already reconnecting
        // (reconnecting state should persist until connected)
        if (currentConnectionState !== 'reconnecting') {
          connectionStateStore.set('connecting');
        }
      },
      error: (err: unknown) => {
        if (newClient !== client) {
          return;
        }
        console.error('WebSocket connection error', err);
        // Check for JWT expiration in error
        if (err && typeof err === 'object' && 'message' in err) {
          const errorMessage = (err as { message: string }).message;
          if (errorMessage.includes(EXPIRED_JWT)) {
            logout(EXPIRED_JWT);
          }
        }
      },
    },
    retryAttempts: Infinity,
    // Custom retryWait: immediate retry on first attempt (for role switching),
    // then exponential backoff with jitter for subsequent retries
    retryWait: async (retries: number) => {
      if (retries === 0) {
        // First retry (e.g., after intentional role-switch restart) - no delay
        return;
      }
      // Subsequent retries: exponential backoff with jitter (like default)
      let retryDelay = 1000;
      for (let i = 0; i < retries; i++) {
        retryDelay *= 2;
      }
      // Cap at 30 seconds
      retryDelay = Math.min(retryDelay, 30000);
      // Add jitter (300ms to 3s) to prevent thundering herd
      const jitter = Math.floor(Math.random() * (3000 - 300) + 300);
      await new Promise(resolve => setTimeout(resolve, retryDelay + jitter));
    },
    shouldRetry: () => true,
    url: env.PUBLIC_HASURA_WEB_SOCKET_URL,
  };

  // newClient is referenced in the `on` handler closures above.
  // Those closures only execute asynchronously (on WebSocket events),
  // so newClient is guaranteed to be assigned by the time they run.
  const newClient = createClient(clientOptions);
  return newClient;
}

/**
 * Internal restart implementation.
 */
function doRestart(): void {
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
    // Custom close code (4205) triggers graphql-ws to reconnect
    activeSocket.close(4205, 'Client Restart');
  } else {
    // Socket not ready, flag for restart when it opens
    restartRequested = true;
  }
}

/**
 * Gets the shared GraphQL WebSocket client, creating it if necessary.
 * Only works in browser context.
 */
export function getSharedClient(): Client | null {
  if (!browser) {
    return null;
  }

  // Cancel any pending disposal
  if (disposeTimeout) {
    clearTimeout(disposeTimeout);
    disposeTimeout = null;
  }

  // Create client on first access
  if (!client) {
    client = createSharedClient();
  }

  return client;
}

/**
 * Registers a subscription and returns a debuggable ID.
 * Call this before client.subscribe() to set the pending query name.
 */
export function registerSubscription(queryName: string): string {
  refCount++;
  // Set pending query name for generateID callback
  pendingQueryName = queryName;
  // Pre-increment to match what generateID will produce
  const id = `${queryName}-${++subscriptionCounter}`;
  return id;
}

/**
 * Sets the pending query name for the next generateID call.
 * Used when resubscribing without incrementing ref count.
 * Increments counter to ensure unique ID for the new subscription.
 */
export function setPendingQueryName(queryName: string): void {
  pendingQueryName = queryName;
  subscriptionCounter++;
}

/**
 * Called after subscription is created to clear the pending query name.
 */
export function clearPendingQueryName(): void {
  pendingQueryName = null;
}

/**
 * Unregisters a subscription. When ref count reaches 0,
 * schedules client disposal after a grace period.
 */
export function unregisterSubscription(): void {
  refCount--;

  if (refCount === 0 && client) {
    // Grace period before disposing to handle route transitions
    disposeTimeout = setTimeout(() => {
      if (refCount === 0 && client) {
        client.dispose();
        client = null;
        activeSocket = null;
        restartRequested = false;
        connectionStateStore.set('disconnected');
      }
    }, 5000);
  }
}

// Debounce restart to avoid multiple restarts when all subscriptions call restart
let restartPending = false;

/**
 * Restarts the shared WebSocket connection.
 * Debounced to only restart once even if called multiple times in same tick.
 * All subscriptions will automatically reconnect with fresh auth.
 */
export function restartSharedClient(): void {
  if (client && !restartPending) {
    restartPending = true;
    // Use microtask to batch multiple restart calls in the same tick
    queueMicrotask(() => {
      restartPending = false;
      doRestart();
    });
  }
}

/**
 * Immediately disposes the shared client.
 * Use with caution - typically let reference counting handle disposal.
 */
export function disposeSharedClient(): void {
  if (disposeTimeout) {
    clearTimeout(disposeTimeout);
    disposeTimeout = null;
  }

  if (client) {
    client.dispose();
    client = null;
    activeSocket = null;
    restartRequested = false;
    refCount = 0;
    connectionStateStore.set('disconnected');
  }
}

// HMR resilience: when this module is re-evaluated during HMR, the module-level
// `client` resets to null but the old WebSocket client is still connected with
// active subscriptions. Save state to window on connection changes (which follow
// activeSocket updates in event handlers) and restore on re-evaluation.
if (browser) {
  const prev = (window as any).__gqlClientHmr as
    | { activeSocket: WebSocket | null; client: Client; refCount: number }
    | undefined;
  if (prev?.client) {
    console.debug('HMR: restoring shared GraphQL client reference.');
    client = prev.client;
    activeSocket = prev.activeSocket;
    refCount = prev.refCount;
    connectionStateStore.set('connected');
  }

  connectionStateStore.subscribe(() => {
    if (client) {
      (window as any).__gqlClientHmr = { activeSocket, client, refCount };
    } else {
      delete (window as any).__gqlClientHmr;
    }
  });
}
