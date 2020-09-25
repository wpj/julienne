import type { Readable } from 'stream';

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
