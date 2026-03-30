import type { StdinData, SessionState, Phase, Alert, Config } from './types.js';

export function determineState(data: StdinData, thresholds: Config['thresholds'], idle: boolean): SessionState {
  const alerts: Alert[] = [];
  const contextPct = data.context_window.used_percentage;
  const ratePct = data.rate_limits.five_hour.used_percentage;
  const durationMin = data.cost.total_duration_ms / 60000;
  const burnRate = durationMin > 0 ? data.cost.total_cost_usd / durationMin : 0;

  if (contextPct >= thresholds.crushedContext) alerts.push('contextCritical');
  else if (contextPct >= thresholds.heavyContext) alerts.push('contextWarning');
  if (burnRate > thresholds.expensiveBurnRate) alerts.push('costSpike');
  if (ratePct >= thresholds.rateLimitWarning) alerts.push('rateLimitApproaching');

  if (ratePct >= 95) return { phase: 'rateLimited', intensity: 1.0, alerts };
  if (contextPct >= thresholds.crushedContext) {
    return { phase: 'crushed', intensity: Math.min(0.9 + (contextPct - thresholds.crushedContext) / 100, 1.0), alerts };
  }
  if (burnRate > thresholds.expensiveBurnRate) {
    return { phase: 'expensive', intensity: Math.min(burnRate / (thresholds.expensiveBurnRate * 5), 1.0), alerts };
  }
  if (contextPct >= thresholds.heavyContext) {
    return { phase: 'heavy', intensity: Math.min((contextPct - thresholds.heavyContext) / (thresholds.crushedContext - thresholds.heavyContext), 1.0), alerts };
  }
  if (idle) return { phase: 'idle', intensity: 0, alerts };
  return { phase: 'running', intensity: Math.min(contextPct / thresholds.heavyContext, 1.0), alerts };
}
