import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readIdleCache, writeIdleCache, isIdle, isIdleFromData } from '../src/idle-cache.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const testCacheFile = path.join(os.tmpdir(), 'claude-runcat-idle-test');

describe('idle-cache', () => {
  beforeEach(() => { try { fs.unlinkSync(testCacheFile); } catch {} });
  afterEach(() => { try { fs.unlinkSync(testCacheFile); } catch {} });

  it('returns null when cache file does not exist', () => { expect(readIdleCache(testCacheFile)).toBeNull(); });
  it('writes and reads cache correctly', () => {
    writeIdleCache(testCacheFile, 120000, Date.now());
    const result = readIdleCache(testCacheFile);
    expect(result).not.toBeNull();
    expect(result!.apiDurationMs).toBe(120000);
  });
  it('detects idle when api duration unchanged for 30+ seconds', () => {
    writeIdleCache(testCacheFile, 120000, Date.now() - 31000);
    expect(isIdle(120000, testCacheFile)).toBe(true);
  });
  it('detects not idle when api duration changed', () => {
    writeIdleCache(testCacheFile, 100000, Date.now() - 31000);
    expect(isIdle(120000, testCacheFile)).toBe(false);
  });
  it('detects not idle when under 30 seconds', () => {
    writeIdleCache(testCacheFile, 120000, Date.now() - 5000);
    expect(isIdle(120000, testCacheFile)).toBe(false);
  });
});

describe('isIdleFromData', () => {
  it('idle when large gap and low api ratio', () => {
    // 60s session, 10s API time, 5s threshold → idle
    expect(isIdleFromData(60000, 10000, 5000)).toBe(true);
  });
  it('not idle when api ratio is high', () => {
    // 60s session, 40s API time → ratio 0.67 > 0.5 → not idle
    expect(isIdleFromData(60000, 40000, 5000)).toBe(false);
  });
  it('not idle when gap is below threshold', () => {
    // 10s session, 8s API time → 2s gap < 5s threshold
    expect(isIdleFromData(10000, 8000, 5000)).toBe(false);
  });
  it('not idle when duration is zero', () => {
    expect(isIdleFromData(0, 0, 5000)).toBe(false);
  });
});
