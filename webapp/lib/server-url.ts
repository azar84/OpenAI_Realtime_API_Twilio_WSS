/**
 * Utility function to get the clean server URL for API calls
 * Handles malformed WebSocket URLs like 'wss://http://domain.com'
 */
export function getServerUrl(): string {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081';
  
  // Remove any protocol prefixes (wss://, ws://, https://, http://)
  const cleanUrl = wsUrl.replace(/^(wss?:\/\/|https?:\/\/)+/, '');
  
  // Return with https:// protocol for API calls
  return `https://${cleanUrl}`;
}
