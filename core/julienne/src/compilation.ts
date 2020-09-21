import { join as pathJoin } from 'path';

import type { TemplateConfig } from './types';

export type CompilationWarnings = string[];

interface NamedChunkAssets {
  [chunkName: string]: string | string[];
}

function normalizeAssets(assets: string | string[], publicPath: string) {
  return (Array.isArray(assets) ? assets : [assets]).map((assetPath) =>
    pathJoin(publicPath, assetPath),
  );
}

/**
 * Provides an interface for consumers to query information about a compilation
 * result.
 */
export class ClientCompilation<Templates extends TemplateConfig> {
  templateAssets: Record<keyof Templates, string[]>;
  warnings: CompilationWarnings | null;

  constructor({
    chunkAssets,
    publicPath,
    templates,
    warnings,
  }: {
    chunkAssets: NamedChunkAssets;
    publicPath: string;
    templates: Templates;
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

export class Compilation<Templates extends TemplateConfig> {
  client: ClientCompilation<Templates>;
  server: ServerCompilation | null;

  constructor({
    client,
    server,
  }: {
    client: ClientCompilation<Templates>;
    server: ServerCompilation | null;
  }) {
    this.client = client;
    this.server = server;
  }
}
