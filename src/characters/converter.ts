const BRAILLE_OFFSET = 0x2800;
const DOT_MAP: number[][] = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];

export function pixelsToBraille(pixels: number[][]): string {
  const height = pixels.length;
  const width = pixels[0]?.length || 0;
  const paddedHeight = Math.ceil(height / 4) * 4;
  const paddedWidth = Math.ceil(width / 2) * 2;
  const rows: string[] = [];
  for (let cellRow = 0; cellRow < paddedHeight; cellRow += 4) {
    let line = '';
    for (let cellCol = 0; cellCol < paddedWidth; cellCol += 2) {
      let bits = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const y = cellRow + dy, x = cellCol + dx;
          if (y < height && x < width && pixels[y][x]) bits |= DOT_MAP[dy][dx];
        }
      }
      line += String.fromCodePoint(BRAILLE_OFFSET + bits);
    }
    rows.push(line);
  }
  return rows.join('\n');
}

export async function imageToBraille(imageBuffer: Buffer, threshold = 128): Promise<string> {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(imageBuffer).grayscale().raw().toBuffer({ resolveWithObject: true });
  const pixels: number[][] = [];
  for (let y = 0; y < info.height; y++) {
    const row: number[] = [];
    for (let x = 0; x < info.width; x++) row.push(data[y * info.width + x] < threshold ? 1 : 0);
    pixels.push(row);
  }
  return pixelsToBraille(pixels);
}
