/** @param {string} from */
export function createResolve(from) {
  /** @param {string} url */
  return function resolve(url) {
    return new URL(url, from).pathname;
  };
}
