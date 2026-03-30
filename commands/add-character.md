---
name: add-character
description: "Convert custom pixel art sprites to Braille character frames"
---

## claude-runcat: Add Custom Character

Help the user add a custom pixel art character:

1. **Ask for sprite folder path**: The folder should contain PNG files named by phase:
   - running-0.png, running-1.png, ... (required, at least 1)
   - idle-0.png, heavy-0.png, crushed-0.png, expensive-0.png, rateLimited-0.png (optional)
   Sprite size: 20x12px, PNG, transparent background, dark silhouette.

2. **Ask for character name**: A short identifier (e.g., "dino", "penguin")

3. **Run conversion**: Execute:
   ```bash
   npx claude-runcat convert <sprite-folder-path> --name <character-name> --output ~/.claude-runcat/characters/<name>.json
   ```

4. **Update config**: Set the new character as active in ~/.claude-runcat/config.json if the user wants.

5. Tell the user to restart Claude Code or wait for the next statusline refresh.
