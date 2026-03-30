export interface StdinData {
  model: {
    id: string;
    display_name: string;
  };
  context_window: {
    total_input_tokens: number;
    total_output_tokens: number;
    context_window_size: number;
    used_percentage: number;
    remaining_percentage: number;
    current_usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    } | null;
  };
  cost: {
    total_cost_usd: number;
    total_duration_ms: number;
    total_api_duration_ms: number;
    total_lines_added: number;
    total_lines_removed: number;
  };
  rate_limits: {
    five_hour: { used_percentage: number; resets_at: string };
    seven_day: { used_percentage: number; resets_at: string };
  };
  workspace: {
    current_dir: string;
    project_dir: string;
  };
  worktree?: {
    branch: string;
    original_cwd: string;
    original_branch: string;
  };
}

export type Phase = 'rateLimited' | 'crushed' | 'expensive' | 'heavy' | 'running' | 'idle';

export type Alert = 'contextWarning' | 'contextCritical' | 'costSpike' | 'rateLimitApproaching';

export interface SessionState {
  phase: Phase;
  intensity: number;
  alerts: Alert[];
}

export type Locale = 'en' | 'ko' | 'ja' | 'zh';

export type DisplayMode = 'compact' | 'normal' | 'detailed';

export interface Config {
  locale: Locale | 'auto';
  displayMode: DisplayMode;
  character: string;
  customCharactersDir: string;
  thresholds: {
    heavyContext: number;
    crushedContext: number;
    expensiveBurnRate: number;
    rateLimitWarning: number;
  };
  animation: {
    enabled: boolean;
    speedMultiplier: number;
    idleTimeoutMs: number;
  };
  theme: string;
  colors?: Partial<import('./themes/types.js').ThemeColors>;
  bars?: Partial<import('./themes/types.js').ThemeBars>;
  icons?: Partial<import('./themes/types.js').ThemeIcons>;
  lineLayout?: 'expanded' | 'compact';
  showSeparators?: boolean;
}
