import type { ColorValue } from '../themes/types.js';

const ESC = '\x1b[';
export const colors = {
  reset: `${ESC}0m`, bold: `${ESC}1m`, dim: `${ESC}2m`,
  red: `${ESC}31m`, green: `${ESC}32m`, yellow: `${ESC}33m`,
  blue: `${ESC}34m`, magenta: `${ESC}35m`, cyan: `${ESC}36m`,
  white: `${ESC}37m`, gray: `${ESC}90m`,
};

const NAMED_COLORS: Record<string, string> = {
  dim: colors.dim, red: colors.red, green: colors.green,
  yellow: colors.yellow, blue: colors.blue, magenta: colors.magenta,
  cyan: colors.cyan, white: colors.white, gray: colors.gray,
};

export function resolveColor(value: ColorValue): string {
  if (typeof value === 'number') return `${ESC}38;5;${value}m`;
  if (typeof value === 'string' && value.startsWith('#')) {
    const hex = value.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `${ESC}38;2;${r};${g};${b}m`;
  }
  return NAMED_COLORS[value as string] ?? colors.white;
}

export function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

export function contextColor(percentage: number, contextClr: ColorValue, warningClr: ColorValue, criticalClr: ColorValue): string {
  if (percentage >= 90) return resolveColor(criticalClr);
  if (percentage >= 70) return resolveColor(warningClr);
  return resolveColor(contextClr);
}

export function trafficLight(percentage: number, idle: boolean): string {
  if (idle) return '⚪';
  if (percentage >= 90) return '🔴';
  if (percentage >= 70) return '🟡';
  return '🟢';
}
