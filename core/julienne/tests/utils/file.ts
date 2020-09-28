import type { Readable } from 'stream';
import { dirname, join as pathJoin } from 'path';
import { createWriteStream, promises as fs } from 'fs';
import { ensureDir } from 'fs-extra';

import { writeFile } from '../../src/utils/file';

jest.mock('fs');
jest.mock('fs-extra');

describe('writeFile', () => {
  test('writes generated files', async () => {
    let path = pathJoin(__dirname, 'test.txt');

    await writeFile(path, {
      type: 'generated',
      data: 'Test',
    });

    expect(ensureDir).toHaveBeenCalledWith(dirname(path));

    expect(fs.writeFile).toHaveBeenCalledWith(path, 'Test', 'utf8');
  });

  test('copies files', async () => {
    let from = pathJoin(__dirname, 'test.txt');
    let to = pathJoin(__dirname, 'out.txt');

    await writeFile(to, {
      type: 'copy',
      from,
    });

    expect(ensureDir).toHaveBeenCalledWith(dirname(to));

    expect(fs.copyFile).toHaveBeenCalledWith(from, to);
  });

  test('writes pages', async () => {
    let path = pathJoin(__dirname, 'test.html');

    let html = '<div>Some HTML</div>';

    await writeFile(path, {
      type: 'page',
      data: html,
    });

    expect(ensureDir).toHaveBeenCalledWith(dirname(path));

    expect(fs.writeFile).toHaveBeenCalledWith(path, html, 'utf8');
  });

  test('writes streams', async () => {
    // Fake stream that calls its `finish` handler immediately.
    let fakeStream = {
      on(evt: string, callback: () => void) {
        if (evt === 'finish') {
          callback();
        }
      },
    };
    (createWriteStream as jest.Mock).mockReturnValueOnce(fakeStream);

    let path = pathJoin(__dirname, 'test.html');

    let stream = ({ pipe: jest.fn() } as unknown) as Readable;

    await writeFile(path, {
      type: 'stream',
      data: stream,
    });

    expect(ensureDir).toHaveBeenCalledWith(dirname(path));

    expect(createWriteStream).toHaveBeenCalledWith(path);

    expect(stream.pipe).toHaveBeenCalledWith(fakeStream);
  });
});
