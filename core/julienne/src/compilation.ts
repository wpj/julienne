import { join as pathJoin } from 'path';
import { TemplateConfig } from './types';

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
  hash: string;
  templateAssets: TemplateAssets;
  warnings: CompilationWarnings | null;

  constructor({
    chunkAssets,
    hash,
    publicPath,
    templates,
    warnings,
  }: {
    chunkAssets: NamedChunkAssets;
    hash: string;
    publicPath: string;
    templates: TemplateConfig;
    warnings: CompilationWarnings | null;
  }) {
    this.hash = hash;

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
  hash: string;
  warnings: CompilationWarnings | null;

  constructor({
    chunkAssets,
    hash,
    outputPath,
    warnings,
  }: {
    chunkAssets: NamedChunkAssets;
    hash: string;
    outputPath: string;
    warnings: CompilationWarnings | null;
  }) {
    // In the server compilation, only one asset is generated.
    this.asset = normalizeAssets(chunkAssets.server, outputPath)[0];
    this.hash = hash;
    this.warnings = warnings;
  }
}

export class Compilation {
  client: ClientCompilation;
  server: ServerCompilation | null;

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
}
