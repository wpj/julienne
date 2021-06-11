export default (api) => {
  api.cache(true);
  return {
    plugins: [
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-object-rest-spread',
    ],
    presets: [
      '@babel/preset-typescript',
      ['@babel/preset-env', { targets: { node: 'current' } }],
    ],
  };
};
