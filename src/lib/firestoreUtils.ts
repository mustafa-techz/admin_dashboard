import { Timestamp } from 'firebase/firestore';

/**
 * Converts a Firestore Timestamp (or string fallback) to an ISO date string.
 * Used across services to normalize Firestore document dates for frontend consumption.
 */
export function tsToISO(ts: unknown): string {
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return new Date().toISOString();
}
