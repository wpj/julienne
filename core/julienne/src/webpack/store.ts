type Attributes = undefined;

export class Store {
  data: Map<string, Attributes>;

  constructor() {
    this.data = new Map();
  }

  addModule(modulePath: string): void {
    this.data.set(modulePath, undefined);
  }
}
