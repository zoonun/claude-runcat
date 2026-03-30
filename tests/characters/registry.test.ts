import { describe, it, expect } from 'vitest';
import { getCharacter, listCharacters } from '../../src/characters/registry.js';

describe('character registry', () => {
  it('lists builtin characters', () => { expect(listCharacters()).toContain('cat'); });
  it('cat has all phases', () => {
    const cat = getCharacter('cat');
    expect(cat).not.toBeNull();
    expect(cat!.name).toBe('cat');
    expect(cat!.frames.running.length).toBeGreaterThan(0);
    expect(cat!.frames.idle.length).toBeGreaterThan(0);
    expect(cat!.frames.heavy.length).toBeGreaterThan(0);
    expect(cat!.frames.crushed.length).toBeGreaterThan(0);
    expect(cat!.frames.expensive.length).toBeGreaterThan(0);
    expect(cat!.frames.rateLimited.length).toBeGreaterThan(0);
  });
  it('cat compact frames', () => { expect(getCharacter('cat')!.compactFrames.running.length).toBeGreaterThan(0); });
  it('null for unknown', () => { expect(getCharacter('nonexistent')).toBeNull(); });
  it('cat display names', () => {
    const cat = getCharacter('cat');
    expect(cat!.displayName.en).toBe('Cat');
    expect(cat!.displayName.ko).toBe('고양이');
    expect(cat!.displayName.ja).toBe('猫');
    expect(cat!.displayName.zh).toBe('猫');
  });
});
