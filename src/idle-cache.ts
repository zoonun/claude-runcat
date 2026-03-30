import * as fs from 'node:fs';

interface IdleCacheData { apiDurationMs: number; timestamp: number; }

export function readIdleCache(cacheFile: string): IdleCacheData | null {
  try {
    const raw = fs.readFileSync(cacheFile, 'utf-8');
    const data = JSON.parse(raw);
    if (typeof data.apiDurationMs === 'number' && typeof data.timestamp === 'number') return data;
    return null;
  } catch { return null; }
}

export function writeIdleCache(cacheFile: string, apiDurationMs: number, timestamp: number): void {
  try { fs.writeFileSync(cacheFile, JSON.stringify({ apiDurationMs, timestamp })); } catch {}
}

export function isIdle(currentApiDurationMs: number, cacheFile: string, idleTimeoutMs: number = 30000): boolean {
  const cached = readIdleCache(cacheFile);
  const now = Date.now();
  if (!cached) { writeIdleCache(cacheFile, currentApiDurationMs, now); return false; }
  if (cached.apiDurationMs !== currentApiDurationMs) { writeIdleCache(cacheFile, currentApiDurationMs, now); return false; }
  return (now - cached.timestamp) >= idleTimeoutMs;
}

/**
 * Determine idle state from session data directly (no cache needed).
 * If total session time minus API time exceeds the gap threshold,
 * and API time is less than half of session time, consider idle.
 */
export function isIdleFromData(totalDurationMs: number, totalApiDurationMs: number, idleTimeoutMs: number): boolean {
  if (totalDurationMs <= 0) return false;
  const idleGap = totalDurationMs - totalApiDurationMs;
  const apiRatio = totalApiDurationMs / totalDurationMs;
  // Idle if: large idle gap AND API is not actively running (low recent ratio)
  return idleGap >= idleTimeoutMs && apiRatio < 0.5;
}
