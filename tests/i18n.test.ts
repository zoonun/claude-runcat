import { describe, it, expect, vi } from 'vitest';
import { detectLocale, createTranslator } from '../src/i18n/index.js';

describe('detectLocale', () => {
  it('returns config locale when not auto', () => { expect(detectLocale('ko')).toBe('ko'); });
  it('detects from LANG env variable', () => { vi.stubEnv('LANG', 'ja_JP.UTF-8'); expect(detectLocale('auto')).toBe('ja'); vi.unstubAllEnvs(); });
  it('defaults to en for unknown locale', () => { vi.stubEnv('LANG', 'fr_FR.UTF-8'); expect(detectLocale('auto')).toBe('en'); vi.unstubAllEnvs(); });
  it('defaults to en when LANG is unset', () => { vi.stubEnv('LANG', ''); expect(detectLocale('auto')).toBe('en'); vi.unstubAllEnvs(); });
});

describe('createTranslator', () => {
  it('translates labels in English', () => { const t = createTranslator('en'); expect(t('context')).toBe('Context'); expect(t('idle')).toBe('Idle'); });
  it('translates labels in Korean', () => { const t = createTranslator('ko'); expect(t('context')).toBe('컨텍스트'); expect(t('idle')).toBe('대기 중'); });
  it('falls back to key for missing keys', () => { const t = createTranslator('ko'); expect(t('nonexistentKey')).toBe('nonexistentKey'); });
});
