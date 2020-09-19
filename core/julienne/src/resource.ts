import { createWriteStream, promises as fs } from 'fs';
import { Readable } from 'stream';

/**
 * A resource destined to be written to the output directory.
 */
export type Resource =
  | {
      type: 'file';
      from: string;
    }
  | {
      type: 'stream';
      data: Readable;
    }
  | {
      type: 'generated';
      data: string | Buffer;
    };

export function writeResource(resourcePath: string, resource: Resource) {
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
