# e2e tests: julienne

This package contains e2e tests against the core julienne package.

## Notes

Jest's `--forceExit` flag is being used due to an unclosed chokidar watcher
being used in Snowpack's dev server. Once that watcher is closed, `--forceExit`
can be removed.
