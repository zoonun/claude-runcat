---
name: setup
description: "Initial setup wizard: select language, character, display mode, and register statusline"
---

## claude-runcat Setup

Help the user configure claude-runcat step by step:

1. **Language**: Ask the user to choose: en / ko / ja / zh / auto (detect from system)
2. **Character**: Ask the user to choose: 🐱 Cat (or custom characters if available)
   - Also mention they can add custom characters later with /claude-runcat:add-character
3. **Display Mode**: Ask the user to choose: compact (1 line) / normal (2 lines) / detailed (6 lines)
4. **Save config**: Write choices to ~/.claude-runcat/config.json
5. **Register statusline**: Add to ~/.claude/settings.json:
   ```json
   { "statusLine": { "type": "command", "command": "npx claude-runcat" } }
   ```
6. Tell the user to restart Claude Code to see the statusline.
