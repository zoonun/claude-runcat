import type { StdinData, SessionState } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import type { ResolvedTheme } from '../themes/types.js';
import { progressBar } from './progress-bar.js';
import { colorize, contextColor, trafficLight, resolveColor } from './colors.js';
import { padRight, textWidth } from './text-width.js';
import * as path from 'node:path';

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}h${remainMin > 0 ? remainMin + 'm' : ''}`;
}

export function renderNormal(data: StdinData, state: SessionState, frame: BrailleFrame, t: (key: string) => string, theme: ResolvedTheme): string[] {
  const pct = Math.round(data.context_window.used_percentage);
  const light = trafficLight(pct, state.phase === 'idle');
  const barColored = colorize(progressBar(pct, 10, theme.bars.fill, theme.bars.empty), contextColor(pct, theme.colors.context, theme.colors.warning, theme.colors.critical));
  const cost = `$${data.cost.total_cost_usd.toFixed(2)}`;
  const model = colorize(`[${data.model.display_name}]`, resolveColor(theme.colors.model));
  let rateLimitStr = `5h:${Math.round(data.rate_limits.five_hour.used_percentage)}%`;
  if (state.alerts.includes('rateLimitApproaching')) rateLimitStr += ' ⚠️';
  const projectName = colorize(path.basename(data.workspace.project_dir || data.workspace.current_dir), resolveColor(theme.colors.project));
  const duration = formatDuration(data.cost.total_duration_ms);
  const burnRateVal = data.cost.total_duration_ms > 0 ? data.cost.total_cost_usd / (data.cost.total_duration_ms / 60000) : 0;
  const burnRate = `$${burnRateVal.toFixed(2)}/m`;
  const sep = theme.icons.separator;

  const line1 = `${model} ${light} ${barColored} ${pct}% ${sep} ${cost} ${sep} ${rateLimitStr}`;
  const line2 = `${projectName} ${sep} ${duration} ${sep} ${burnRate}`;

  const charLines = frame.lines;
  const effects = frame.effects || [];
  const charWidth = charLines.reduce((max, l) => Math.max(max, textWidth(l)), 0);
  const infoLines = [line1, line2];
  const outputLines: string[] = [];
  const maxLines = Math.max(charLines.length, infoLines.length);
  for (let i = 0; i < maxLines; i++) {
    const charPart = i < charLines.length ? padRight(charLines[i], charWidth) : ' '.repeat(charWidth);
    const effectPart = i < effects.length && effects[i] ? effects[i] : '';
    const infoPart = i < infoLines.length ? infoLines[i] : '';
    outputLines.push(`${charPart}${effectPart}  ${infoPart}`);
  }
  return outputLines;
}
