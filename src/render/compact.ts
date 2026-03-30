import type { StdinData, SessionState } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import type { ResolvedTheme } from '../themes/types.js';
import { progressBar } from './progress-bar.js';
import { colorize, contextColor, trafficLight, resolveColor } from './colors.js';

export function renderCompact(data: StdinData, state: SessionState, frame: BrailleFrame, t: (key: string) => string, theme: ResolvedTheme): string[] {
  const pct = Math.round(data.context_window.used_percentage);
  const light = trafficLight(pct, state.phase === 'idle');
  const bar = progressBar(pct, 8, theme.bars.fill, theme.bars.empty);
  const barColored = colorize(bar, contextColor(pct, theme.colors.context, theme.colors.warning, theme.colors.critical));
  let cost = `$${data.cost.total_cost_usd.toFixed(2)}`;
  const model = colorize(`[${data.model.display_name}]`, resolveColor(theme.colors.model));
  const char = frame.lines[0] || '';
  let rateLimits = `5h:${Math.round(data.rate_limits.five_hour.used_percentage)}% 7d:${Math.round(data.rate_limits.seven_day.used_percentage)}%`;
  if (state.alerts.includes('rateLimitApproaching')) rateLimits += ' ⚠️';
  if (state.alerts.includes('costSpike')) cost += ' 💸';
  const sep = theme.icons.separator;
  return [`${char} ${model} ${light} ${barColored} ${pct}% ${sep} ${cost} ${sep} ${rateLimits}`];
}
