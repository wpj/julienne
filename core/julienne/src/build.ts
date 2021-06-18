import { EntryAssets } from './types';
import { makePublicEntryAssets } from './utils';

type TemplateAssets = EntryAssets;

/**
 * Provides an interface for consumers to query information about a build
 * result.
 */
export class ClientBuild {
  templateAssets: TemplateAssets;

  constructor({
    base,
    entryAssets,
  }: {
    base: string;
    entryAssets: EntryAssets;
  }) {
    this.templateAssets = makePublicEntryAssets(entryAssets, base);
  }
}

export class ServerBuild {
  entryAssets: EntryAssets;

  constructor({ entryAssets }: { entryAssets: EntryAssets }) {
    this.entryAssets = entryAssets;
  }
}

export class Build {
  client: ClientBuild;
  server: ServerBuild;

  constructor({
    client,
    server,
  }: {
    client: ClientBuild;
    server: ServerBuild;
  }) {
    this.client = client;
    this.server = server;
  }
}
