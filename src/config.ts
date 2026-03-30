import * as fs from "node:fs";
import type { Config } from "./types.js";

export const DEFAULT_CONFIG: Config = {
  locale: "auto",
  displayMode: "normal",
  character: "cat",
  customCharactersDir: "~/.claude-runcat/characters/",
  thresholds: {
    heavyContext: 70,
    crushedContext: 90,
    expensiveBurnRate: 0.1,
    rateLimitWarning: 80,
  },
  animation: { enabled: true, speedMultiplier: 15.0, idleTimeoutMs: 5000 },
  theme: "default",
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function mergeConfig(base: Config, override: any): Config {
  const merged = { ...base };
  if (override.locale) merged.locale = override.locale;
  if (override.displayMode) merged.displayMode = override.displayMode;
  if (override.character) merged.character = override.character;
  if (override.customCharactersDir)
    merged.customCharactersDir = override.customCharactersDir;
  if (override.thresholds) {
    merged.thresholds = { ...base.thresholds };
    if (typeof override.thresholds.heavyContext === "number")
      merged.thresholds.heavyContext = clamp(
        override.thresholds.heavyContext,
        0,
        100,
      );
    if (typeof override.thresholds.crushedContext === "number")
      merged.thresholds.crushedContext = clamp(
        override.thresholds.crushedContext,
        0,
        100,
      );
    if (typeof override.thresholds.expensiveBurnRate === "number")
      merged.thresholds.expensiveBurnRate = Math.max(
        0,
        override.thresholds.expensiveBurnRate,
      );
    if (typeof override.thresholds.rateLimitWarning === "number")
      merged.thresholds.rateLimitWarning = clamp(
        override.thresholds.rateLimitWarning,
        0,
        100,
      );
  }
  if (override.animation) {
    merged.animation = { ...base.animation, ...override.animation };
    if (typeof merged.animation.speedMultiplier === "number") {
      merged.animation.speedMultiplier = Math.max(
        0.1,
        merged.animation.speedMultiplier,
      );
    }
    if (typeof merged.animation.idleTimeoutMs === "number") {
      merged.animation.idleTimeoutMs = Math.max(
        1000,
        merged.animation.idleTimeoutMs,
      );
    }
  }
  if (override.theme) merged.theme = override.theme;
  if (override.colors) merged.colors = override.colors;
  if (override.bars) merged.bars = override.bars;
  if (override.icons) merged.icons = override.icons;
  if (override.lineLayout) merged.lineLayout = override.lineLayout;
  if (typeof override.showSeparators === "boolean")
    merged.showSeparators = override.showSeparators;
  return merged;
}

export function loadConfig(configPath: string, overrideData?: any): Config {
  let fileData: any = {};
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    fileData = JSON.parse(raw);
  } catch {}
  return mergeConfig(DEFAULT_CONFIG, { ...fileData, ...overrideData });
}
