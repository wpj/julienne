import { createWriteStream, promises as fs } from 'fs';
import { ensureDir } from 'fs-extra';
import { dirname } from 'path';
import type { Resource } from '../resource';

/**
 * Writes a resource or page to the filesystem, creating directories as
 * necessary.
 */
export async function writeFile(
  resourcePath: string,
  resource: Resource | { type: 'page'; data: string },
): Promise<void> {
  let outputDir = dirname(resourcePath);

  await ensureDir(outputDir);

  if (resource.type === 'file') {
    return fs.copyFile(resource.from, resourcePath);
  } else if (resource.type === 'stream') {
    let { data } = resource;
    return new Promise((resolve, reject) => {
      let writeStream = createWriteStream(resourcePath);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);

      data.pipe(writeStream);
    });
  } else {
    return fs.writeFile(resourcePath, resource.data, 'utf8');
  }
}