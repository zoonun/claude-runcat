import type { StdinData, SessionState } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import type { ResolvedTheme } from '../themes/types.js';
import { progressBar } from './progress-bar.js';
import { colorize, contextColor, trafficLight, resolveColor } from './colors.js';
import { padRight, textWidth } from './text-width.js';
import * as path from 'node:path';

function formatTokens(n: number): string { return n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`; }

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return `${min}m${sec > 0 ? sec + 's' : ''}`;
  const hr = Math.floor(min / 60);
  const remainMin = min % 60;
  return `${hr}h${remainMin > 0 ? remainMin + 'm' : ''}`;
}

export function renderDetailed(data: StdinData, state: SessionState, frame: BrailleFrame, t: (key: string) => string, theme: ResolvedTheme): string[] {
  const pct = Math.round(data.context_window.used_percentage);
  const light = trafficLight(pct, state.phase === 'idle');
  const barColored = colorize(progressBar(pct, 10, theme.bars.fill, theme.bars.empty), contextColor(pct, theme.colors.context, theme.colors.warning, theme.colors.critical));
  const cost = `$${data.cost.total_cost_usd.toFixed(2)}`;
  const model = colorize(`[${data.model.display_name}]`, resolveColor(theme.colors.model));
  const projectName = colorize(path.basename(data.workspace.project_dir || data.workspace.current_dir), resolveColor(theme.colors.project));
  const duration = formatDuration(data.cost.total_duration_ms);
  const burnRateVal = data.cost.total_duration_ms > 0 ? data.cost.total_cost_usd / (data.cost.total_duration_ms / 60000) : 0;
  const burnRate = `$${burnRateVal.toFixed(2)}/m`;
  const sep = theme.icons.separator;

  let depletionStr = '—';
  if (burnRateVal > 0) {
    const remainPct = data.context_window.remaining_percentage;
    const usedCostPerPct = data.cost.total_cost_usd / Math.max(pct, 1);
    depletionStr = `~${Math.round((usedCostPerPct * remainPct) / burnRateVal)}m`;
  }

  const cacheHitPct = data.context_window.current_usage
    ? Math.round((data.context_window.current_usage.cache_read_input_tokens / Math.max(data.context_window.current_usage.input_tokens, 1)) * 100) : 0;

  const infoLine1 = `${model} ${light} ${barColored} ${pct}% ${sep} ${cost}`;
  const infoLine2 = `${projectName} ${sep} ${duration}`;
  const infoLine3 = `${t('burnRate')}: ${burnRate} ${sep} ${t('depletion')}: ${depletionStr}`;

  const charLines = frame.lines;
  const effects = frame.effects || [];
  const charWidth = charLines.reduce((max, l) => Math.max(max, textWidth(l)), 0);
  const topInfoLines = [infoLine1, infoLine2, infoLine3];
  const topRows: string[] = [];
  const maxTop = Math.max(charLines.length, topInfoLines.length);
  for (let i = 0; i < maxTop; i++) {
    const charPart = i < charLines.length ? padRight(charLines[i], charWidth) : ' '.repeat(charWidth);
    const effectPart = i < effects.length && effects[i] ? effects[i] : '';
    const infoPart = i < topInfoLines.length ? topInfoLines[i] : '';
    topRows.push(`${charPart}${effectPart}  ${infoPart}`);
  }

  const fiveHr = `5h:${Math.round(data.rate_limits.five_hour.used_percentage)}%`;
  const sevenDay = `7d:${Math.round(data.rate_limits.seven_day.used_percentage)}%`;
  let row4 = `${fiveHr} ${progressBar(data.rate_limits.five_hour.used_percentage, 5, theme.bars.fill, theme.bars.empty)} ${sep} ${sevenDay} ${sep} Cache:${cacheHitPct}%`;
  if (state.alerts.includes('rateLimitApproaching')) row4 += ' ⚠️';

  const usage = data.context_window.current_usage;
  const row5 = `In:${usage ? formatTokens(usage.input_tokens) : '0'} Out:${usage ? formatTokens(usage.output_tokens) : '0'} Cache↺:${usage ? formatTokens(usage.cache_read_input_tokens) : '0'}`;
  const row6 = `+${data.cost.total_lines_added}/-${data.cost.total_lines_removed} lines`;

  return [...topRows.slice(0, 3), row4, row5, row6];
}
