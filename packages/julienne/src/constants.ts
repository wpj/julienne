export const requestContextKey = Symbol('request');

export const configDefaults = {
  base: '/',
  cwd: process.cwd(),
  viteConfig: {},
};

export const defaultViteLogLevel = 'silent' as const;
