function stripAnsi(str: string): string { return str.replace(/\x1b\[[0-9;]*m/g, ''); }

function isWideCodePoint(cp: number): boolean {
  if (cp >= 0x4E00 && cp <= 0x9FFF) return true;
  if (cp >= 0x3400 && cp <= 0x4DBF) return true;
  if (cp >= 0xAC00 && cp <= 0xD7AF) return true;
  if (cp >= 0xF900 && cp <= 0xFAFF) return true;
  if (cp >= 0xFF01 && cp <= 0xFF60) return true;
  if (cp >= 0x3000 && cp <= 0x30FF) return true;
  if (cp >= 0x1F300 && cp <= 0x1FAFF) return true;
  if (cp >= 0x2600 && cp <= 0x27BF) return true;
  if (cp >= 0x1F1E0 && cp <= 0x1F1FF) return true;
  return false;
}

export function textWidth(str: string): number {
  const clean = stripAnsi(str);
  let width = 0;
  for (const char of clean) { width += isWideCodePoint(char.codePointAt(0)!) ? 2 : 1; }
  return width;
}

export function padRight(str: string, targetWidth: number): string {
  const padding = targetWidth - textWidth(str);
  return padding <= 0 ? str : str + ' '.repeat(padding);
}
