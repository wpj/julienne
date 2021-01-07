import { join as pathJoin } from 'path';
import { EntryAssets } from './types';
import { makePublicEntryAssets } from './utils';

export type CompilationWarnings = string[];

type TemplateAssets = EntryAssets;

/**
 * Provides an interface for consumers to query information about a compilation
 * result.
 */
export class ClientCompilation {
  hash: string;
  templateAssets: TemplateAssets;
  warnings: CompilationWarnings | null;

  constructor({
    entryAssets,
    hash,
    publicPath,
    warnings,
  }: {
    entryAssets: EntryAssets;
    hash: string;
    publicPath: string;
    warnings: CompilationWarnings | null;
  }) {
    this.hash = hash;
    this.templateAssets = makePublicEntryAssets(entryAssets, publicPath);
    this.warnings = warnings;
  }
}

export class ServerCompilation {
  asset: string;
  hash: string;
  warnings: CompilationWarnings | null;

  constructor({
    entryAssets,
    hash,
    outputPath,
    warnings,
  }: {
    entryAssets: EntryAssets;
    hash: string;
    outputPath: string;
    warnings: CompilationWarnings | null;
  }) {
    // In the server compilation, only one asset is generated.
    this.asset = pathJoin(outputPath, entryAssets.server[0]);
    this.hash = hash;
    this.warnings = warnings;
  }
}

export class Compilation {
  client: ClientCompilation;
  server: ServerCompilation;

  constructor({
    client,
    server,
  }: {
    client: ClientCompilation;
    server: ServerCompilation;
  }) {
    this.client = client;
    this.server = server;
  }
}
