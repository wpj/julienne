export function createSnowpackConfig() {
  return {
    plugins: [require.resolve('@snowpack/plugin-react-refresh')],
  };
}
