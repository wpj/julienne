import { promises as fs } from 'fs';

import { Compilation } from '../src/compilation';

import { createTestCompilation } from './__fixtures__/compilation';

import { writeFile } from '../src/utils/file';

jest.mock('../src/utils/file');
jest.mock('fs');

describe('Compilation', () => {
  describe('write', () => {
    test('writes the compilation to the filesystem', async () => {
      let cachePath = './build.cache.json';

      let compilation = createTestCompilation({
        includeServerCompilation: true,
      });

      await compilation.write(cachePath);

      expect(writeFile).toHaveBeenCalledWith(cachePath, {
        type: 'generated',
        data: JSON.stringify(compilation),
      });
    });
  });

  describe('fromCache', () => {
    test('returns a compilation instance with cached manifest data is found', async () => {
      let cachedCompilationData = createTestCompilation({
        includeServerCompilation: true,
      });

      (fs.readFile as jest.Mock).mockReturnValueOnce(
        Promise.resolve(JSON.stringify(cachedCompilationData)),
      );

      let cachedCompilation = await Compilation.fromCache('./cache.json');

      expect(cachedCompilation).toEqual(cachedCompilationData);
    });

    test('returns null when no cached manifest data is found', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(undefined);

      let cachedCompilation = await Compilation.fromCache('./cache.json');

      expect(cachedCompilation).toBeNull();
    });
  });
});
