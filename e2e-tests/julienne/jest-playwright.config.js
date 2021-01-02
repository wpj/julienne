let headless = !('DEBUG_PLAYWRIGHT' in process.env);

module.exports = {
  launchOptions: {
    headless,
  },
};
