type FlagFunc = (source: string) => boolean;

export type Flag = string | RegExp | Array<string | RegExp> | FlagFunc;

export function isFlagged(source: string, flag: Flag) {
  if (typeof flag === 'string') {
    return source.includes(flag);
  } else if (flag instanceof RegExp) {
    return flag.test(source);
  } else if (Array.isArray(flag)) {
    return flag.some((f) => {
      if (f instanceof RegExp) {
        return f.test(source);
      } else {
        return source.includes(f);
      }
    });
  } else {
    return flag(source);
  }
}
