// Offline mode is entirely client-driven (file upload, in-memory bundle, no
// backend), so this route must never attempt to render on the server.
export const ssr = false;
