import { createHash } from 'crypto';

export function hash(input: string | Buffer): string {
  return createHash('md5').update(input).digest('hex').slice(0, 10);
}
