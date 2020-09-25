import { promises as fs } from 'fs';
import { join as pathJoin } from 'path';
import { TemplateConfig } from './types';
import { writeFile } from './utils/file';

export type CompilationWarnings = string[];

interface NamedChunkAssets {
  [chunkName: string]: string | string[];
}

type TemplateAssets = { [name: string]: string[] };

function normalizeAssets(assets: string | string[], publicPath: string) {
  return (Array.isArray(assets) ? assets : [assets]).map((assetPath) =>
    pathJoin(publicPath, assetPath),
  );
}

/**
 * Provides an interface for consumers to query information about a compilation
 * result.
 */
export class ClientCompilation {
  templateAssets: TemplateAssets;
  warnings: CompilationWarnings | null;

  constructor({
    chunkAssets,
    publicPath,
    templates,
    warnings,
  }: {
    chunkAssets: NamedChunkAssets;
    publicPath: string;
    templates: TemplateConfig;
    warnings: CompilationWarnings | null;
  }) {
    let templateAssetsEntries = [];
    for (let templateName in templates) {
      let runtimeChunkAssets = chunkAssets.runtime ?? [];
      let vendorChunkAssets = chunkAssets.vendor ?? [];
      let templateChunkAssets = chunkAssets[templateName];

      templateAssetsEntries.push([
        templateName,
        [
          ...normalizeAssets(runtimeChunkAssets, publicPath),
          ...normalizeAssets(vendorChunkAssets, publicPath),
          ...normalizeAssets(templateChunkAssets, publicPath),
        ],
      ]);
    }
    this.templateAssets = Object.fromEntries(templateAssetsEntries);

    this.warnings = warnings;
  }
}

export class ServerCompilation {
  asset: string;
  warnings: CompilationWarnings | null;

  constructor({
    chunkAssets,
    outputPath,
    warnings,
  }: {
    chunkAssets: NamedChunkAssets;
    outputPath: string;
    warnings: CompilationWarnings | null;
  }) {
    // In the server compilation, only one asset is generated.
    this.asset = normalizeAssets(chunkAssets.server, outputPath)[0];
    this.warnings = warnings;
  }
}

export class Compilation {
  client: ClientCompilation;
  server: ServerCompilation | null;

  static async fromCache(path: string): Promise<Compilation | null> {
    try {
      let cachedCompilation = await fs.readFile(path, 'utf8');
      let { client, server } = JSON.parse(cachedCompilation);
      return new Compilation({ client, server });
    } catch (e) {
      return null;
    }
  }

  constructor({
    client,
    server,
  }: {
    client: ClientCompilation;
    server: ServerCompilation | null;
  }) {
    this.client = client;
    this.server = server;
  }

  write(path: string): Promise<void> {
    let { client, server } = this;
    return writeFile(path, {
      type: 'generated',
      data: JSON.stringify({ client, server }),
    });
  }
}
