import type { Readable } from 'stream';

export type FileResource = {
  type: 'file';
  from: string;
};

export type GeneratedResource = {
  type: 'generated';
  data: string | Buffer;
};

export type StreamResource = {
  type: 'stream';
  data: Readable;
};

/**
 * A resource destined to be written to the output directory.
 */
export type Resource = FileResource | GeneratedResource | StreamResource;
