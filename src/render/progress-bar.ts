export function progressBar(percentage: number, width: number, fill = '█', empty = '░'): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * width);
  return fill.repeat(filled) + empty.repeat(width - filled);
}
