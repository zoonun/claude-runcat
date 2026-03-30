import type { Theme } from './types.js';
import { resolveColor, colorize } from '../render/colors.js';
import { progressBar } from '../render/progress-bar.js';

export function renderThemePreview(theme: Theme): string {
  const model = colorize(`[Opus]`, resolveColor(theme.colors.model));
  const project = colorize('my-project', resolveColor(theme.colors.project));
  const ctxBar = colorize(
    progressBar(45, 10, theme.bars.fill, theme.bars.empty),
    resolveColor(theme.colors.context),
  );
  const usageBar = colorize(
    progressBar(25, 10, theme.bars.fill, theme.bars.empty),
    resolveColor(theme.colors.usage),
  );
  const sep = theme.icons.separator;
  const label = (text: string) => colorize(text, resolveColor(theme.colors.label));

  const header = `── ${theme.displayName} ──`;
  const line1 = `${model} ${sep} ${project}`;
  const line2 = `${label('Context')} ${ctxBar} 45%`;
  const line3 = `${label('Usage')}   ${usageBar} 25%`;
  const line4 = `${theme.icons.running} Edit: file.ts ${sep} ${theme.icons.done} Read ×3`;
  const line5 = `${theme.icons.progress} Fix auth bug (2/5)`;

  return [header, line1, line2, line3, line4, line5].join('\n');
}
