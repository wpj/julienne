type Attributes = {};

export class Store {
  data: Map<string, Attributes>;

  constructor() {
    this.data = new Map();
  }

  addModule(modulePath: string) {
    this.data.set(modulePath, {});
  }
}
