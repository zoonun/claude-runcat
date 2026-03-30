---
name: configure
description: "Change claude-runcat settings (mode, character, thresholds)"
---

## claude-runcat: Configure

Help the user change claude-runcat settings. Read ~/.claude-runcat/config.json, show current values, and ask what to change:

- **locale**: en / ko / ja / zh / auto
- **displayMode**: compact / normal / detailed
- **character**: cat (or custom characters)
- **thresholds.heavyContext**: Context % for "heavy" state (default: 70)
- **thresholds.crushedContext**: Context % for "crushed" state (default: 90)
- **thresholds.expensiveBurnRate**: $/min for "expensive" (default: 0.10)
- **thresholds.rateLimitWarning**: Rate limit % for warning (default: 80)
- **animation.enabled**: true / false

After changes, update ~/.claude-runcat/config.json. Changes take effect on next statusline refresh.
