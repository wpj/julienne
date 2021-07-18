import { createWriteStream, promises as fs } from 'fs';
import { dirname } from 'path';
import type { File } from './types';

export async function writeFile(
  path: string,
  file: File | { type: 'page'; data: string },
): Promise<void> {
  let outputDir = dirname(path);

  await fs.mkdir(outputDir, { recursive: true });

  if (file.type === 'copy') {
    return fs.copyFile(file.from, path);
  } else if (file.type === 'stream') {
    let { data } = file;
    return new Promise((resolve, reject) => {
      let writeStream = createWriteStream(path);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);

      data.pipe(writeStream);
    });
  } else {
    return fs.writeFile(path, file.data, 'utf8');
  }
}
